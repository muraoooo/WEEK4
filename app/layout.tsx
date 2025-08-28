import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Secure Session System',
  description: 'Enterprise-grade session management system with JWT authentication',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}