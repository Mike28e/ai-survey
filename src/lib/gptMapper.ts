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

/** 2) Map free-form input into a strict JSON array **/
export async function mapAnswersWithAI(
  rawInput: string,
  questions: Question[]
): Promise<MappedAnswer[]> {
  // 1) Build a lookup of questions by ID for later validation
  const questionMap = Object.fromEntries(questions.map((q) => [q.id, q]))

  // 2) Build the “survey items” block with choice lists
  const list = questions
  .map((q, i) => {
    // 1) Base: numbered, with real ID interpolation
    let line = `${i + 1}. [${q.id}] ${q.text}`

    // 2) If there are choices, list them as ID→text pairs
    if (q.choices?.length) {
      const opts = q.choices
        .map((c) => `{ id: "${c.id}", text: "${c.text}" }`)
        .join(', ')
      line += `\n   Choices: [ ${opts} ]`
    }

    return line
  })
  .join('\n')


  // 3) A prompt that forces the model to ONLY output matched choice items
  const systemPrompt = `
You are a JSON extraction engine. USE ONLY the question IDs and choice IDs provided below.

For each question:
- If the user’s response clearly matches one of the provided choice texts, output an object with:
    • "question_id": that question’s ID
    • "choice_id": the matching choice’s ID
    • "value": the exact choice text
- Do NOT output anything for questions that are not answered or do not match a choice.

Return EXACTLY a JSON array of such objects, for example:
[
  { "question_id": "Q_COLOR_ID", "choice_id": "C_BLUE_ID", "value": "blue" },
  { "question_id": "Q_YEAR_ID",  "choice_id": "C_2019_ID", "value": "2019" }
]
No extra fields or wrapper text.
`.trim()

  const userPrompt = `
Here are the survey items (with IDs and choices):
${list}

User answered:
"""${rawInput}"""

Return only the JSON array now.
`.trim()

  // 4) Invoke the LLM
  const { text: raw } = await generateText({
    model: openrouter.chat('openai/gpt-3.5-turbo'),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt   },
    ],
    temperature: 0,
    maxTokens: 512,
  })

  // 5) Strip fences and grab the last […] block
  const cleaned = raw.replace(/```/g, '')
  const blocks = cleaned.match(/\[[\s\S]*?\]/g)
  if (!blocks) {
    console.error('LLM output had no JSON array:', raw)
    throw new Error(`Invalid AI format: no JSON array found\n\n${raw}`)
  }
  const jsonText = blocks[blocks.length - 1]

  // 6) Parse
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    console.error('Failed to parse JSON:', jsonText)
    throw new Error(`JSON parse error:\n\n${jsonText}`)
  }

  // 7) Validate structure and filter to only valid choice matches
  if (
    !Array.isArray(parsed) ||
    !parsed.every((o: any) =>
      typeof o.question_id === 'string' &&
      questionMap[o.question_id]?.choices?.some((c) => c.id === o.choice_id) &&
      typeof o.value === 'string' &&
      o.value.length > 0
    )
  ) {
    console.error('Unexpected JSON structure:', parsed)
    throw new Error('Invalid AI format: unexpected structure')
  }

  // 8) Return exactly what the AI provided
  return parsed as MappedAnswer[]
}



/** 3) Follow-up covering up to 3 items at once **/
export async function generateFollowupQuestion(
  answered: MappedAnswer[],
  allQuestions: Question[]
): Promise<string> {
  const answeredIds = new Set(answered.map((a) => a.question_id))
  const remaining = allQuestions
    .filter((q) => !answeredIds.has(q.id))
    .slice(0, 3)
  const list = remaining.map((q, i) => `${i + 1}. ${q.text}`).join('\n')

  const prompt = `
You are a survey assistant. The user has already answered:
${answered
    .map((a) => {
      const q = allQuestions.find((q) => q.id === a.question_id)
      return `- ${q?.text ?? a.question_id}: ${a.value}`
    })
    .join('\n')}

I still need info on:
${list}

Write ONE conversational question that can collect answers for multiple questions at once if possible, or just one
remaining item in a single response. Output only that question.
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
