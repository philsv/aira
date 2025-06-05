"use client"

import { Bot, User } from "lucide-react"

import { CurrentChatMessage } from "../../hooks/useChatState"
import { MarkdownRenderer } from './markdown-renderer'
import { TypingDots } from "./typing-indicator"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { useTranslation } from '@/lib/i18n/useTranslation'

interface ChatMessageProps {
  message: CurrentChatMessage
  index: number
  onViewSources: (sources: Array<{ 
    id: string
    title: string
    content: string
    documentId?: string
    score?: number
  }>) => void
}

export function ChatMessage({ message, index, onViewSources }: ChatMessageProps) {
  const { t } = useTranslation()

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <motion.div
      key={message.id}
      className={cn("flex gap-3", message.type === "user" ? "justify-start" : "justify-end")}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      {message.type === "user" && (
        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-blue-400" />
        </div>
      )}

      <div
        className={cn(
          "max-w-[70%] rounded-xl p-3",
          message.type === "user"
            ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white"
            : message.error
            ? "bg-red-500/10 border border-red-500/20 text-red-400"
            : "bg-white/5 text-white/90 border border-white/10",
        )}
      >
        {message.isTyping ? (
          <div className="flex items-center gap-2">
            <TypingDots />
          </div>
        ) : (
          <>
            {message.type === "ai" ? (
              <MarkdownRenderer content={message.content} />
            ) : (
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            )}
            
            {/* Message metadata */}
            {message.type === "ai" && !message.error && (
              <div className="flex items-center justify-between text-xs text-white/40 mt-2">
                <div className="flex items-center gap-3">
                  {message.confidence && (
                    <span>Confidence: {Math.round(message.confidence * 100)}%</span>
                  )}
                  {message.processingTime && (
                    <span>{t('common.time')}: {message.processingTime.toFixed(2)}s</span>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {message.sources && (
                    <button
                      onClick={() => onViewSources(message.sources!)}
                      className="text-xs text-violet-400 hover:text-violet-300 transition-colors underline"
                    >
                      {t('dialog.sources')} ({message.sources.length})
                    </button>
                  )}
                </div>
              </div>
            )}

            <div
              className={cn(
                "text-xs mt-2 opacity-60",
                message.type === "user" ? "text-left" : "text-right",
              )}
            >
              {formatMessageTime(message.timestamp)}
            </div>
          </>
        )}
      </div>

      {message.type === "ai" && (
        <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-violet-400" />
        </div>
      )}
    </motion.div>
  )
}