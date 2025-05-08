// src/components/SurveyAIForm.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Question, MappedAnswer } from '@/lib/gptMapper'

type Message = { sender: 'bot' | 'user'; text: string }

interface MapAnswersResponse {
  answers: MappedAnswer[]
  error?: string
}

interface FollowupResponse {
  question?: string
  error?: string
}

interface Props {
  surveyId: string
}

export default function SurveyAIForm({ surveyId }: Props) {
  const [surveyTitle, setSurveyTitle] = useState<string>('')
  const [surveyStructure, setSurveyStructure] = useState<Question[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [answeredMap, setAnsweredMap] = useState<Record<string, MappedAnswer>>({})
  const [userInput, setUserInput] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 1) Load survey & ask initial master question
  useEffect(() => {
    ;(async () => {
      // fetch title
      const { data: survey } = await supabase
        .from('surveys')
        .select('title')
        .eq('id', surveyId)
        .single()
      setSurveyTitle(survey?.title ?? 'Survey')

      // fetch questions
      const { data: questions } = await supabase
        .from('questions')
        .select('id, text, type, choices(id, text)')
        .eq('survey_id', surveyId)
      if (!questions) return

      const minimalQs: Question[] = questions.map((q) => ({
        id: q.id,
        text: q.text,
        choices: q.choices,
      }))
      setSurveyStructure(minimalQs)

      // call /api/generate-question
      try {
        const res = await fetch('/api/generate-question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questions: minimalQs }),
        })
        const { question, error } = (await res.json()) as FollowupResponse
        if (error || !question) throw new Error(error || 'No question')
        setMessages([{ sender: 'bot', text: question }])
      } catch (err) {
        console.error('generate-question error', err)
        setMessages([
          {
            sender: 'bot',
            text: `👋 Welcome to "${survey?.title}". Tell me about yourself.`,
          },
        ])
      }
    })()
  }, [surveyId])

  // 2) Auto-scroll on new messages
  useEffect(() => {
    containerRef.current?.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages])

  // 3) Handle Send
  const handleSubmit = async () => {
    if (!userInput.trim() || loading) return
    setMessages((m) => [...m, { sender: 'user', text: userInput }])
    setLoading(true)

    // always send just id+text
    const minimalQs = surveyStructure.map((q) => ({
      id: q.id,
      text: q.text,
    }))

    try {
      // a) Map answers
      const mapRes = await fetch('/api/map-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawInput: userInput,
          questions: minimalQs,
        }),
      })
      const { answers: aiResults, error: mapErr } = (await mapRes.json()) as MapAnswersResponse
      if (mapErr) throw new Error(mapErr)

      // b) normalize numeric IDs → real UUIDs
      const normalized: MappedAnswer[] = aiResults.map((a) => {
        let qid = a.question_id
        if (/^\d+$/.test(qid)) {
          const idx = parseInt(qid, 10) - 1
          qid = surveyStructure[idx]?.id ?? qid
        }
        return { ...a, question_id: qid }
      })

      // c) filter out empty or "n/a" answers before marking answered
      const validAnswers = normalized.filter((a) => {
        const v = (a.value ?? '').trim().toLowerCase()
        return v !== '' && v !== 'n/a'
      })

      // d) update answeredMap WITH only valid answers
      const updated = { ...answeredMap }
      validAnswers.forEach((a) => {
        updated[a.question_id] = a
      })
      setAnsweredMap(updated)

      // e) save raw + structured
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

      // f) save each mapped answer
      for (const a of normalized) {
        await supabase.from('answers').insert({
          response_id: savedResp.id,
          question_id: a.question_id,
          choice_id: a.choice_id,
          value: a.value,
        })
      }

      // g) summarize all (including N/As if you like)
      setMessages((m) => [
        ...m,
        { sender: 'bot', text: '✅ Got that. Here’s what I have so far:' },
        ...normalized.map((a) => {
          const q = surveyStructure.find((q) => q.id === a.question_id)
          const label = q?.text ?? a.question_id
          const choiceText = q?.choices?.find((c) => c.id === a.choice_id)?.text
          const display = choiceText ?? a.value ?? '(no answer)'
          return { sender: 'bot' as const, text: `• ${label}: ${display}` }
        }),
      ])

      // h) determine next step
      const remainingQs = surveyStructure.filter((q) => !(q.id in updated))
      if (remainingQs.length === 0) {
        setMessages((m) => [
          ...m,
          { sender: 'bot', text: '🎉 You’ve answered all the questions. Thank you!' },
        ])
      } else {
        // try AI follow‑up
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
          const { question, error } = (await folRes.json()) as FollowupResponse
          if (question && remainingQs.some((q) => question.includes(q.text))) {
            nextQ = question.trim()
          }
        } catch (e) {
          console.warn('follow‑up failed, falling back', e)
        }
        if (!nextQ) nextQ = remainingQs[0].text
        setMessages((m) => [...m, { sender: 'bot', text: nextQ! }])
      }
    } catch (err) {
      console.error('handleSubmit error', err)
      setMessages((m) => [
        ...m,
        { sender: 'bot', text: '😕 Oops—something went wrong. Please try again.' },
      ])
    } finally {
      setLoading(false)
      setUserInput('')
    }
  }

  return (
    <div className="flex flex-col max-w-2xl mx-auto h-[600px] border rounded">
      {/* Header */}
      <div className="px-4 py-2 bg-white border-b">
        <h1 className="text-xl font-semibold">{surveyTitle}</h1>
      </div>
      {/* Chat window */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.sender === 'bot' ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`px-4 py-2 rounded-lg max-w-[80%] whitespace-pre-wrap ${
                m.sender === 'bot'
                  ? 'bg-gray-200 text-gray-800'
                  : 'bg-blue-600 text-white'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>
      {/* Input */}
      <div className="px-4 py-2 bg-white border-t flex items-center space-x-2">
        <textarea
          rows={1}
          className="flex-1 resize-none border rounded px-3 py-2 focus:outline-none"
          placeholder={loading ? 'Waiting…' : 'Type your response…'}
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          disabled={loading}
        />
        <button
          onClick={handleSubmit}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={loading}
        >
          {loading ? '…' : 'Send'}
        </button>
      </div>
    </div>
  )
}
