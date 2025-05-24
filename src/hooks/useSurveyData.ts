'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Question } from '@/lib/gptMapper'

export function useSurveyData(surveyId: string) {
  const [surveyTitle, setSurveyTitle] = useState<string>('')
  const [surveyStructure, setSurveyStructure] = useState<Question[]>([])
  const [totalQuestions, setTotalQuestions] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    ;(async () => {
      try {
        // Fetch survey title
        const { data: survey } = await supabase
          .from('surveys')
          .select('title')
          .eq('id', surveyId)
          .single()
        const title = survey?.title ?? 'Survey'
        setSurveyTitle(title)

        // Fetch questions
        const { data: questions } = await supabase
          .from('questions')
          .select('id, text, type, choices(id, text)')
          .eq('survey_id', surveyId)
        if (!questions) return

        // Keep only id+text in local state
        const minimalQs: Question[] = questions.map((q) => ({
          id: q.id,
          text: q.text,
          choices: q.choices,
        }))
        setSurveyStructure(minimalQs)
        setTotalQuestions(minimalQs.length)
      } catch (error) {
        console.error('Error loading survey data:', error)
      } finally {
        setLoading(false)
      }
    })()
  }, [surveyId])

  return {
    surveyTitle,
    surveyStructure,
    totalQuestions,
    loading
  }
}
