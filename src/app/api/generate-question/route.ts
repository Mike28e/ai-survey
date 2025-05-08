import { NextResponse } from 'next/server'
import type { Question } from '@/lib/gptMapper'
import { generateInitialQuestion } from '@/lib/gptMapper'

export async function POST(req: Request) {
  try {
    const { questions } = (await req.json()) as { questions: Question[] }
    if (!Array.isArray(questions)) throw new Error('questions must be an array')

    // This lives on the server and pulls your key from process.env
    const question = await generateInitialQuestion(questions)
    return NextResponse.json({ question })
  } catch (e: any) {
    console.error('generate-question error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
