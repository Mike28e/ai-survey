// lib/gptMapper.ts
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateText } from 'ai'

/** Questions as stored in Supabase (with optional choices for mulit‑choice) */
export type Question = {
  id: string
  text: string
  choices?: { id: string; text: string }[]
}

/** The shape of each mapped answer */
export type MappedAnswer = {
  question_id: string
  choice_id: string | null
  value: string
}

const openrouter = createOpenRouter({
  apiKey: process.env.NEXT_PUBLIC_OPENROUTER_API_KEY!,
})

/**
 * Generate one “master” question that tries to cover
 * as many of your survey questions as possible.
 */
export async function generateInitialQuestion(questions: Question[]) {
  // Build a numbered list of the *exact* survey texts
  const list = questions
    .map((q, i) => `${i + 1}. ${q.text}`)
    .join('\n')

  const systemPrompt = `
You are a friendly survey assistant. I need to collect these pieces of information from the user:
${list}

Write ONE single, clear, conversational question that, when answered, lets me infer answers for *all* of the above items in one go. 
• Do NOT output any explanation or numbering—only the question itself.
• Mention each survey item by name so the user knows exactly what to include.
  `.trim()

  const { text } = await generateText({
    model: openrouter.chat('openai/gpt-3.5-turbo'),
    prompt: systemPrompt,
    temperature: 0.7,
    maxTokens: 200,
  })

  if (!text) throw new Error('No initial question generated')
  return text.trim()
}



/**
 * Map a free‑form user response into an array of
 * { question_id, choice_id, value } objects.
 */
export async function mapAnswersWithAI(rawInput: string, questions: Question[]) {
  const prompt = `
You are a JSON factory. Here are the survey questions:
${questions.map((q,i) => `${i+1}. ${q.text}`).join('\n')}

User answered: "${rawInput}"

Return ONLY a JSON array of {question_id, choice_id, value}. If nothing applies,
return [] and nothing else.
`.trim()

  const { text: raw } = await generateText({
    model: openrouter.chat('openai/gpt-3.5-turbo'),
    prompt,
    temperature: 0,
    maxTokens: 512,          // <-- keep it under your free‐tier limit
  })

  // isolate the JSON array
  const json = raw
  .split('\n')[0]
  .match(/^\[[\s\S]*\]/)?.[0]  
  ?? raw
  let parsed = JSON.parse(json)
  if (!Array.isArray(parsed)) throw new Error('Invalid JSON format')
  return parsed as MappedAnswer[]
}

/**
 * Given a list of already‐answered mappings and the full survey,
 * ask the model for one next question that will fill in the gaps.
 */
export async function generateFollowupQuestion(
  answered: MappedAnswer[],
  allQuestions: Question[]
): Promise<string> {
  // figure out which ones still need answers
  const answeredIds = new Set(answered.map((a) => a.question_id))
  const remaining = allQuestions
    .filter((q) => !answeredIds.has(q.id))
    .map((q, i) => `${i + 1}. ${q.text}`)
    .join('\n')

  const systemPrompt = `
You are a survey assistant. The user has already answered some questions:
${answered
    .map((a) => {
      const q = allQuestions.find((q) => q.id === a.question_id)
      return `- ${q?.text}: ${a.value || 'N/A'}`
    })
    .join('\n')}

Here are the remaining things I still need:
${remaining}

Write ONE clear question (no numbering, no explanation) that asks for one of the remaining pieces of information. 
Make it conversational and include the exact wording of the survey item.
  `.trim()

  const { text } = await generateText({
    model: openrouter.chat('openai/gpt-3.5-turbo'),
    prompt: systemPrompt,
    temperature: 0.7,
    maxTokens: 100,
  })

  if (!text) throw new Error('No followup question generated')
  return text.trim()
}

