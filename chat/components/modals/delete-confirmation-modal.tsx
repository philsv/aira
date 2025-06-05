"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import { Button } from "@/components/ui/button"
import { LoaderIcon } from "lucide-react"
import { useTranslation } from '@/lib/i18n/useTranslation'

interface DeleteConfirmationModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  fileName: string
  onConfirm: () => void
  onCancel: () => void
  isDeleting?: boolean
}

export function DeleteConfirmationModal({
  isOpen,
  onOpenChange,
  fileName,
  onConfirm,
  onCancel,
  isDeleting = false,
}: DeleteConfirmationModalProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black/95 border border-white/10 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white/90">{t('deleteConfirmation.title')}</DialogTitle>
          <DialogDescription className="text-white/60">
            {t('deleteConfirmation.description', { fileName })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isDeleting}
            className="bg-transparent border-white/10 text-white/70 hover:bg-white/5 hover:text-white hover:border-white/20 transition-all rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white transition-all rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isDeleting && <LoaderIcon className="w-4 h-4 animate-spin" />}
            {isDeleting ? 'Deleting...' : t('common.delete')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}