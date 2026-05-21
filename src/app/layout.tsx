import type { Metadata } from 'next'

import { QueryProvider } from '@/lib/query/QueryProvider'

import './globals.css'

export const metadata: Metadata = {
  title: 'Vantage',
  description: 'Aplicación de finanzas personales',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
