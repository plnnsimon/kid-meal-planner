import { GoogleGenerativeAI } from 'npm:@google/generative-ai'
import { toolDefinitions } from './tools.ts'

// deno-lint-ignore no-explicit-any
type GeminiContent = { role: string; parts: any[] }

// Models tried in order on 503/overload errors
const MODEL_FALLBACK_CHAIN = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite']

function toGeminiTools(anthropicTools: typeof toolDefinitions) {
  return [{
    functionDeclarations: anthropicTools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    })),
  }]
}

function isRetryableError(err: unknown): boolean {
  const msg = (err as Error)?.message ?? ''
  return msg.includes('503') || msg.includes('429') || msg.includes('overloaded') ||
    msg.includes('high demand') || msg.includes('Service Unavailable') ||
    msg.includes('quota') || msg.includes('Too Many Requests')
}

/** Parse Google's suggested retry delay from the error message, capped at 12s. */
function parseRetryDelay(err: unknown): number {
  const msg = (err as Error)?.message ?? ''
  const match = msg.match(/Please retry in (\d+(?:\.\d+)?)s/)
  if (match) return Math.min(Math.ceil(parseFloat(match[1])), 12) * 1000
  return 2000
}

async function generateWithFallback(
  genAI: GoogleGenerativeAI,
  systemPrompt: string,
  // deno-lint-ignore no-explicit-any
  toolDefs: any[],
  contents: GeminiContent[],
  modelIndex = 0,
  retried = false,
  // deno-lint-ignore no-explicit-any
): Promise<any> {
  if (modelIndex >= MODEL_FALLBACK_CHAIN.length) {
    throw new Error('All Gemini models are currently rate-limited. Please wait a minute and try again.')
  }

  const modelName = MODEL_FALLBACK_CHAIN[modelIndex]
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: systemPrompt,
    tools: toGeminiTools(toolDefs),
  })

  try {
    return { model, result: await model.generateContent({ contents }) }
  } catch (err) {
    if (!isRetryableError(err)) throw err

    if (!retried) {
      // First failure: wait the suggested delay and retry same model
      const delay = parseRetryDelay(err)
      console.warn(`[gemini] ${modelName} rate-limited, retrying in ${delay}ms`)
      await new Promise((r) => setTimeout(r, delay))
      return generateWithFallback(genAI, systemPrompt, toolDefs, contents, modelIndex, true)
    }

    // Second failure on same model: move to next
    console.warn(`[gemini] ${modelName} still rate-limited, falling back to ${MODEL_FALLBACK_CHAIN[modelIndex + 1] ?? 'none'}`)
    return generateWithFallback(genAI, systemPrompt, toolDefs, contents, modelIndex + 1, false)
  }
}

export async function runWithGemini(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemPrompt: string,
  // deno-lint-ignore no-explicit-any
  toolDefs: any[],
  // deno-lint-ignore no-explicit-any
  executeTool: (name: string, input: Record<string, any>) => Promise<unknown>,
  apiKey: string,
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey)

  const contents: GeminiContent[] = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  // Initial call — picks model with fallback on overload
  let { model, result } = await generateWithFallback(genAI, systemPrompt, toolDefs, contents)

  while (true) {
    const candidate = result.response.candidates?.[0]
    if (!candidate) break

    // deno-lint-ignore no-explicit-any
    const parts = candidate.content?.parts ?? []
    // deno-lint-ignore no-explicit-any
    const functionCallParts = parts.filter((p: any) => p.functionCall)
    if (functionCallParts.length === 0) break

    contents.push({ role: 'model', parts })

    // deno-lint-ignore no-explicit-any
    const toolResponseParts: any[] = []
    for (const part of functionCallParts) {
      // deno-lint-ignore no-explicit-any
      const { name, args } = (part as any).functionCall
      let response: unknown
      try {
        response = await executeTool(name, args ?? {})
      } catch (err) {
        response = { error: (err as Error).message }
      }
      toolResponseParts.push({
        functionResponse: { name, response: { output: JSON.stringify(response) } },
      })
    }

    contents.push({ role: 'user', parts: toolResponseParts })

    // Continue tool loop — retry with fallback on rate limit
    try {
      result = await model.generateContent({ contents })
    } catch (err) {
      if (isRetryableError(err)) {
        const fallback = await generateWithFallback(genAI, systemPrompt, toolDefs, contents, 1)
        model = fallback.model
        result = fallback.result
      } else {
        throw err
      }
    }
  }

  // deno-lint-ignore no-explicit-any
  const finalParts = result.response.candidates?.[0]?.content?.parts ?? []
  return (finalParts as any[])
    .filter((p: any) => p.text)
    .map((p: any) => p.text as string)
    .join('')
}
