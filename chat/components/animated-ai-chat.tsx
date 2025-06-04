"use client"

import * as React from "react"

import { AnimatePresence, motion } from "framer-motion"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { LoaderIcon, Paperclip, SendIcon, Sparkles, Star, XIcon } from "lucide-react"
import { useCallback, useEffect, useRef, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { useState } from "react"

interface UseAutoResizeTextareaProps {
  minHeight: number
  maxHeight?: number
}

function useAutoResizeTextarea({ minHeight, maxHeight }: UseAutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current
      if (!textarea) return

      if (reset) {
        textarea.style.height = `${minHeight}px`
        return
      }

      textarea.style.height = `${minHeight}px`
      const newHeight = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight ?? Number.POSITIVE_INFINITY))

      textarea.style.height = `${newHeight}px`
    },
    [minHeight, maxHeight],
  )

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = `${minHeight}px`
    }
  }, [minHeight])

  useEffect(() => {
    const handleResize = () => adjustHeight()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [adjustHeight])

  return { textareaRef, adjustHeight }
}

interface CommandSuggestion {
  icon: React.ReactNode
  label: string
  description: string
  prefix: string
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  containerClassName?: string
  showRing?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, containerClassName, showRing = true, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false)

    return (
      <div className={cn("relative", containerClassName)}>
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
            "transition-all duration-200 ease-in-out",
            "placeholder:text-muted-foreground",
            "disabled:cursor-not-allowed disabled:opacity-50",
            showRing ? "focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0" : "",
            className,
          )}
          ref={ref}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />

        {showRing && isFocused && (
          <motion.span
            className="absolute inset-0 rounded-md pointer-events-none ring-2 ring-offset-0 ring-blue-500/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}

        {props.onChange && (
          <div
            className="absolute bottom-2 right-2 opacity-0 w-2 h-2 bg-blue-500 rounded-full"
            style={{
              animation: "none",
            }}
            id="textarea-ripple"
          />
        )}
      </div>
    )
  },
)
Textarea.displayName = "Textarea"

interface FileUploadModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  uploadedFiles: Array<{ 
    name: string
    size: string
    progress: number
    documentId?: string
    status?: string
  }>
  setUploadedFiles: React.Dispatch<React.SetStateAction<Array<{ 
    name: string
    size: string
    progress: number
    documentId?: string
    status?: string
  }>>>
  uploadError: string | null
  setUploadError: React.Dispatch<React.SetStateAction<string | null>>
  onFileUploaded: (fileName: string) => void
}

