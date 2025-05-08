import { NextResponse } from 'next/server'
import type { Question, MappedAnswer } from '@/lib/gptMapper'
import { mapAnswersWithAI } from '@/lib/gptMapper'

export async function POST(req: Request) {
  try {
    const { rawInput, questions } = (await req.json()) as {
      rawInput: string
      questions: Question[]
    }
    if (!rawInput || !Array.isArray(questions)) {
      return NextResponse.json({ error: 'invalid payload' }, { status: 400 })
    }

    // mapAnswersWithAI will use a lean prompt + maxTokens, too
    const answers: MappedAnswer[] = await mapAnswersWithAI(rawInput, questions)
    return NextResponse.json({ answers })
  } catch (e: any) {
    console.error('map-answers error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
