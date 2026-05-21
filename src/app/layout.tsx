import type { Metadata } from 'next'

import { Providers } from '@/lib/providers/Providers'
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
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
