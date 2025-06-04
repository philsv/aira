import './globals.css'

import type { Metadata } from 'next'

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
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
