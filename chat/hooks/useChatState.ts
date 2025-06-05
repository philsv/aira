import { useRef, useState } from "react"

export interface CurrentChatMessage {
  id: string
  type: "user" | "ai"
  content: string
  timestamp: string
  isTyping?: boolean
  sources?: Array<{ 
    id: string
    title: string
    content: string
    documentId?: string
    score?: number
  }>
  confidence?: number
  processingTime?: number
  error?: boolean
}

export interface CommandSuggestion {
  icon: React.ReactNode
  label: string
  description: string
  prefix: string
}

export const useChatState = () => {
  const [value, setValue] = useState("")
  const [attachments, setAttachments] = useState<string[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState<number>(-1)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [recentCommand, setRecentCommand] = useState<string | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [inputFocused, setInputFocused] = useState(false)
  const [currentChat, setCurrentChat] = useState<CurrentChatMessage[]>([])
  const [chatHistory, setChatHistory] = useState<Array<{ question: string; answer: string }>>([])
  
  const commandPaletteRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  return {
    value,
    setValue,
    attachments,
    setAttachments,
    isTyping,
    setIsTyping,
    activeSuggestion,
    setActiveSuggestion,
    showCommandPalette,
    setShowCommandPalette,
    recentCommand,
    setRecentCommand,
    mousePosition,
    setMousePosition,
    inputFocused,
    setInputFocused,
    currentChat,
    setCurrentChat,
    chatHistory,
    setChatHistory,
    commandPaletteRef,
    chatContainerRef,
  }
}