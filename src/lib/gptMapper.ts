// src/lib/gptMapper.ts
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateText } from 'ai'

export type Question = {
  id: string
  text: string
  choices?: { id: string; text: string }[]
}

export type MappedAnswer = {
  question_id: string
  choice_id: string | null
  value: string
}

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
})

/** 1) Master opener question covering everything **/
export async function generateInitialQuestion(
  questions: Question[]
): Promise<string> {
  const list = questions.map((q, i) => `${i + 1}. ${q.text}`).join('\n')
  const prompt = `
You are a friendly survey assistant. I need these items:
${list}

Write ONE clear, conversational question that lets me infer all of the above in one response.
Output only that question.
`.trim()

  const { text } = await generateText({
    model: openrouter.chat('openai/gpt-3.5-turbo'),
    prompt,
    temperature: 0.7,
    maxTokens: 200,
  })
  if (!text) throw new Error('Initial question generation failed')
  return text.trim()
}

/** 2) Map free‑form input into a strict JSON array **/
export async function mapAnswersWithAI(
  rawInput: string,
  questions: Question[]
): Promise<MappedAnswer[]> {
  // Build a numbered list of the real IDs + texts
  const idMap = questions.reduce((acc, q, i) => {
    acc[`${i + 1}`] = q.id
    return acc
  }, {} as Record<string, string>)

  const list = questions.map((q, i) => `${i + 1}. ${q.text}`).join('\n')

  // Strong system prompt: only use the provided IDs
  const systemPrompt = `
You are a JSON factory. 𝗨𝗦𝗘 𝗢𝗡𝗟𝗬 the following question IDs:
${questions.map((q) => q.id).join(', ')}

You must OUTPUT EXACTLY a JSON array of objects with keys:
  • question_id  (must be one of the IDs above)
  • choice_id    (string or null)
  • value        (string)

Do NOT include any other fields, text, or examples.
`

  const userPrompt = `
Here are the survey items I need to map:
${list}

User answered:
"""${rawInput}"""

Return only the JSON array now:
`

  // Call as a two‑message chat
  const { text: raw } = await generateText({
    model: openrouter.chat('openai/gpt-3.5-turbo'),
    messages: [
      { role: 'system', content: systemPrompt.trim() },
      { role: 'user',   content: userPrompt.trim()   },
    ],
    temperature: 0,
    maxTokens: 512,
  })

  // Extract the first [...] block
  const match = raw.match(/\[[\s\S]*?\]/)
  if (!match) {
    console.error('RAW AI OUTPUT (no array):', raw)
    throw new Error('Invalid AI format: no JSON array found')
  }
  const jsonText = match[0]

  // Parse + validate
  let parsed
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    console.error('FAILED JSON PARSE:', jsonText)
    throw new Error('Invalid AI format: JSON parse error')
  }

  if (
    !Array.isArray(parsed) ||
    !parsed.every(
      (o) =>
        typeof o.question_id === 'string' &&
        Object.values(idMap).includes(o.question_id) &&
        ('choice_id' in o) &&
        (typeof o.choice_id === 'string' || o.choice_id === null) &&
        typeof o.value === 'string'
    )
  ) {
    console.error('UNEXPECTED JSON STRUCTURE:', parsed)
    throw new Error('Invalid AI format: unexpected structure')
  }

  // Finally, return it
  return parsed as MappedAnswer[]
}

/** 3) Follow‑up covering up to 3 items at once **/
export async function generateFollowupQuestion(
  answered: MappedAnswer[],
  allQuestions: Question[]
): Promise<string> {
  const answeredIds = new Set(answered.map((a) => a.question_id))
  const remaining = allQuestions.filter((q) => !answeredIds.has(q.id)).slice(0, 3)
  const list = remaining.map((q, i) => `${i + 1}. ${q.text}`).join('\n')

  const prompt = `
You are a survey assistant. The user has already answered:
${answered.map((a) => {
    const q = allQuestions.find((q) => q.id === a.question_id)
    return `- ${q?.text ?? a.question_id}: ${a.value}`
  }).join('\n')}

I still need info on:
${list}

Write ONE conversational question that can collect answers for any or all of the above
remaining items in a single response. Output only that question.
`.trim()

  const { text } = await generateText({
    model: openrouter.chat('openai/gpt-3.5-turbo'),
    prompt,
    temperature: 0.7,
    maxTokens: 150,
  })
  if (!text) throw new Error('Follow-up generation failed')
  return text.trim()
}
