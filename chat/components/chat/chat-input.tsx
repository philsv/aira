"use client"

import { AnimatePresence, motion } from "framer-motion"
import { LoaderIcon, Paperclip, SendIcon, XIcon } from "lucide-react"

import { Textarea } from '@/components/ui/textarea'
import { cn } from "@/lib/utils"
import { useTranslation } from '@/lib/i18n/useTranslation'

interface CommandSuggestion {
  icon: React.ReactNode
  label: string
  description: string
  prefix: string
}

interface ChatInputProps {
  value: string
  setValue: (value: string) => void
  attachments: string[]
  isTyping: boolean
  showCommandPalette: boolean
  commandSuggestions: CommandSuggestion[]
  activeSuggestion: number
  textareaRef: React.RefObject<HTMLTextAreaElement>
  commandPaletteRef: React.RefObject<HTMLDivElement>
  adjustHeight: (reset?: boolean) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onFocus: () => void
  onBlur: () => void
  onAttachFile: () => void
  onSendMessage: () => void
  onDeleteAttachment: (index: number, fileName: string) => void
  onSelectCommandSuggestion: (index: number) => void
}

export function ChatInput({
  value,
  setValue,
  attachments,
  isTyping,
  showCommandPalette,
  commandSuggestions,
  activeSuggestion,
  textareaRef,
  commandPaletteRef,
  adjustHeight,
  onKeyDown,
  onFocus,
  onBlur,
  onAttachFile,
  onSendMessage,
  onDeleteAttachment,
  onSelectCommandSuggestion,
}: ChatInputProps) {
  const { t } = useTranslation()

  return (
    <motion.div
      className="relative backdrop-blur-2xl bg-white/[0.02] rounded-2xl border border-white/[0.05] shadow-2xl"
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
                  onClick={() => onSelectCommandSuggestion(index)}
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
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={t('chat.placeholder')}
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
                  onClick={() => onDeleteAttachment(index, file)}
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
            onClick={onAttachFile}
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
          onClick={onSendMessage}
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
          <span>{t('chat.send')}</span>
        </motion.button>
      </div>
    </motion.div>
  )
}