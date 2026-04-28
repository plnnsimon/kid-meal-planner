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
    const response = await groq.chat.completions.create({
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
