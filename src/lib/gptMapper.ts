// src/lib/gptMapper.ts
export async function mapAnswersWithAI(userInput: string, surveyStructure: any) {
    console.log('🔁 mapAnswersWithAI called')           // client‑side log
    console.log('→ payload:', { userInput, surveyStructure })
  
    const res = await fetch('/api/map-answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userInput, surveyStructure }),
    })
  
    console.log('← /api/map-answers status:', res.status)
  
    let data = null
    try {
      data = await res.json()
    } catch (err) {
      console.error('⚠️ failed to parse JSON from /api/map-answers', err)
    }
    console.log('← /api/map-answers body:', data)
  
    return data
  }
  