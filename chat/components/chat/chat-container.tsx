"use client"

import { ChatMessage } from "./chat-message"
import { CurrentChatMessage } from "../../hooks/useChatState"
import { motion } from "framer-motion"

interface ChatContainerProps {
  messages: CurrentChatMessage[]
  chatContainerRef: React.RefObject<HTMLDivElement>
  onViewSources: (sources: Array<{ 
    id: string
    title: string
    content: string
    documentId?: string
    score?: number
  }>) => void
}

export function ChatContainer({ messages, chatContainerRef, onViewSources }: ChatContainerProps) {
  return (
    <motion.div
      className="flex-1 flex flex-col min-h-0 py-6 mb-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
      >
        {messages.map((message, index) => (
          <ChatMessage
            key={message.id}
            message={message}
            index={index}
            onViewSources={onViewSources}
          />
        ))}
      </div>
    </motion.div>
  )
}