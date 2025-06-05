"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import { Button } from "@/components/ui/button"
import { useTranslation } from '@/lib/i18n/useTranslation'

interface Source {
  id: string
  title: string
  content: string
  documentId?: string
  score?: number
}

interface SourcesModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  sources: Source[]
}

export function SourcesModal({ isOpen, onOpenChange, sources }: SourcesModalProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black/95 border border-white/10 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white/90">{t('dialog.sources')}</DialogTitle>
          <DialogDescription className="text-white/60">
            {t('dialog.viewSources')}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          {sources.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-white/40">{t('dialog.noSources')}</p>
            </div>
          ) : (
            sources.map((source, index) => (
              <div key={source.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-white/90">{source.title}</h3>
                  {source.score && (
                    <span className="text-xs text-white/40">
                      Score: {(source.score * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
                <div className="text-sm text-white/70 bg-white/5 rounded-lg p-3 overflow-y-auto">
                  {source.content}
                </div>
                {source.documentId && (
                  <div className="mt-2 text-xs text-white/40">
                    Document ID: {source.documentId}
                  </div>
                )}
              </div>
            ))
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