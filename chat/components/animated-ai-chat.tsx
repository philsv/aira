"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ChatContainer, ChatInput, TypingIndicator, WelcomeScreen } from './chat'
import {
  ChatHistoryModal,
  DeleteConfirmationModal,
  FeedbackModal,
  FileUploadModal,
  SourcesModal
} from './modals'
import { MessageSquare, Sparkles } from "lucide-react"
import { useAutoResizeTextarea, useChatState, useQAHistory } from '../hooks'
import { useEffect, useState } from "react"

import { useTranslation } from '@/lib/i18n/useTranslation'

export function AnimatedAIChat() {
  const { t } = useTranslation()
  
  const {
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
  } = useChatState()

  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 60,
    maxHeight: 200,
  })

  // Modal states
  const [isFileModalOpen, setIsFileModalOpen] = useState(false)
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false)
  const [isChatHistoryModalOpen, setIsChatHistoryModalOpen] = useState(false)
  const [isSourcesModalOpen, setIsSourcesModalOpen] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ 
    isOpen: boolean; 
    fileName: string; 
    index: number;
    isDeleting: boolean;
  }>({
    isOpen: false,
    fileName: "",
    index: -1,
    isDeleting: false,
  })

  // File upload states
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ 
    name: string
    size: string
    progress: number
    documentId?: string
    status?: string
  }>>([])
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Feedback states
  const [feedbackData, setFeedbackData] = useState<{ 
    question: string; 
    answer: string; 
    comment: string 
  }>({
    question: "",
    answer: "",
    comment: "",
  })
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)

  // Sources state
  const [selectedSources, setSelectedSources] = useState<Array<{ 
    id: string
    title: string
    content: string
    documentId?: string
    score?: number
  }>>([])

  const { history, loading: historyLoading, error: historyError, refetch: refetchHistory } = useQAHistory()

  // Track window dimensions for responsive positioning
  const [windowDimensions, setWindowDimensions] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener('mousemove', handleMouseMove)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [setMousePosition])

  useEffect(() => {
    const fetchExistingDocumentsOnMount = async () => {
      try {
        const response = await fetch('/api/documents')
        
        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          console.error('Non-JSON response when fetching existing documents')
          return
        }

        const data = await response.json()

        if (!response.ok) {
          console.error('Failed to fetch existing documents:', data.error)
          return
        }
          
        const documents = data.documents || []
        
        const existingFiles = documents.map((doc: any) => ({
          name: doc.filename,
          size: doc.file_size ? (doc.file_size < 1024 * 1024 
            ? `${(doc.file_size / 1024).toFixed(1)} KB`
            : `${(doc.file_size / (1024 * 1024)).toFixed(1)} MB`) : 'Unknown size',
          progress: 100,
          documentId: doc.id,
          status: doc.status
        }))
        
        setUploadedFiles(existingFiles)
        
        const existingFileNames = existingFiles.map((file: any) => file.name)
        setAttachments(existingFileNames)
        
      } catch (error) {
        console.error('Error fetching existing documents on mount:', error)
      }
    }

    fetchExistingDocumentsOnMount()
  }, [])

  const commandSuggestions = [
    {
      icon: <Sparkles className="w-4 h-4" />,
      label: t('commands.feedback'),
      description: t('commands.feedbackDescription'),
      prefix: "/feedback",
    },
  ]

  const showWelcomeScreen = currentChat.length === 0

  const sendMessage = async (message: string) => {
    try {
      const response = await fetch('/api/qa/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: message,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send message')
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
  }

  const handleSendMessage = async () => {
    if (value.trim()) {
      if (value.startsWith("/feedback ")) {
        const feedbackComment = value.replace("/feedback ", "").trim()

        const hasHistory = chatHistory.length > 0 || history.length > 0

        if (hasHistory) {
          let lastChat
          if (chatHistory.length > 0) {
            lastChat = chatHistory[chatHistory.length - 1]
          } else if (history.length > 0) {
            const lastHistoryItem = history[0]
            lastChat = {
              question: lastHistoryItem.question,
              answer: lastHistoryItem.answer
            }
          }

          if (lastChat) {
            setFeedbackData({
              question: lastChat.question,
              answer: lastChat.answer,
              comment: feedbackComment || "",
            })

            setIsFeedbackModalOpen(true)
            setValue("")
            adjustHeight(true)
            return
          }
        } else {
          setRecentCommand(t('commands.noPreviousMessagesNotification'))
          setTimeout(() => setRecentCommand(null), 5000)
          setValue("")
          adjustHeight(true)
          return
        }
      }

      const currentQuestion = value.trim()

      // Add user message to current chat
      const userMessage = {
        id: `user_${Date.now()}`,
        type: "user" as const,
        content: currentQuestion,
        timestamp: new Date().toISOString(),
      }

      setCurrentChat((prev) => [...prev, userMessage])

      setIsTyping(true)

      // Add typing indicator
      const typingMessage = {
        id: `typing_${Date.now()}`,
        type: "ai" as const,
        content: "",
        timestamp: new Date().toISOString(),
        isTyping: true,
      }

      setCurrentChat((prev) => [...prev, typingMessage])

      try {
        const response = await sendMessage(currentQuestion)
        setIsTyping(false)

        // Remove typing indicator and add actual response
        setCurrentChat((prev) => {
          const withoutTyping = prev.filter((msg) => !msg.isTyping)
          const aiMessage = {
            id: response.session_id || `ai_${Date.now()}`,
            type: "ai" as const,
            content: response.answer,
            timestamp: new Date().toISOString(),
            confidence: response.confidence_score,
            processingTime: response.processing_time,
            sources: response.sources ? response.sources.map((source: any, index: number) => ({
              id: source.point_id || `source_${index}`,
              title: source.document_name || `Source ${index + 1}`,
              content: source.content,
              documentId: source.document_id,
              score: source.score
            })) : undefined,
          }
          return [...withoutTyping, aiMessage]
        })

        // Add to chat history
        setChatHistory((prev) => [...prev, { question: currentQuestion, answer: response.answer }])

        setValue("")
        adjustHeight(true)
      } catch (error) {
        console.error("Error handling message:", error)
        setIsTyping(false)

        // Remove typing indicator and add error message
        setCurrentChat((prev) => {
          const withoutTyping = prev.filter((msg) => !msg.isTyping)
          const errorMessage = {
            id: `error_${Date.now()}`,
            type: "ai" as const,
            content: "Sorry, I encountered an error processing your request.",
            timestamp: new Date().toISOString(),
            error: true,
          }
          return [...withoutTyping, errorMessage]
        })
      }
    }
  }

  const handleSourcesClick = (sources: Array<{ 
    id: string
    title: string
    content: string
    documentId?: string
    score?: number
  }>) => {
    setSelectedSources(sources)
    setIsSourcesModalOpen(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showCommandPalette) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveSuggestion((prev) => (prev < commandSuggestions.length - 1 ? prev + 1 : 0))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveSuggestion((prev) => (prev > 0 ? prev - 1 : commandSuggestions.length - 1))
      } else if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault()
        if (activeSuggestion >= 0) {
          const selectedCommand = commandSuggestions[activeSuggestion]
          setValue(selectedCommand.prefix + " ")
          setShowCommandPalette(false)

          setRecentCommand(selectedCommand.label)
          setTimeout(() => setRecentCommand(null), 3500)
        }
      } else if (e.key === "Escape") {
        e.preventDefault()
        setShowCommandPalette(false)
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (value.trim()) {
        handleSendMessage()
      }
    }
  }

  // Handle command suggestion selection
  const handleSelectCommandSuggestion = (index: number) => {
    const selectedCommand = commandSuggestions[index]
    setValue(selectedCommand.prefix + " ")
    setShowCommandPalette(false)

    setRecentCommand(selectedCommand.label)
    setTimeout(() => setRecentCommand(null), 2000)
  }

  const handleCommandSuggestionClick = (prefix: string) => {
    if (prefix === "/feedback") {
      // Insert the command into the input field
      setValue("/feedback ")
      setRecentCommand(t('commands.feedback'))
      setTimeout(() => setRecentCommand(null), 2000)
      
      // Focus the textarea
      if (textareaRef.current) {
        textareaRef.current.focus()
      }
    }
  }
  
  const handleFileUploaded = (fileName: string) => {
    setAttachments((prev) => [...prev, fileName])
  }

  const handleDeleteAttachment = (index: number, fileName: string) => {
    setDeleteConfirmation({
      isOpen: true,
      fileName,
      index,
      isDeleting: false,
    })
  }

  const confirmDeleteAttachment = async () => {
    if (deleteConfirmation.index >= 0 && !deleteConfirmation.isDeleting) {
      // Set deleting state
      setDeleteConfirmation(prev => ({ ...prev, isDeleting: true }))
      
      const fileToDelete = attachments[deleteConfirmation.index]
      
      // Find the file in uploadedFiles to get the documentId
      const uploadedFileToDelete = uploadedFiles.find(file => file.name === fileToDelete)
      
      if (uploadedFileToDelete && uploadedFileToDelete.documentId) {
        // If it has a documentId, delete from backend first
        try {
          const response = await fetch(`/api/documents/${uploadedFileToDelete.documentId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
            throw new Error(errorData.error || 'Failed to delete document')
          }

          // Remove from uploadedFiles
          setUploadedFiles(prev => prev.filter(file => file.documentId !== uploadedFileToDelete.documentId))
        } catch (error) {
          console.error('Error deleting document:', error)
          setUploadError(`Failed to delete ${fileToDelete}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          
          // Close the modal even if deletion failed
          setDeleteConfirmation({ isOpen: false, fileName: "", index: -1, isDeleting: false })
          return
        }
      }

      // Remove from attachments
      setAttachments((prev) => prev.filter((_, i) => i !== deleteConfirmation.index))

      // Also remove from uploaded files list (for files without documentId)
      setUploadedFiles((prev) => prev.filter((file) => file.name !== fileToDelete))
    }
    setDeleteConfirmation({ isOpen: false, fileName: "", index: -1, isDeleting: false })
  }

  const cancelDeleteAttachment = () => {
    setDeleteConfirmation({ isOpen: false, fileName: "", index: -1, isDeleting: false })
  }

  const handleFeedbackSubmit = async (rating: number, is_helpful: boolean) => {
    setIsSubmittingFeedback(true)

    try {
      // Try to find session_id from the current messages or history
      const sessionId = currentChat.find(m => m.type === 'ai' && m.content === feedbackData.answer)?.id || 
                       history.find(h => h.answer === feedbackData.answer)?.id

      // Validate required fields
      if (!feedbackData.question || !feedbackData.answer || rating === undefined || is_helpful === undefined) {
        throw new Error("Missing required fields")
      }

      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: feedbackData.question,
          answer: feedbackData.answer,
          comment: feedbackData.comment,
          rating,
          is_helpful,
          session_id: sessionId,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log("Feedback submitted successfully:", result)
        setIsFeedbackModalOpen(false)

        // Refresh history to show updated feedback
        refetchHistory()

        // Show success message
        setRecentCommand(t('feedback.submittedSuccessfully'))
        setTimeout(() => setRecentCommand(null), 3000)
      } else {
        throw new Error("Failed to submit feedback")
      }
    } catch (error) {
      console.error("Error submitting feedback:", error)
      setRecentCommand(t('feedback.submissionFailed'))
      setTimeout(() => setRecentCommand(null), 3000)
    } finally {
      setIsSubmittingFeedback(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col w-full items-center justify-center bg-transparent text-white p-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse delay-700" />
        <div className="absolute top-1/4 right-1/3 w-64 h-64 bg-fuchsia-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse delay-1000" />
      </div>

      {/* Chat History Button */}
      <motion.button
        onClick={() => setIsChatHistoryModalOpen(true)}
        className="fixed top-6 right-6 p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 hover:border-white/20 transition-all z-50"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <MessageSquare className="w-5 h-5 text-white/70" />
      </motion.button>

      <div className="w-full max-w-4xl mx-auto relative flex flex-col h-screen pb-20">
        {/* Welcome Screen */}
        <AnimatePresence>
          {showWelcomeScreen && <WelcomeScreen />}
        </AnimatePresence>

        {/* Current Chat */}
        <AnimatePresence>
          {!showWelcomeScreen && (
            <ChatContainer
              messages={currentChat}
              chatContainerRef={chatContainerRef as React.RefObject<HTMLDivElement>}
              onViewSources={handleSourcesClick}
            />
          )}
        </AnimatePresence>

        {/* Input Area */}
        <ChatInput
          value={value}
          setValue={setValue}
          attachments={attachments}
          isTyping={isTyping}
          showCommandPalette={showCommandPalette}
          commandSuggestions={commandSuggestions}
          activeSuggestion={activeSuggestion}
          textareaRef={textareaRef as React.RefObject<HTMLTextAreaElement>}
          commandPaletteRef={commandPaletteRef as React.RefObject<HTMLDivElement>}
          adjustHeight={adjustHeight}
          onKeyDown={handleKeyDown}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          onAttachFile={() => setIsFileModalOpen(true)}
          onSendMessage={handleSendMessage}
          onDeleteAttachment={handleDeleteAttachment}
          onSelectCommandSuggestion={handleSelectCommandSuggestion}
        />

        {/* Command Suggestions */}
        <motion.div
          className="flex flex-wrap items-center justify-center gap-2 mt-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {commandSuggestions.map((suggestion, index) => (
            <motion.button
              key={suggestion.prefix}
              onClick={() => handleCommandSuggestionClick(suggestion.prefix)}
              className="flex items-center gap-2 px-3 py-2 bg-white/[0.02] hover:bg-white/[0.05] rounded-xl text-sm text-white/60 hover:text-white/90 transition-all relative group"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              {suggestion.icon}
              <span>{suggestion.label}</span>
            </motion.button>
          ))}
        </motion.div>
      </div>

      {/* Typing Indicator */}
      <AnimatePresence>
        {isTyping && <TypingIndicator />}
      </AnimatePresence>

      {/* Success/Error Messages */}
      <AnimatePresence>
        {recentCommand && (
          <motion.div
            className="fixed bottom-8 backdrop-blur-2xl bg-green-500/10 border border-green-500/20 rounded-full px-4 py-2 shadow-lg z-50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="flex items-center gap-2 text-sm text-green-400">
              <div className="w-1 h-1 bg-green-400 rounded-full"></div>
              <span>{recentCommand}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive Mouse Effect */}
      {inputFocused && (
      <motion.div
        className="fixed rounded-full pointer-events-none z-0 opacity-[0.08] bg-gradient-to-r from-violet-500 via-fuchsia-200 to-indigo-500 blur-[96px]"
        animate={{
          x: mousePosition.x - windowDimensions.width / 2,
          y: mousePosition.y - windowDimensions.height / 2,
        }}
        transition={{
          type: "spring",
          damping: 25,
          stiffness: 150,
          mass: 0.5,
        }}
        style={{
          left: "20%",
          top: "20%",
          width: Math.max(windowDimensions.width, windowDimensions.height) * 1,
          height: Math.max(windowDimensions.width, windowDimensions.height) * 1,
          transform: `translate(-50%, -50%)`,
        }}
        />
      )}

      {/* All Modals */}
      <FileUploadModal
        isOpen={isFileModalOpen}
        onOpenChange={setIsFileModalOpen}
        uploadedFiles={uploadedFiles}
        setUploadedFiles={setUploadedFiles}
        uploadError={uploadError}
        setUploadError={setUploadError}
        onFileUploaded={handleFileUploaded}
      />

      <DeleteConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onOpenChange={(open) => !open && !deleteConfirmation.isDeleting && setDeleteConfirmation({ isOpen: false, fileName: "", index: -1, isDeleting: false })}
        fileName={deleteConfirmation.fileName}
        onConfirm={confirmDeleteAttachment}
        onCancel={cancelDeleteAttachment}
        isDeleting={deleteConfirmation.isDeleting}
      />

      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onOpenChange={setIsFeedbackModalOpen}
        question={feedbackData.question}
        answer={feedbackData.answer}
        comment={feedbackData.comment}
        onSubmit={handleFeedbackSubmit}
        isSubmitting={isSubmittingFeedback}
      />

      <ChatHistoryModal
        isOpen={isChatHistoryModalOpen}
        onOpenChange={setIsChatHistoryModalOpen}
        history={history}
        loading={historyLoading}
        error={historyError}
      />

      <SourcesModal
        isOpen={isSourcesModalOpen}
        onOpenChange={setIsSourcesModalOpen}
        sources={selectedSources}
      />
    </div>
  )
}