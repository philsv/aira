"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { LoaderIcon, Paperclip } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { motion } from "framer-motion"
import { useTranslation } from '@/lib/i18n/useTranslation'

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

export function FileUploadModal({
  isOpen,
  onOpenChange,
  uploadedFiles,
  setUploadedFiles,
  uploadError,
  setUploadError,
  onFileUploaded,
}: FileUploadModalProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isLoadingExisting, setIsLoadingExisting] = useState(false)

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const fetchExistingDocuments = async () => {
    setIsLoadingExisting(true)
    try {
      const response = await fetch('/api/documents')
      
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(t('errors.serverError'))
      }

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch documents')
      }
        
      const documents = data.documents || []
      const existingFiles = documents.map((doc: any) => ({
        name: doc.filename,
        size: doc.file_size ? formatFileSize(doc.file_size) : 'Unknown size',
        progress: 100,
        documentId: doc.id,
        status: doc.status
      }))
      
      setUploadedFiles(existingFiles)
      existingFiles.forEach((file: any) => {
        onFileUploaded(file.name)
      })
    } catch (error) {
      console.error('Error fetching existing documents:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setUploadError(t('errors.loadDocumentsFailed', { error: errorMessage }))
    } finally {
      setIsLoadingExisting(false)
    }
  }

  const uploadFileToBackend = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    const newFile = {
      name: file.name,
      size: formatFileSize(file.size),
      progress: 0
    }
    
    setUploadedFiles(prev => [...prev, newFile])

    try {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(t('errors.serverError'))
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
          
          setUploadedFiles(prev => 
            prev.map(f => f.name === file.name ? { 
              ...f, 
              progress: 100,
              documentId: result.document_id,
              status: result.status || 'uploaded'
            } : f)
          )
          
          onFileUploaded(file.name)
          console.log('Document uploaded successfully:', result)
        } else {
          setUploadedFiles(prev => 
            prev.map(f => f.name === file.name ? { ...f, progress } : f)
          )
        }
      }, 150)

    } catch (error) {
      console.error('Upload error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setUploadError(t('errors.uploadFailed', { fileName: file.name, error: errorMessage }))
      
      setUploadedFiles(prev => prev.filter(f => f.name !== file.name))
    }
  }

  const validateAndUploadFiles = async (files: File[]) => {
    const invalidFiles = files.filter(
      (file) => !file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf"),
    )

    if (invalidFiles.length > 0) {
      setUploadError(t('errors.invalidFileType', { 
        files: invalidFiles.map((f) => f.name).join(", ") 
      }))
      return false
    }

    for (const file of files) {
      await uploadFileToBackend(file)
    }
    return true
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null)

    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files)
      const success = await validateAndUploadFiles(files)
      
      if (!success && fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setUploadError(null)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files)
      await validateAndUploadFiles(files)
    }
  }

  const checkProcessingStatus = async () => {
    const processingFiles = uploadedFiles.filter(
      file => file.documentId && file.status === 'PROCESSING'
    )

    for (const file of processingFiles) {
      try {
        const response = await fetch(`/api/documents/${file.documentId}/status`)
        if (response.ok) {
          const statusData = await response.json()
          
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

  // Fetch existing documents when modal opens
  useEffect(() => {
    if (isOpen && uploadedFiles.length === 0) {
      fetchExistingDocuments()
    }
  }, [isOpen])

  // Handle global drag and drop
  useEffect(() => {
    const handleGlobalDragOver = (e: DragEvent) => {
      if (isOpen) e.preventDefault()
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

  // Poll for processing status updates
  useEffect(() => {
    if (!isOpen) return

    const hasProcessingFiles = uploadedFiles.some(
      file => file.status === 'PROCESSING'
    )

    if (hasProcessingFiles) {
      const interval = setInterval(checkProcessingStatus, 3000)
      return () => clearInterval(interval)
    }
  }, [isOpen, uploadedFiles])

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black/95 border border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white/90">{t('fileUpload.title')}</DialogTitle>
          <DialogDescription className="text-white/60">
            {t('fileUpload.description')}
          </DialogDescription>
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
                {t('fileUpload.clickToBrowse')}
              </button>{" "}
              {t('fileUpload.dragAndDrop')}
            </p>
            <p className="text-xs text-white/40 mt-1">{t('fileUpload.pdfOnly')}</p>
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
            <span className="text-sm">{t('fileUpload.loadingExisting')}</span>
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
              {uploadedFiles.some(f => f.progress < 100) ? t('fileUpload.uploadingFiles') : t('fileUpload.availableFiles')}
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
            {t('common.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}