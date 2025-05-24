'use client'

import { User, Bot } from 'lucide-react'

type Message = { 
  sender: 'bot' | 'user'
  text: string
  timestamp?: Date
  isTyping?: boolean
}

interface ChatMessageProps {
  message: Message
  index: number
}

export function ChatMessage({ message, index }: ChatMessageProps) {
  const TypingIndicator = () => (
    <div className="flex items-center space-x-1 text-gray-500">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
      <span className="text-sm ml-2">AI is thinking...</span>
    </div>
  )

  return (
    <div
      key={index}
      className={`flex items-start space-x-3 animate-in slide-in-from-bottom-4 duration-300 ${
        message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
      }`}
    >
      {/* Avatar */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
        message.sender === 'bot' 
          ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white' 
          : 'bg-gradient-to-br from-green-500 to-emerald-600 text-white'
      }`}>
        {message.sender === 'bot' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
      </div>

      {/* Message bubble */}
      <div className={`max-w-[75%] ${message.sender === 'user' ? 'text-right' : ''}`}>
        <div className={`inline-block px-4 py-3 rounded-2xl shadow-sm ${
          message.sender === 'bot'
            ? 'bg-white border border-gray-200 text-gray-800'
            : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
        }`}>
          {message.isTyping ? (
            <TypingIndicator />
          ) : (
            <div className="whitespace-pre-wrap leading-relaxed">
              {message.text}
            </div>
          )}
        </div>
        
        {message.timestamp && !message.isTyping && (
          <div className={`text-xs text-gray-400 mt-1 ${
            message.sender === 'user' ? 'text-right' : 'text-left'
          }`}>
            {message.timestamp.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        )}
      </div>
    </div>
  )
}