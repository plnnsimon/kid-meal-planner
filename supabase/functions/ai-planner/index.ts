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

const BASIC_MONTHLY_LIMIT = 10

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
    const {
      messages: rawMessages,
      userId,
      weekPlanId,
      mode = 'chat',
      dayOfWeek,
      mealType,
    } = await req.json() as {
      messages?: Array<{ role: 'user' | 'assistant'; content: string }>
      userId: string
      weekPlanId: string
      mode?: 'chat' | 'quick_week' | 'quick_day' | 'quick_recipe'
      dayOfWeek?: number
      mealType?: string
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

    // Service role client — bypasses RLS for usage tracking
    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Subscription gate
    const { data: profileRow } = await serviceSupabase
      .from('profiles')
      .select('subscription_tier, tier_expires_at')
      .eq('id', userId)
      .maybeSingle()

    const now = new Date()
    const isPro =
      profileRow?.subscription_tier === 'pro' &&
      (profileRow?.tier_expires_at == null || new Date(profileRow.tier_expires_at) > now)

    // quick_week is Pro-only
    if (mode === 'quick_week' && !isPro) {
      return new Response(
        JSON.stringify({ error: 'pro_required' }),
        { status: 402, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    let periodStart = ''
    let used = 0

    if (!isPro) {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0]

      // Upsert row for this month (insert if missing, do nothing if exists)
      await serviceSupabase
        .from('ai_usage')
        .upsert(
          { user_id: userId, period_start: periodStart, generation_count: 0 },
          { onConflict: 'user_id,period_start', ignoreDuplicates: true },
        )

      // Read current count
      const { data: usageRow } = await serviceSupabase
        .from('ai_usage')
        .select('generation_count')
        .eq('user_id', userId)
        .eq('period_start', periodStart)
        .single()

      used = usageRow?.generation_count ?? 0

      if (used >= BASIC_MONTHLY_LIMIT) {
        return new Response(
          JSON.stringify({ error: 'limit_reached', used, limit: BASIC_MONTHLY_LIMIT }),
          { status: 402, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
        )
      }

      // Increment before calling LLM
      await serviceSupabase
        .from('ai_usage')
        .update({ generation_count: used + 1 })
        .eq('user_id', userId)
        .eq('period_start', periodStart)
    }

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

    // Build messages array — quick modes auto-generate the prompt
    const dayName = DAY_NAMES[dayOfWeek ?? 0] ?? 'Monday'
    let messages: Array<{ role: 'user' | 'assistant'; content: string }>
    if (mode === 'quick_week') {
      messages = [{ role: 'user', content: 'Plan this week. Fill all empty meal slots for all 7 days.' }]
    } else if (mode === 'quick_day') {
      messages = [{ role: 'user', content: `Plan all meals for ${dayName}. Fill empty breakfast, lunch, dinner, snack slots.` }]
    } else if (mode === 'quick_recipe') {
      messages = [{ role: 'user', content: `Generate a recipe for ${mealType ?? 'lunch'} on ${dayName} and add it to the plan.` }]
    } else {
      // chat mode — use messages from request
      messages = rawMessages ?? []
    }

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

    let finalText: string
    try {
      finalText = groqKey
        ? await runWithGroq(messages, systemPrompt, toolDefinitions, executeTool, groqKey)
        : anthropicKey
          ? await runWithClaude(messages, systemPrompt, executeTool, anthropicKey)
          : await runWithGemini(messages, systemPrompt, toolDefinitions, executeTool, googleKey!)
    } catch (llmErr) {
      if (!isPro) {
        await serviceSupabase
          .from('ai_usage')
          .update({ generation_count: used })
          .eq('user_id', userId)
          .eq('period_start', periodStart)
      }
      throw llmErr
    }

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
