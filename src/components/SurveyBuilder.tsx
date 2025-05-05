'use client'

import { useState } from 'react'
import { Question } from '../types'
import { supabase } from '../lib/supabaseClient'

export default function SurveyBuilder() {
  const [title, setTitle] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])

  const addQuestion = () => {
    setQuestions(prev => [
      ...prev,
      {
        text: '',
        type: 'single',
        choices: [{ text: '' }],
      },
    ])
  }

  const updateQuestion = (index: number, updated: Question) => {
    const copy = [...questions]
    copy[index] = updated
    setQuestions(copy)
  }

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const saveSurvey = async () => {
    if (!title.trim() || questions.length === 0) {
      alert('Please add a title and at least one question.')
      return
    }

    const { data: survey, error: surveyError } = await supabase
      .from('surveys')
      .insert({ title })
      .select()
      .single()

    if (surveyError || !survey) {
      console.error(surveyError)
      alert('Failed to save survey.')
      return
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]

      const { data: question, error: questionError } = await supabase
        .from('questions')
        .insert({
          survey_id: survey.id,
          text: q.text,
          type: q.type,
          order_index: i,
        })
        .select()
        .single()

      if (questionError || !question) {
        console.error(questionError)
        alert('Failed to save question.')
        return
      }

      if (q.type !== 'open') {
        const choiceInserts = q.choices
          .filter((c) => c.text.trim() !== '')
          .map((c) => ({
            question_id: question.id,
            text: c.text,
          }))

        if (choiceInserts.length > 0) {
          const { error: choicesError } = await supabase
            .from('choices')
            .insert(choiceInserts)

          if (choicesError) {
            console.error(choicesError)
            alert('Failed to save choices.')
            return
          }
        }
      }
    }

    alert('Survey saved successfully!')
    setTitle('')
    setQuestions([])
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Create New Survey</h1>

      <input
        className="border p-2 w-full mb-4"
        placeholder="Survey Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      {questions.map((q, i) => (
        <div key={i} className="border p-4 mb-4 rounded bg-white shadow">
          <label className="block mb-2">Question {i + 1}</label>
          <input
            className="border p-2 w-full mb-2"
            value={q.text}
            placeholder="Question text"
            onChange={(e) =>
              updateQuestion(i, { ...q, text: e.target.value })
            }
          />

          <select
            className="border p-2 mb-2"
            value={q.type}
            onChange={(e) =>
              updateQuestion(i, { ...q, type: e.target.value as Question['type'] })
            }
          >
            <option value="single">Single Choice</option>
            <option value="multi">Multiple Choice</option>
            <option value="open">Open Text</option>
          </select>

          {q.type !== 'open' && (
            <div className="ml-4">
              {q.choices.map((c, j) => (
                <input
                  key={j}
                  className="border p-1 my-1 w-full"
                  value={c.text}
                  placeholder={`Choice ${j + 1}`}
                  onChange={(e) => {
                    const updatedChoices = [...q.choices]
                    updatedChoices[j].text = e.target.value
                    updateQuestion(i, { ...q, choices: updatedChoices })
                  }}
                />
              ))}
              <button
                className="text-sm text-blue-600 mt-2"
                onClick={() =>
                  updateQuestion(i, {
                    ...q,
                    choices: [...q.choices, { text: '' }],
                  })
                }
              >
                + Add Choice
              </button>
            </div>
          )}

          <button
            className="text-sm text-red-500 mt-2"
            onClick={() => removeQuestion(i)}
          >
            Remove Question
          </button>
        </div>
      ))}

      <button
        className="bg-blue-600 text-white px-4 py-2 rounded"
        onClick={addQuestion}
      >
        + Add Question
      </button>

      <button
        className="ml-4 bg-green-600 text-white px-4 py-2 rounded"
        onClick={saveSurvey}
      >
        Save Survey
      </button>
    </div>
  )
}
