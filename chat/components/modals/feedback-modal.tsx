"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { LoaderIcon, Star } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useTranslation } from '@/lib/i18n/useTranslation'

interface FeedbackModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  question: string
  answer: string
  comment: string
  onSubmit: (rating: number, is_helpful: boolean) => void
  isSubmitting: boolean
}

export function FeedbackModal({
  isOpen,
  onOpenChange,
  question,
  answer,
  comment,
  onSubmit,
  isSubmitting,
}: FeedbackModalProps) {
  const { t } = useTranslation()
  const [rating, setRating] = useState(0)
  const [is_helpful, setHelpful] = useState<boolean | null>(null)
  const [hoveredStar, setHoveredStar] = useState(0)

  const handleSubmit = () => {
    if (rating > 0 && is_helpful !== null) {
      onSubmit(rating, is_helpful)
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
          <DialogTitle className="text-white/90">{t('feedback.title')}</DialogTitle>
          <DialogDescription className="text-white/60">
            {t('feedback.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          {/* Previous Question */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-white/70">{t('feedback.yourQuestion')}</h3>
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-sm text-white/80">{question}</p>
            </div>
          </div>

          {/* AI Answer */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-white/70">{t('feedback.aiAnswer')}</h3>
            <div className="bg-white/5 rounded-xl p-3 max-h-32 overflow-y-auto">
              <p className="text-sm text-white/80">{answer}</p>
            </div>
          </div>

          {/* User Comment */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-white/70">{t('feedback.yourFeedback')}</h3>
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-sm text-white/80">{comment}</p>
            </div>
          </div>

          {/* Rating */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-white/70">{t('feedback.rating')}</h3>
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
            <h3 className="text-sm font-medium text-white/70">{t('feedback.helpful')}</h3>
            <div className="flex gap-3">
              <button
                onClick={() => setHelpful(true)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                  is_helpful === true
                    ? "bg-green-600 text-white"
                    : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white",
                )}
              >
                {t('feedback.yesHelpful')}
              </button>
              <button
                onClick={() => setHelpful(false)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                  is_helpful === false
                    ? "bg-red-600 text-white"
                    : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white",
                )}
              >
                {t('feedback.notHelpful')}
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
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || is_helpful === null || isSubmitting}
            className={cn(
              "transition-all rounded-xl",
              rating > 0 && is_helpful !== null
                ? "bg-violet-600 hover:bg-violet-700 text-white"
                : "bg-white/5 text-white/40 cursor-not-allowed",
            )}
          >
            {isSubmitting ? (
              <>
                <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
                {t('feedback.submitting')}
              </>
            ) : (
              t('feedback.submitFeedback')
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}