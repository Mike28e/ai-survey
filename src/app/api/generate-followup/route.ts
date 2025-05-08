// src/app/api/generate-followup/route.ts
import { NextResponse } from 'next/server'
import type { Question, MappedAnswer } from '@/lib/gptMapper'
import { generateFollowupQuestion } from '@/lib/gptMapper'

export async function POST(req: Request) {
  try {
    const { answered, questions } = (await req.json()) as {
      answered: MappedAnswer[]
      questions: Question[]
    }
    if (!Array.isArray(answered) || !Array.isArray(questions)) {
      throw new Error('Invalid payload')
    }
    const followup = await generateFollowupQuestion(answered, questions)
    return NextResponse.json({ question: followup })
  } catch (e: any) {
    console.error('generate-followup error', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
