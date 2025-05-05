// src/app/api/map-answers/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { userInput, surveyStructure } = await req.json()

  const prompt = `
You are a survey assistant.
Map this user response to the survey below.
User Input:
"""${userInput}"""

Survey (use these exact IDs):
${JSON.stringify(surveyStructure, null, 2)}

Return ONLY a JSON array of objects:
[{ "question_id": "...", "choice_id": "...", "value": null }]
`

  // 1) Call OpenRouter’s chat completions
  const openRouterRes = await fetch(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',    // ← a chat-capable model
        messages: [{ role: 'user', content: prompt }],
      }),
    }
  )

  if (!openRouterRes.ok) {
    // Surface the actual status/text if OpenRouter itself errored
    const text = await openRouterRes.text().catch(() => '')
    return NextResponse.json(
      { error: 'OpenRouter error', status: openRouterRes.status, text },
      { status: 502 }
    )
  }

  // 2) Parse the response JSON
  let data: any
  try {
    data = await openRouterRes.json()
  } catch (e) {
    return NextResponse.json(
      { error: 'Invalid JSON from OpenRouter' },
      { status: 502 }
    )
  }

  // 3) Drill into the assistant message
  const content = data.choices?.[0]?.message?.content
  if (typeof content !== 'string') {
    return NextResponse.json(
      { error: 'No message content returned by AI', data },
      { status: 502 }
    )
  }

  // 4) Parse the mapping JSON that the model returned
  let mapped: any
  try {
    mapped = JSON.parse(content)
    if (!Array.isArray(mapped)) throw new Error('Not an array')
  } catch (e) {
    return NextResponse.json(
      { error: 'AI returned invalid JSON mapping', content },
      { status: 502 }
    )
  }

  // 5) Success: return the parsed array
  return NextResponse.json(mapped)
}
