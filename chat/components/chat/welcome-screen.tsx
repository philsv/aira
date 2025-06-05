"use client"

import { motion } from "framer-motion"
import { useTranslation } from '@/lib/i18n/useTranslation'

export function WelcomeScreen() {
  const { t } = useTranslation()

  return (
    <motion.div
      className="flex-1 flex items-center justify-center mb-auto"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="relative z-10 space-y-4 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="space-y-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-block"
          >
            <h1 className="text-3xl font-medium tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white/90 to-white/40 pb-1">
              {t('chat.welcome')}
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
            {t('chat.welcomeSubtitle')}
          </motion.p>
        </div>
      </motion.div>
    </motion.div>
  )
}