"use client"

import { Clock, LoaderIcon, MessageSquare, Star, XIcon } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import { Button } from "@/components/ui/button"
import { MarkdownRenderer } from '../chat/markdown-renderer'
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { useTranslation } from '@/lib/i18n/useTranslation'

interface QAHistoryItem {
  id: string
  question: string
  answer: string
  timestamp: string
  document_ids: string[]
  confidence_score: number
  feedback_rating?: number
}

interface ChatHistoryModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  history: QAHistoryItem[]
  loading: boolean
  error: string | null
}

export function ChatHistoryModal({ isOpen, onOpenChange, history, loading, error }: ChatHistoryModalProps) {
  const { t } = useTranslation()
  
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getConfidenceColor = (score?: number) => {
    if (!score) return "text-white/40"
    if (score >= 0.8) return "text-green-400"
    if (score >= 0.6) return "text-yellow-400"
    return "text-red-400"
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black/95 border border-white/10 text-white max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-white/90 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            {t('chat.historyTitle')}
          </DialogTitle>
          <DialogDescription className="text-white/60">
            {t('chat.historyDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 overflow-y-auto max-h-[60vh] pr-2">
          {loading ? (
            <div className="text-center py-8">
              <LoaderIcon className="w-8 h-8 animate-spin text-white/40 mx-auto mb-3" />
              <p className="text-white/40">{t('chat.loadingHistory')}</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <XIcon className="w-8 h-8 text-red-400 mx-auto mb-3" />
              <p className="text-red-400 mb-2">{t('chat.errorLoadingHistory')}</p>
              <p className="text-white/40 text-sm">{error}</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/40">{t('chat.noChatHistory')}</p>
              <p className="text-white/30 text-sm">{t('chat.noChatHistoryDescription')}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {history.map((item, index) => (
                <motion.div
                  key={item.id}
                  className="bg-white/5 rounded-xl p-4 border border-white/10"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {/* Header with timestamp and confidence */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-xs text-white/50">
                      <Clock className="w-3 h-3" />
                      {formatTimestamp(item.timestamp)}
                    </div>
                    <div className="flex items-center gap-3">
                      {item.confidence_score && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-white/40">Confidence:</span>
                          <span className={cn("text-xs font-medium", getConfidenceColor(item.confidence_score))}>
                            {Math.round(item.confidence_score * 100)}%
                          </span>
                        </div>
                      )}
                      {item.feedback_rating && (
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs text-yellow-400">{item.feedback_rating}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Question */}
                  <div className="mb-3">
                    <div className="text-xs font-medium text-white/60 mb-1">{t('common.question')}:</div>
                    <div className="text-sm text-white/80 bg-white/5 rounded-lg p-2">{item.question}</div>
                  </div>

                  {/* Answer */}
                  <div className="mb-3">
                    <div className="text-xs font-medium text-white/60 mb-1">{t('common.answer')}:</div>
                    <div className="text-sm text-white/80 bg-white/5 rounded-lg p-2 max-h-60 overflow-y-auto">
                      <MarkdownRenderer content={item.answer} />
                    </div>
                  </div>

                  {/* Document IDs if available */}
                  {item.document_ids && item.document_ids.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-white/40">
                      <span>{t('dialog.sources')}:</span>
                      <span>{item.document_ids.length} {t('common.documents')}</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-transparent border-white/10 text-white/70 hover:bg-white/5 hover:text-white hover:border-white/20 transition-all rounded-xl"
          >
            {t('common.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}