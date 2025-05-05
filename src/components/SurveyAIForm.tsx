'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { mapAnswersWithAI } from '../lib/gptMapper'

interface Props {
  surveyId: string
}

export default function SurveyAIForm({ surveyId }: Props) {
  const [surveyTitle, setSurveyTitle] = useState('')
  const [userInput, setUserInput] = useState('')
  const [surveyStructure, setSurveyStructure] = useState<any[]>([])
  const [mappedAnswers, setMappedAnswers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Load survey title and questions with real UUIDs
  useEffect(() => {
    const loadSurvey = async () => {
      const { data: survey } = await supabase
        .from('surveys')
        .select('title')
        .eq('id', surveyId)
        .single()

      const { data: questions } = await supabase
        .from('questions')
        .select('id, text, type, choices(id, text)')
        .eq('survey_id', surveyId)

      if (survey) setSurveyTitle(survey.title)
      if (questions) setSurveyStructure(questions)
    }

    loadSurvey()
  }, [surveyId])

  const handleSubmit = async () => {
    if (!userInput.trim()) return
    setLoading(true)

    try {
      // 1. Use OpenRouter to map input to survey answers
      console.log('🚀 About to call map‑answers API...')
      const aiResults = await mapAnswersWithAI(userInput, surveyStructure)

      if (!Array.isArray(aiResults)) {
        throw new Error('AI returned invalid format')
      }
      
      console.log('AI Results:', aiResults)

      // 2. Save response
      const { data: response, error } = await supabase
        .from('responses')
        .insert({
          survey_id: surveyId,
          user_input: userInput,
          ai_response: aiResults,
        })
        .select()
        .single()

      if (!response || error) {
        throw new Error('Error saving response')
      }

      // 3. Save answers
      for (const a of aiResults) {
        await supabase.from('answers').insert({
          response_id: response.id,
          question_id: a.question_id,
          choice_id: a.choice_id,
          value: a.value,
        })
      }

      setMappedAnswers(aiResults)
      alert('Response saved!')
    } catch (err) {
      console.error(err)
      alert('Something went wrong.')
    }

    setLoading(false)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{surveyTitle || 'Loading survey...'}</h1>

      <textarea
        className="border p-2 w-full h-40 mb-4"
        placeholder="Tell us about yourself..."
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
      />

      <button
        onClick={handleSubmit}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        disabled={loading}
      >
        {loading ? 'Submitting...' : 'Submit'}
      </button>

      {mappedAnswers.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Mapped Answers</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm whitespace-pre-wrap">
            {JSON.stringify(mappedAnswers, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
