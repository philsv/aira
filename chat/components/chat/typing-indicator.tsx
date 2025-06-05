"use client"

import { motion } from "framer-motion"
import { useTranslation } from '@/lib/i18n/useTranslation'

export function TypingIndicator() {
  const { t } = useTranslation()

  return (
    <motion.div
      className="fixed bottom-8 mx-auto transform -translate-x-1/2 backdrop-blur-2xl bg-white/[0.02] rounded-full px-4 py-2 shadow-lg border border-white/[0.05]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-7 rounded-full bg-white/[0.05] flex items-center justify-center text-center">
          <span className="text-xs font-medium text-white/90 mb-0.5">aira</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-white/70">
          <span>{t('chat.thinking')}</span>
        </div>
      </div>
    </motion.div>
  )
}

export function TypingDots() {
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