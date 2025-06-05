import type { TranslationKeys } from './languages/en'
import { de } from './languages/de'
import { en } from './languages/en'

export type Language = 'en' | 'de'

const translations: Record<Language, TranslationKeys> = {
  en,
  de,
}

// Get language from environment variable or default to English
export function getDefaultLanguage(): Language {
  const envLanguage = process.env.NEXT_PUBLIC_UI_LANGUAGE as Language
  return envLanguage && envLanguage in translations ? envLanguage : 'de'
}

export function getTranslations(language: Language = getDefaultLanguage()): TranslationKeys {
  return translations[language] || translations.en
}

// Helper function to replace placeholders in translation strings
export function interpolate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return values[key] !== undefined ? values[key] : match
  })
}

// Helper function to get nested translation keys
export function getNestedTranslation(
  translations: TranslationKeys,
  key: string
): string {
  const keys = key.split('.')
  let value: any = translations
  
  for (const k of keys) {
    value = value?.[k]
  }
  
  return typeof value === 'string' ? value : key
}