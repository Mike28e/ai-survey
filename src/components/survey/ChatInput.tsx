'use client'

import { useRef, useEffect } from 'react'
import { Send, CheckCircle, MessageSquare } from 'lucide-react'

interface ChatInputProps {
  userInput: string
  loading: boolean
  onInputChange: (value: string) => void
  onSubmit: () => void
  onKeyPress: (e: React.KeyboardEvent) => void
}

export function ChatInput({ 
  userInput, 
  loading, 
  onInputChange, 
  onSubmit, 
  onKeyPress 
}: ChatInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`
    }
  }, [userInput])

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <div className="flex items-end space-x-3">
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            rows={1}
            className="w-full resize-none border-2 border-gray-200 rounded-xl px-4 py-3 pr-12 focus:border-blue-500 focus:outline-none transition-colors duration-200 text-gray-700 placeholder-gray-400"
            placeholder={loading ? "AI is processing..." : "Share your thoughts naturally..."}
            value={userInput}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyPress={onKeyPress}
            disabled={loading}
            style={{ minHeight: '50px', maxHeight: '120px' }}
          />
          
          {/* Character counter */}
          <div className="absolute bottom-2 right-14 text-xs text-gray-400">
            {userInput.length}/1000
          </div>
        </div>
        
        <button
          onClick={onSubmit}
          disabled={loading || !userInput.trim()}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 text-white p-3 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send className="w-6 h-6" />
          )}
        </button>
      </div>
      
      {/* Quick tips */}
      <div className="mt-3 flex items-center justify-center space-x-4 text-xs text-gray-500">
        <span className="flex items-center space-x-1">
          <MessageSquare className="w-3 h-3" />
          <span>Speak naturally - I&apos;ll understand</span>
        </span>
        <span className="flex items-center space-x-1">
          <CheckCircle className="w-3 h-3" />
          <span>Press Enter to send</span>
        </span>
      </div>
    </div>
  )
}