import type { Metadata } from 'next'

import { QueryProvider } from '@/lib/query/QueryProvider'
import { ThemeBootstrap } from '@/lib/theme/ThemeBootstrap'

import './globals.css'

export const metadata: Metadata = {
  title: 'Vantage',
  description: 'Aplicación de finanzas personales',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <ThemeBootstrap />
      </head>
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
