'use client'

import { useState, useEffect } from 'react'
import { getTranslations, getDefaultLanguage, interpolate, getNestedTranslation, type Language } from './index'
import type { TranslationKeys } from './languages/en'

export function useTranslation() {
  const [language, setLanguage] = useState<Language>(getDefaultLanguage())
  const [translations, setTranslations] = useState<TranslationKeys>(getTranslations(language))

  useEffect(() => {
    setTranslations(getTranslations(language))
  }, [language])

  const t = (key: string, values?: Record<string, string>): string => {
    const translation = getNestedTranslation(translations, key)
    return values ? interpolate(translation, values) : translation
  }

  return {
    t,
    language,
    setLanguage,
    translations,
  }
}