function FileUploadModal({
  isOpen,
  onOpenChange,
  uploadedFiles,
  setUploadedFiles,
  uploadError,
  setUploadError,
  onFileUploaded,
}: FileUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isLoadingExisting, setIsLoadingExisting] = useState(false)

  // Fetch existing documents when modal opens (only if not already loaded)
  useEffect(() => {
    if (isOpen && uploadedFiles.length === 0) {
      fetchExistingDocuments()
    }
  }, [isOpen])

  const fetchExistingDocuments = async () => {
    setIsLoadingExisting(true)
    try {
      const response = await fetch('/api/documents')
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response:', text)
        throw new Error('Server returned invalid response format')
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch documents')
      }
        
      // The backend returns { documents: [...] } based on server.py
      const documents = data.documents || []
      
      // Convert backend document format to UI format
      const existingFiles = documents.map((doc: any) => ({
        name: doc.filename,
        size: doc.file_size ? formatFileSize(doc.file_size) : 'Unknown size',
        progress: 100, // Existing files are already uploaded
        documentId: doc.id,
        status: doc.status
      }))
      
      setUploadedFiles(existingFiles)
      
      // Add existing files to attachments
      existingFiles.forEach((file: any) => {
        onFileUploaded(file.name)
      })
    } catch (error) {
      console.error('Error fetching existing documents:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setUploadError(`Failed to load existing documents: ${errorMessage}`)
    } finally {
      setIsLoadingExisting(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const uploadFileToBackend = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    // Add file to UI with 0% progress
    const newFile = {
      name: file.name,
      size: file.size < 1024 * 1024 
        ? `${(file.size / 1024).toFixed(1)} KB`
        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      progress: 0
    }
    
    setUploadedFiles(prev => [...prev, newFile])

    try {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      // Check if response is JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response:', text)
        throw new Error('Server returned invalid response format')
      }

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || result.detail || 'Upload failed')
      }
      
      // Simulate progress animation
      let progress = 0
      const interval = setInterval(() => {
        progress += Math.random() * 20 + 10
        if (progress >= 100) {
          progress = 100
          clearInterval(interval)
          
          // Update file with complete information from backend
          setUploadedFiles(prev => 
            prev.map(f => f.name === file.name ? { 
              ...f, 
              progress: 100,
              documentId: result.document_id,
              status: result.status || 'uploaded'
            } : f)
          )
          
          // Add to attachments when upload is complete
          onFileUploaded(file.name)
          
          console.log('Document uploaded successfully:', result)
        } else {
          // Update progress
          setUploadedFiles(prev => 
            prev.map(f => f.name === file.name ? { ...f, progress } : f)
          )
        }
      }, 150)

    } catch (error) {
      console.error('Upload error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setUploadError(`Failed to upload ${file.name}: ${errorMessage}`)
      
      // Remove failed file from the list
      setUploadedFiles(prev => prev.filter(f => f.name !== file.name))
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null)

    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files)

      // Validate file types - only allow PDFs
      const invalidFiles = files.filter(
        (file) => !file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf"),
      )

      if (invalidFiles.length > 0) {
        setUploadError(`Only PDF files are allowed. Invalid files: ${invalidFiles.map((f) => f.name).join(", ")}`)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
        return
      }

      // Upload files to backend
      for (const file of files) {
        await uploadFileToBackend(file)
      }
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setUploadError(null)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files)

      const invalidFiles = files.filter(
        (file) => !file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf"),
      )

      if (invalidFiles.length > 0) {
        setUploadError(`Only PDF files are allowed. Invalid files: ${invalidFiles.map((f) => f.name).join(", ")}`)
        return
      }

      // Upload files to backend
      for (const file of files) {
        await uploadFileToBackend(file)
      }
    }
  }

  useEffect(() => {
    const handleGlobalDragOver = (e: DragEvent) => {
      if (isOpen) {
        e.preventDefault()
      }
    }

    const handleGlobalDrop = (e: DragEvent) => {
      if (isOpen) {
        e.preventDefault()
        handleDrop(e as any)
      }
    }

    if (isOpen) {
      document.addEventListener("dragover", handleGlobalDragOver)
      document.addEventListener("drop", handleGlobalDrop)
    }

    return () => {
      document.removeEventListener("dragover", handleGlobalDragOver)
      document.removeEventListener("drop", handleGlobalDrop)
    }
  }, [isOpen])

  // Check status of processing documents
  const checkProcessingStatus = async () => {
    const processingFiles = uploadedFiles.filter(
      file => file.documentId && file.status === 'PROCESSING'
    )

    for (const file of processingFiles) {
      try {
        const response = await fetch(`/api/documents/${file.documentId}/status`)
        if (response.ok) {
          const statusData = await response.json()
          
          // Update file status if it has changed
          if (statusData.status !== file.status) {
            setUploadedFiles(prev => 
              prev.map(f => 
                f.documentId === file.documentId 
                  ? { ...f, status: statusData.status }
                  : f
              )
            )
          }
        }
      } catch (error) {
        console.error(`Error checking status for ${file.name}:`, error)
      }
    }
  }

  // Poll for processing status updates
  useEffect(() => {
    if (!isOpen) return

    const hasProcessingFiles = uploadedFiles.some(
      file => file.status === 'PROCESSING'
    )

    if (hasProcessingFiles) {
      const interval = setInterval(checkProcessingStatus, 3000) // Check every 3 seconds
      return () => clearInterval(interval)
    }
  }, [isOpen, uploadedFiles])

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black/95 border border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white/90">Upload Files</DialogTitle>
          <DialogDescription className="text-white/60">Upload PDF files to attach to your message</DialogDescription>
        </DialogHeader>

        <div className="mt-4 border-2 border-dashed border-white/10 hover:border-white/20 rounded-xl p-8 text-center transition-colors">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            multiple
            accept=".pdf,application/pdf"
          />

          <div className="flex flex-col items-center justify-center gap-2">
            <div className="p-3 bg-white/5 rounded-full">
              <Paperclip className="w-6 h-6 text-white/60" />
            </div>
            <p className="text-sm text-white/70">
              <button
                className="text-violet-400 hover:text-violet-300 transition-colors underline"
                onClick={() => fileInputRef.current?.click()}
              >
                Click to browse
              </button>{" "}
              or drag and drop files here
            </p>
            <p className="text-xs text-white/40 mt-1">Only PDF files are supported</p>
          </div>
        </div>

        {uploadError && (
          <motion.div
            className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <p className="text-sm text-red-400">{uploadError}</p>
          </motion.div>
        )}

        {isLoadingExisting && (
          <motion.div
            className="mt-4 flex items-center justify-center gap-2 text-white/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <LoaderIcon className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading existing files...</span>
          </motion.div>
        )}

        {uploadedFiles.length > 0 && (
          <motion.div
            className="mt-4 space-y-3 max-h-60 overflow-y-auto pr-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="text-sm font-medium text-white/70">
              {uploadedFiles.some(f => f.progress < 100) ? 'Uploading Files' : 'Available Files'}
            </h3>

            {uploadedFiles.map((file, index) => (
              <motion.div
                key={`${file.name}-${index}`}
                className="bg-white/5 rounded-xl p-3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-red-500/20 rounded-lg flex items-center justify-center">
                      <span className="text-xs font-medium text-red-300">PDF</span>
                    </div>
                    <span className="text-sm text-white/80 truncate max-w-[180px]">{file.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/40">{file.size}</span>
                  </div>
                </div>

                <Progress
                  value={file.progress}
                  className="h-1 bg-white/10"
                  indicatorClassName={file.progress === 100 ? "bg-green-500" : "bg-violet-500"}
                />

                {file.progress === 100 && (
                  <motion.div
                    className="flex justify-between items-center mt-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <span className="text-xs text-green-500 flex items-center gap-1">
                      <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                      {file.status === 'PROCESSED' ? 'Processed' : 
                       file.status === 'PROCESSING' ? 'Processing' : 
                       file.status === 'ERROR' ? 'Error' : 'Uploaded'}
                    </span>
                    {file.documentId && (
                      <span className="text-xs text-white/40">ID: {file.documentId.slice(0, 8)}...</span>
                    )}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
              setUploadError(null)
            }}
            className="bg-transparent border-white/10 text-white/70 hover:bg-white/5 hover:text-white hover:border-white/20 transition-all rounded-xl"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface FeedbackModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  question: string
  answer: string
  comment: string
  onSubmit: (rating: number, helpful: boolean) => void
  isSubmitting: boolean
}

function FeedbackModal({
  isOpen,
  onOpenChange,
  question,
  answer,
  comment,
  onSubmit,
  isSubmitting,
}: FeedbackModalProps) {
  const [rating, setRating] = useState(0)
  const [helpful, setHelpful] = useState<boolean | null>(null)
  const [hoveredStar, setHoveredStar] = useState(0)

  const handleSubmit = () => {
    if (rating > 0 && helpful !== null) {
      onSubmit(rating, helpful)
    }
  }

  const resetForm = () => {
    setRating(0)
    setHelpful(null)
    setHoveredStar(0)
  }

  useEffect(() => {
    if (!isOpen) {
      resetForm()
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black/95 border border-white/10 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white/90">Submit Feedback</DialogTitle>
          <DialogDescription className="text-white/60">
            Please rate your experience and let us know if the AI answer was helpful
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          {/* Previous Question */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-white/70">Your Question:</h3>
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-sm text-white/80">{question}</p>
            </div>
          </div>

          {/* AI Answer */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-white/70">AI Answer:</h3>
            <div className="bg-white/5 rounded-xl p-3 max-h-32 overflow-y-auto">
              <p className="text-sm text-white/80">{answer}</p>
            </div>
          </div>

          {/* User Comment */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-white/70">Your Feedback:</h3>
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-sm text-white/80">{comment}</p>
            </div>
          </div>

          {/* Rating */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-white/70">Rate your experience (1-5 stars):</h3>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className="p-1 transition-colors rounded-lg"
                >
                  <Star
                    className={cn(
                      "w-6 h-6 transition-colors",
                      hoveredStar >= star || rating >= star
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-white/30 hover:text-white/50",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Helpful Question */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-white/70">Was the AI answer helpful?</h3>
            <div className="flex gap-3">
              <button
                onClick={() => setHelpful(true)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                  helpful === true
                    ? "bg-green-600 text-white"
                    : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white",
                )}
              >
                Yes, helpful
              </button>
              <button
                onClick={() => setHelpful(false)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                  helpful === false
                    ? "bg-red-600 text-white"
                    : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white",
                )}
              >
                No, not helpful
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="bg-transparent border-white/10 text-white/70 hover:bg-white/5 hover:text-white hover:border-white/20 transition-all rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || helpful === null || isSubmitting}
            className={cn(
              "transition-all rounded-xl",
              rating > 0 && helpful !== null
                ? "bg-violet-600 hover:bg-violet-700 text-white"
                : "bg-white/5 text-white/40 cursor-not-allowed",
            )}
          >
            {isSubmitting ? (
              <>
                <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Feedback"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function AnimatedAIChat() {
  const [value, setValue] = useState("")
  const [attachments, setAttachments] = useState<string[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [activeSuggestion, setActiveSuggestion] = useState<number>(-1)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [recentCommand, setRecentCommand] = useState<string | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 60,
    maxHeight: 200,
  })
  const [inputFocused, setInputFocused] = useState(false)
  const commandPaletteRef = useRef<HTMLDivElement>(null)

  const [isFileModalOpen, setIsFileModalOpen] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ 
    name: string
    size: string
    progress: number
    documentId?: string
    status?: string
  }>>([])
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; fileName: string; index: number }>({
    isOpen: false,
    fileName: "",
    index: -1,
  })

  // Chat history and feedback state
  const [chatHistory, setChatHistory] = useState<Array<{ question: string; answer: string }>>([])
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false)
  const [feedbackData, setFeedbackData] = useState<{ question: string; answer: string; comment: string }>({
    question: "",
    answer: "",
    comment: "",
  })
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)

  const commandSuggestions: CommandSuggestion[] = [
    {
      icon: <Sparkles className="w-4 h-4" />,
      label: "Submit Feedback",
      description: "Submit feedback or suggestions",
      prefix: "/feedback",
    },
  ]

  useEffect(() => {
    if (value.startsWith("/") && !value.includes(" ")) {
      setShowCommandPalette(true)

      const matchingSuggestionIndex = commandSuggestions.findIndex((cmd) => cmd.prefix.startsWith(value))

      if (matchingSuggestionIndex >= 0) {
        setActiveSuggestion(matchingSuggestionIndex)
      } else {
        setActiveSuggestion(-1)
      }
    } else {
      setShowCommandPalette(false)
    }
  }, [value])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      const commandButton = document.querySelector("[data-command-button]")

      if (
        commandPaletteRef.current &&
        !commandPaletteRef.current.contains(target) &&
        !commandButton?.contains(target)
      ) {
        setShowCommandPalette(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

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
        
        // Convert backend document format to UI format
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
        
        // Add existing files to attachments
        const existingFileNames = existingFiles.map((file: any) => file.name)
        setAttachments(existingFileNames)
        
      } catch (error) {
        console.error('Error fetching existing documents on mount:', error)
      }
    }

    fetchExistingDocumentsOnMount()
  }, [])

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

  const handleSendMessage = () => {
    if (value.trim()) {
      // Check if it's a feedback command
      if (value.startsWith("/feedback ")) {
        const feedbackComment = value.replace("/feedback ", "").trim()

        if (feedbackComment && chatHistory.length > 0) {
          // Get the last Q&A from chat history
          const lastChat = chatHistory[chatHistory.length - 1]

          setFeedbackData({
            question: lastChat.question,
            answer: lastChat.answer,
            comment: feedbackComment || "",  // Allow empty comment
          })

          setIsFeedbackModalOpen(true)
          setValue("")
          adjustHeight(true)
          return
        } else {
          // Show message if no chat history exists
          setRecentCommand("No previous conversation found for feedback.")
          setTimeout(() => setRecentCommand(null), 3000)
          setValue("")
          adjustHeight(true)
          return
        }
      }

      startTransition(() => {
        setIsTyping(true)

        // Store the question
        const currentQuestion = value.trim()

        setTimeout(() => {
          setIsTyping(false)

          // Simulate AI response
          const aiResponse =
            "Thank you for your question! This is a simulated AI response. In a real implementation, this would be generated by an AI model based on your input."

          // Add to chat history
          setChatHistory((prev) => [...prev, { question: currentQuestion, answer: aiResponse }])

          setValue("")
          adjustHeight(true)
        }, 3000)
      })
    }
  }

  const handleAttachFile = () => {
    setIsFileModalOpen(true)
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const selectCommandSuggestion = (index: number) => {
    const selectedCommand = commandSuggestions[index]
    setValue(selectedCommand.prefix + " ")
    setShowCommandPalette(false)

    setRecentCommand(selectedCommand.label)
    setTimeout(() => setRecentCommand(null), 2000)
  }

  const handleFileUploaded = (fileName: string) => {
    setAttachments((prev) => [...prev, fileName])
  }

  const handleDeleteAttachment = async (index: number, fileName: string) => {
    // Find the file in uploadedFiles to get the documentId
    const fileToDelete = uploadedFiles.find(file => file.name === fileName)
    
    if (fileToDelete && fileToDelete.documentId) {
      // If it has a documentId, delete from backend first
      try {
        const response = await fetch(`/api/documents/${fileToDelete.documentId}`, {
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
        setUploadedFiles(prev => prev.filter(file => file.documentId !== fileToDelete.documentId))
      } catch (error) {
        console.error('Error deleting document:', error)
        setUploadError(`Failed to delete ${fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        return // Don't proceed with UI deletion if backend deletion failed
      }
    }

    // Remove from attachments
    setDeleteConfirmation({
      isOpen: true,
      fileName,
      index,
    })
  }

  const confirmDeleteAttachment = () => {
    if (deleteConfirmation.index >= 0) {
      const fileToDelete = attachments[deleteConfirmation.index]

      // Remove from attachments
      removeAttachment(deleteConfirmation.index)

      // Also remove from uploaded files list
      setUploadedFiles((prev) => prev.filter((file) => file.name !== fileToDelete))
    }
    setDeleteConfirmation({ isOpen: false, fileName: "", index: -1 })
  }

  const cancelDeleteAttachment = () => {
    setDeleteConfirmation({ isOpen: false, fileName: "", index: -1 })
  }

  const handleFeedbackSubmit = async (rating: number, helpful: boolean) => {
    setIsSubmittingFeedback(true)

    try {
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
          helpful,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log("Feedback submitted successfully:", result)
        setIsFeedbackModalOpen(false)

        // Show success message (you could add a toast notification here)
        setRecentCommand("Feedback submitted successfully!")
        setTimeout(() => setRecentCommand(null), 3000)
      } else {
        throw new Error("Failed to submit feedback")
      }
    } catch (error) {
      console.error("Error submitting feedback:", error)
      // Show error message (you could add a toast notification here)
      setRecentCommand("Failed to submit feedback. Please try again.")
      setTimeout(() => setRecentCommand(null), 3000)
    } finally {
      setIsSubmittingFeedback(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col w-full items-center justify-center bg-transparent text-white p-6 relative overflow-hidden">
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse delay-700" />
        <div className="absolute top-1/4 right-1/3 w-64 h-64 bg-fuchsia-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse delay-1000" />
      </div>
      <div className="w-full max-w-2xl mx-auto relative">
        <motion.div
          className="relative z-10 space-y-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="text-center space-y-3">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-block"
            >
              <h1 className="text-3xl font-medium tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white/90 to-white/40 pb-1">
                How can I help?
              </h1>
              <motion.div
                className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "100%", opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              />
            </motion.div>
            <motion.p
              className="text-sm text-white/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Type your question below and I will do my best to assist you.
            </motion.p>
          </div>

          <motion.div
            className="relative backdrop-blur-2xl bg-white/[0.02] rounded-xl border border-white/[0.05] shadow-2xl"
            initial={{ scale: 0.98 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <AnimatePresence>
              {showCommandPalette && (
                <motion.div
                  ref={commandPaletteRef}
                  className="absolute left-4 right-4 bottom-full mb-2 backdrop-blur-xl bg-black/90 rounded-xl z-50 shadow-lg border border-white/10 overflow-hidden"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="py-1 bg-black/95">
                    {commandSuggestions.map((suggestion, index) => (
                      <motion.div
                        key={suggestion.prefix}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 text-xs transition-colors cursor-pointer",
                          activeSuggestion === index ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5",
                        )}
                        onClick={() => selectCommandSuggestion(index)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <div className="w-5 h-5 flex items-center justify-center text-white/60">{suggestion.icon}</div>
                        <div className="font-medium">{suggestion.label}</div>
                        <div className="text-white/40 text-xs ml-1">{suggestion.prefix}</div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="p-4">
              <Textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value)
                  adjustHeight()
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder="Ask aira a question..."
                containerClassName="w-full"
                className={cn(
                  "w-full px-4 py-3",
                  "resize-none",
                  "bg-transparent",
                  "border-none",
                  "text-white/90 text-sm",
                  "focus:outline-none",
                  "placeholder:text-white/40",
                  "min-h-[60px]",
                )}
                style={{
                  overflow: "hidden",
                }}
                showRing={false}
              />
            </div>

            <AnimatePresence>
              {attachments.length > 0 && (
                <motion.div
                  className="px-4 pb-3 flex gap-2 flex-wrap"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {attachments.map((file, index) => (
                    <motion.div
                      key={index}
                      className="flex items-center gap-2 text-xs bg-white/[0.03] py-1.5 px-3 rounded-xl text-white/70"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                    >
                      <span>{file}</span>
                      <button
                        onClick={() => handleDeleteAttachment(index, file)}
                        className="text-white/40 hover:text-white transition-colors rounded-full p-0.5"
                      >
                        <XIcon className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="p-4 border-t border-white/[0.05] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <motion.button
                  type="button"
                  onClick={handleAttachFile}
                  whileTap={{ scale: 0.94 }}
                  className="p-2 text-white/40 hover:text-white/90 rounded-xl transition-colors relative group"
                >
                  <Paperclip className="w-4 h-4" />
                  <motion.span
                    className="absolute inset-0 bg-white/[0.05] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                    layoutId="button-highlight"
                  />
                </motion.button>
              </div>

              <motion.button
                type="button"
                onClick={handleSendMessage}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                disabled={isTyping || !value.trim()}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                  "flex items-center gap-2",
                  value.trim() ? "bg-white text-[#0A0A0B] shadow-lg shadow-white/10" : "bg-white/[0.05] text-white/40",
                )}
              >
                {isTyping ? (
                  <LoaderIcon className="w-4 h-4 animate-[spin_2s_linear_infinite]" />
                ) : (
                  <SendIcon className="w-4 h-4" />
                )}
                <span>Send</span>
              </motion.button>
            </div>
          </motion.div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {commandSuggestions.map((suggestion, index) => (
              <motion.button
                key={suggestion.prefix}
                onClick={() => selectCommandSuggestion(index)}
                className="flex items-center gap-2 px-3 py-2 bg-white/[0.02] hover:bg-white/[0.05] rounded-xl text-sm text-white/60 hover:text-white/90 transition-all relative group"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {suggestion.icon}
                <span>{suggestion.label}</span>
                <motion.div
                  className="absolute inset-0 border border-white/[0.05] rounded-xl"
                  initial={false}
                  animate={{
                    opacity: [0, 1],
                    scale: [0.98, 1],
                  }}
                  transition={{
                    duration: 0.3,
                    ease: "easeOut",
                  }}
                />
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {isTyping && (
          <motion.div
            className="fixed bottom-8 left-1/2 mx-auto transform -translate-x-1/2 backdrop-blur-2xl bg-white/[0.02] rounded-full px-4 py-2 shadow-lg border border-white/[0.05]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-7 rounded-full bg-white/[0.05] flex items-center justify-center text-center">
                <span className="text-xs font-medium text-white/90 mb-0.5">zap</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/70">
                <span>Thinking</span>
                <TypingDots />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {recentCommand && (
          <motion.div
            className="fixed bottom-20 left-1/2 mx-auto transform -translate-x-1/2 backdrop-blur-2xl bg-green-500/10 border border-green-500/20 rounded-full px-4 py-2 shadow-lg"
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

      {inputFocused && (
        <motion.div
          className="fixed w-[50rem] h-[50rem] rounded-full pointer-events-none z-0 opacity-[0.05] bg-gradient-to-r from-blue-500 via-fuchsia-500 to-indigo-500 blur-[96px]"
          animate={{
            x: mousePosition.x - 400,
            y: mousePosition.y - 400,
          }}
          transition={{
            type: "spring",
            damping: 25,
            stiffness: 150,
            mass: 0.5,
          }}
        />
      )}

      <FileUploadModal
        isOpen={isFileModalOpen}
        onOpenChange={setIsFileModalOpen}
        uploadedFiles={uploadedFiles}
        setUploadedFiles={setUploadedFiles}
        uploadError={uploadError}
        setUploadError={setUploadError}
        onFileUploaded={handleFileUploaded}
      />

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteConfirmation.isOpen} onOpenChange={(open) => !open && cancelDeleteAttachment()}>
        <DialogContent className="bg-black/95 border border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white/90">Delete File</DialogTitle>
            <DialogDescription className="text-white/60">
              Are you sure you want to remove "{deleteConfirmation.fileName}" from your attachments?
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={cancelDeleteAttachment}
              className="bg-transparent border-white/10 text-white/70 hover:bg-white/5 hover:text-white hover:border-white/20 transition-all rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteAttachment}
              className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 rounded-xl"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onOpenChange={setIsFeedbackModalOpen}
        question={feedbackData.question}
        answer={feedbackData.answer}
        comment={feedbackData.comment}
        onSubmit={handleFeedbackSubmit}
        isSubmitting={isSubmittingFeedback}
      />
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex items-center ml-1">
      {[1, 2, 3].map((dot) => (
        <motion.div
          key={dot}
          className="w-1.5 h-1.5 bg-white/90 rounded-full mx-0.5"
          initial={{ opacity: 0.3 }}
          animate={{
            opacity: [0.3, 0.9, 0.3],
            scale: [0.85, 1.1, 0.85],
          }}
          transition={{
            duration: 1.2,
            repeat: Number.POSITIVE_INFINITY,
            delay: dot * 0.15,
            ease: "easeInOut",
          }}
          style={{
            boxShadow: "0 0 4px rgba(255, 255, 255, 0.3)",
          }}
        />
      ))}
    </div>
  )
}

const rippleKeyframes = `
@keyframes ripple {
  0% { transform: scale(0.5); opacity: 0.6; }
  100% { transform: scale(2); opacity: 0; }
}
`

if (typeof document !== "undefined") {
  const style = document.createElement("style")
  style.innerHTML = rippleKeyframes
  document.head.appendChild(style)
}
