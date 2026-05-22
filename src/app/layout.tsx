import type { Metadata, Viewport } from 'next'

import { PWARegister } from '@/components/PWARegister'
import { Providers } from '@/lib/providers/Providers'
import { ThemeBootstrap } from '@/lib/theme/ThemeBootstrap'

import './globals.css'

export const metadata: Metadata = {
  title: 'Vantage',
  description: 'Aplicación de finanzas personales',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Vantage',
  },
  icons: {
    icon: '/logo-icon.png',
    apple: '/logo-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F6F5' },
    { media: '(prefers-color-scheme: dark)', color: '#18181B' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <ThemeBootstrap />
      </head>
      <body>
        <Providers>{children}</Providers>
        <PWARegister />
      </body>
    </html>
  )
}
