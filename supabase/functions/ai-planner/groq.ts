import Groq from 'npm:groq-sdk'
import { toolDefinitions } from './tools.ts'

// Convert Anthropic tool format → OpenAI/Groq format
function toGroqTools(anthropicTools: typeof toolDefinitions) {
  return anthropicTools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }))
}

type GroqMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: Groq.Chat.ChatCompletionMessageToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string }

// deno-lint-ignore no-explicit-any
function getErrorCode(err: unknown): string | undefined {
  return (err as any)?.error?.error?.code ?? (err as any)?.error?.code
}

function isRetryable(err: unknown): boolean {
  const status = (err as { status?: number })?.status
  const code = getErrorCode(err)
  // transient infra errors
  if (status === 500 || status === 429 || status === 503) return true
  // model generated malformed tool call — worth retrying, usually self-corrects
  if (status === 400 && code === 'tool_use_failed') return true
  return false
}

async function groqCreate(
  groq: Groq,
  // deno-lint-ignore no-explicit-any
  params: Parameters<typeof groq.chat.completions.create>[0],
  retries = 3,
  delayMs = 1000,
): Promise<Groq.Chat.ChatCompletion> {
  try {
    return await groq.chat.completions.create(params) as Groq.Chat.ChatCompletion
  } catch (err) {
    if (retries > 0 && isRetryable(err)) {
      const status = (err as { status?: number })?.status
      const code = getErrorCode(err)
      console.warn(`[groq] retrying after ${delayMs}ms (status=${status}, code=${code}, retries left=${retries})`)
      await new Promise((r) => setTimeout(r, delayMs))
      // For tool_use_failed, don't back off as aggressively — it's a model output issue
      const nextDelay = code === 'tool_use_failed' ? delayMs : delayMs * 2
      return groqCreate(groq, params, retries - 1, nextDelay)
    }
    throw err
  }
}

export async function runWithGroq(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemPrompt: string,
  // deno-lint-ignore no-explicit-any
  toolDefs: any[],
  // deno-lint-ignore no-explicit-any
  executeTool: (name: string, input: Record<string, any>) => Promise<unknown>,
  apiKey: string,
): Promise<string> {
  const groq = new Groq({ apiKey })

  const groqMessages: GroqMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content } as GroqMessage)),
  ]

  // Tool loop
  while (true) {
    const response = await groqCreate(groq, {
      model: 'llama-3.3-70b-versatile',
      messages: groqMessages,
      tools: toGroqTools(toolDefs),
      tool_choice: 'auto',
      max_tokens: 4096,
    })

    const msg = response.choices[0].message
    groqMessages.push({
      role: 'assistant',
      content: msg.content ?? null,
      tool_calls: msg.tool_calls,
    })

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return msg.content ?? ''
    }

    // Execute all tool calls
    for (const toolCall of msg.tool_calls) {
      let result: unknown
      try {
        const args = JSON.parse(toolCall.function.arguments ?? '{}')
        result = await executeTool(toolCall.function.name, args)
      } catch (err) {
        result = { error: (err as Error).message }
      }
      groqMessages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      })
    }
  }
}
