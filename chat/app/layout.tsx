import './globals.css'

import type { Metadata } from 'next'
import { getDefaultLanguage } from '@/lib/i18n'

export const metadata: Metadata = {
  title: 'Aira Chat',
  description: 'Agentic Information Retrieval Assistant',
  generator: 'Next.js',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const language = getDefaultLanguage()
  
  return (
    <html lang={language}>
      <body>{children}</body>
    </html>
  )
}
