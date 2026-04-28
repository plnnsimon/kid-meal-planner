import { createClient } from 'npm:@supabase/supabase-js@2'
import Anthropic from 'npm:@anthropic-ai/sdk'
import { buildSystemPrompt } from './systemPrompt.ts'
import { toolDefinitions, createToolExecutor } from './tools.ts'
import { runWithGemini } from './gemini.ts'
import { runWithGroq } from './groq.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

async function runWithClaude(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemPrompt: string,
  // deno-lint-ignore no-explicit-any
  executeTool: (name: string, input: Record<string, any>) => Promise<unknown>,
  apiKey: string,
): Promise<string> {
  const anthropic = new Anthropic({ apiKey })

  type AnthropicMessage = {
    role: 'user' | 'assistant'
    // deno-lint-ignore no-explicit-any
    content: string | any[]
  }

  const claudeMessages: AnthropicMessage[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }))

  let response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: systemPrompt,
    // deno-lint-ignore no-explicit-any
    tools: toolDefinitions as any,
    messages: claudeMessages,
  })

  while (response.stop_reason === 'tool_use') {
    const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use')

    // deno-lint-ignore no-explicit-any
    const toolResults: any[] = []
    for (const block of toolUseBlocks) {
      if (block.type !== 'tool_use') continue
      let result: unknown
      try {
        // deno-lint-ignore no-explicit-any
        result = await executeTool(block.name, (block.input as Record<string, any>) ?? {})
      } catch (err) {
        result = { error: (err as Error).message }
      }
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(result),
      })
    }

    claudeMessages.push({ role: 'assistant', content: response.content })
    claudeMessages.push({ role: 'user', content: toolResults })

    response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: systemPrompt,
      // deno-lint-ignore no-explicit-any
      tools: toolDefinitions as any,
      messages: claudeMessages,
    })
  }

  return response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('\n')
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: CORS_HEADERS })
  }

  try {
    // Parse request body
    const { messages, userId, weekPlanId } = await req.json() as {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>
      userId: string
      weekPlanId: string
    }

    if (!userId || !weekPlanId) {
      return new Response(
        JSON.stringify({ error: 'userId and weekPlanId are required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    // Create Supabase client scoped to the user's JWT (respects RLS)
    const authHeader = req.headers.get('Authorization') ?? ''
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    // Load child profile server-side
    const { data: childRow } = await supabase
      .from('child_profiles')
      .select('name, birth_date, allergies, dietary_restrictions')
      .eq('user_id', userId)
      .maybeSingle()

    // Load week plan + current slots server-side
    const { data: weekPlanRow } = await supabase
      .from('week_plans')
      .select('id, week_start_date')
      .eq('id', weekPlanId)
      .maybeSingle()

    const { data: slotsRows } = await supabase
      .from('meal_slots')
      .select('day_of_week, meal_type, recipe_id, servings, recipe:recipes(name)')
      .eq('week_plan_id', weekPlanId)

    const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    // deno-lint-ignore no-explicit-any
    const currentSlots = (slotsRows ?? []).map((s: any) => ({
      day: DAY_NAMES[s.day_of_week] ?? `Day ${s.day_of_week}`,
      day_of_week: s.day_of_week,
      meal_type: s.meal_type,
      recipe_name: s.recipe?.name ?? null,
      recipe_id: s.recipe_id,
    }))

    const today = new Date().toISOString().split('T')[0]
    const systemPrompt = buildSystemPrompt(childRow, weekPlanRow, today, currentSlots)

    // Create tool executor bound to this user's Supabase client
    const executeTool = createToolExecutor(supabase, userId, weekPlanId)

    // Provider selection
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    const googleKey = Deno.env.get('GOOGLE_AI_API_KEY')
    const groqKey = Deno.env.get('GROQ_API_KEY')

    if (!anthropicKey && !googleKey && !groqKey) {
      return new Response(
        JSON.stringify({ error: 'No LLM API key configured. Set ANTHROPIC_API_KEY, GOOGLE_AI_API_KEY, or GROQ_API_KEY.' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    const finalText = groqKey
      ? await runWithGroq(messages, systemPrompt, toolDefinitions, executeTool, groqKey)
      : anthropicKey
        ? await runWithClaude(messages, systemPrompt, executeTool, anthropicKey)
        : await runWithGemini(messages, systemPrompt, toolDefinitions, executeTool, googleKey!)

    return new Response(
      JSON.stringify({ message: finalText }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('ai-planner error:', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? 'Internal server error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  }
})
