'use client'

import { useRef, useEffect } from 'react'
import { ChatMessage } from './ChatMessage'

type Message = { 
  sender: 'bot' | 'user'
  text: string
  timestamp?: Date
  isTyping?: boolean
}

interface ChatMessagesProps {
  messages: Message[]
}

export function ChatMessages({ messages }: ChatMessagesProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll with smooth animation
  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [messages])

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-50 to-white"
    >
      {messages.map((message, index) => (
        <ChatMessage key={index} message={message} index={index} />
      ))}
    </div>
  )
}