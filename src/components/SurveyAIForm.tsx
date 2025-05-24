// components/SurveyAIForm.tsx
'use client'

import { useEffect, useState } from 'react'
import { SurveyHeader } from './survey/SurveyHeader'
import { ChatMessages } from './survey/ChatMessages'
import { ChatInput } from './survey/ChatInput'
import { useSurveyData } from '../hooks/useSurveyData'
import { useSurveyLogic } from '../hooks/useSurveyLogic'

interface Props {
  surveyId: string
}

export default function SurveyAIForm({ surveyId }: Props) {
  const [userInput, setUserInput] = useState<string>('')
  
  // Load survey data
  const { surveyTitle, surveyStructure, totalQuestions, loading: dataLoading } = useSurveyData(surveyId)
  
  // Handle survey logic
  const { 
    messages, 
    answeredMap, 
    loading: processingLoading, 
    initializeChat, 
    resetChat, 
    processUserInput 
  } = useSurveyLogic(surveyId, surveyStructure, surveyTitle)

  // Initialize chat when survey data is loaded
  useEffect(() => {
    if (!dataLoading && surveyTitle) {
      initializeChat()
    }
  }, [dataLoading, surveyTitle])

  // Calculate progress
  const answeredCount = Object.keys(answeredMap).length
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0

  const handleSubmit = async () => {
    if (!userInput.trim() || processingLoading) return
    
    const currentInput = userInput
    setUserInput('')
    await processUserInput(currentInput)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleReset = () => {
    resetChat()
    setUserInput('')
  }

  if (dataLoading) {
    return (
      <div className="flex flex-col max-w-4xl mx-auto h-[700px] bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading survey...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col max-w-4xl mx-auto h-[700px] bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
      <SurveyHeader
        surveyTitle={surveyTitle}
        answeredCount={answeredCount}
        totalQuestions={totalQuestions}
        progress={progress}
        loading={processingLoading}
        onReset={handleReset}
      />

      <ChatMessages messages={messages} />

      <ChatInput
        userInput={userInput}
        loading={processingLoading}
        onInputChange={setUserInput}
        onSubmit={handleSubmit}
        onKeyPress={handleKeyPress}
      />
    </div>
  )
}