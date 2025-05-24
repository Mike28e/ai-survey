'use client'

import { Sparkles, RotateCcw } from 'lucide-react'

interface SurveyHeaderProps {
  surveyTitle: string
  answeredCount: number
  totalQuestions: number
  progress: number
  loading: boolean
  onReset: () => void
}

export function SurveyHeader({ 
  surveyTitle, 
  answeredCount, 
  totalQuestions, 
  progress, 
  loading, 
  onReset 
}: SurveyHeaderProps) {
  return (
    <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{surveyTitle}</h1>
            <p className="text-blue-100 text-sm">AI-powered smart survey</p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="flex items-center space-x-3">
            <button
              onClick={onReset}
              className="flex items-center space-x-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm transition-colors duration-200 text-white text-sm font-medium"
              disabled={loading}
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
            
            <div>
              <div className="text-white text-sm font-medium">
                {answeredCount} of {totalQuestions} topics covered
              </div>
              <div className="w-32 h-2 bg-white/20 rounded-full mt-1 overflow-hidden">
                <div 
                  className="h-full bg-white rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}