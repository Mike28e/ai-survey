'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Question, MappedAnswer } from '@/lib/gptMapper'

type Message = { 
  sender: 'bot' | 'user'
  text: string
  timestamp?: Date
  isTyping?: boolean
}

interface MapAnswersResponse {
  answers: MappedAnswer[]
  error?: string
}

interface FollowupResponse {
  question?: string
  error?: string
}

export function useSurveyLogic(surveyId: string, surveyStructure: Question[], surveyTitle: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [answeredMap, setAnsweredMap] = useState<Record<string, MappedAnswer>>({})
  const [loading, setLoading] = useState<boolean>(false)

  const initializeChat = () => {
    setMessages([
      {
        sender: 'bot',
        text: `✨ Welcome to "${surveyTitle}"! I'm here to make this quick and easy for you.\n\nTo get started, tell me about your vehicle - what do you drive and what's your experience been like?`,
        timestamp: new Date(),
      },
    ])
  }

  const resetChat = () => {
    initializeChat()
    setAnsweredMap({})
    setLoading(false)
  }

  const showTypingIndicator = () => {
    setMessages(prev => [...prev, { 
      sender: 'bot', 
      text: '', 
      isTyping: true,
      timestamp: new Date()
    }])
  }

  const removeTypingIndicator = () => {
    setMessages(prev => prev.filter(m => !m.isTyping))
  }

  const processUserInput = async (userInput: string) => {
    setLoading(true)

    // Add user message
    setMessages(prev => [...prev, { 
      sender: 'user', 
      text: userInput,
      timestamp: new Date()
    }])

    showTypingIndicator()

    // Always pass only id+text to APIs
    const minimalQs = surveyStructure.map((q) => ({
      id: q.id,
      text: q.text,
    }))

    try {
      // Map answers from free-form input using GPT
      const mapRes = await fetch('/api/map-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawInput: userInput, questions: minimalQs }),
      })
      const { answers: aiResults, error: mapErr } = (await mapRes.json()) as MapAnswersResponse
      if (mapErr) throw new Error(mapErr)

      // Normalize numeric IDs → real UUIDs
      const normalized: MappedAnswer[] = aiResults.map((a) => {
        let qid = a.question_id
        if (/^\d+$/.test(qid)) {
          const idx = parseInt(qid, 10) - 1
          qid = surveyStructure[idx]?.id ?? qid
        }
        return { ...a, question_id: qid }
      })

      // Filter out empty or "n/a" answers for completion tracking
      const validAnswers = normalized.filter((a) => {
        const v = (a.value ?? '').trim().toLowerCase()
        return v !== '' && v !== 'n/a'
      })

      // Update answeredMap with only the valid ones
      const updated = { ...answeredMap }
      validAnswers.forEach((a) => {
        updated[a.question_id] = a
      })
      setAnsweredMap(updated)

      // Save raw + structured response
      const { data: savedResp, error: saveErr } = await supabase
        .from('responses')
        .insert({
          survey_id: surveyId,
          user_input: userInput,
          ai_response: normalized,
        })
        .select()
        .single()
      if (saveErr || !savedResp) throw saveErr || new Error('Save failed')

      // Save each mapped answer row
      for (const a of normalized) {
        await supabase.from('answers').insert({
          response_id: savedResp.id,
          question_id: a.question_id,
          choice_id: a.choice_id,
          value: a.value,
        })
      }

      removeTypingIndicator()

      // Show what we captured
      if (validAnswers.length > 0) {
        setMessages(prev => [
          ...prev,
          { 
            sender: 'bot', 
            text: "Perfect! I've captured several details from your response:",
            timestamp: new Date()
          },
          ...validAnswers.map(a => {
            const q = surveyStructure.find((q) => q.id === a.question_id)
            const label = q?.text ?? a.question_id
            const choiceText = q?.choices?.find((c) => c.id === a.choice_id)?.text
            const display = choiceText ?? a.value ?? '(no answer)'
            return {
              sender: 'bot' as const,
              text: `✓ ${label}: ${display}`,
              timestamp: new Date()
            }
          })
        ])
      }

      // Follow-up question or completion
      setTimeout(async () => {
        const remainingQs = surveyStructure.filter((q) => !(q.id in updated))
        
        if (remainingQs.length === 0) {
          setMessages(prev => [...prev, {
            sender: 'bot',
            text: "🎉 Fantastic! You've provided all the information I need. Thank you for taking the time to share your experience with us!",
            timestamp: new Date()
          }])
        } else {
          // Try AI follow-up
          let nextQ: string | undefined
          try {
            const folRes = await fetch('/api/generate-followup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                answered: Object.values(updated),
                questions: remainingQs,
              }),
            })
            const { question } = (await folRes.json()) as FollowupResponse
            if (question && remainingQs.some((q) => question.includes(q.text))) {
              nextQ = question.trim()
            }
          } catch {
            /* fallback below */
          }
          
          if (!nextQ) nextQ = remainingQs[0].text
          
          setMessages(prev => [...prev, {
            sender: 'bot',
            text: nextQ!,
            timestamp: new Date()
          }])
        }
        setLoading(false)
      }, 1000)

    } catch (err) {
      console.error('processUserInput error', err)
      removeTypingIndicator()
      setMessages(prev => [
        ...prev,
        { 
          sender: 'bot', 
          text: '😕 Oops—something went wrong. Please try again.',
          timestamp: new Date()
        },
      ])
      setLoading(false)
    }
  }

  return {
    messages,
    answeredMap,
    loading,
    initializeChat,
    resetChat,
    processUserInput
  }
}