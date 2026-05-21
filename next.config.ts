import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  // pdfkit lee AFM files de su carpeta data/ en runtime. Aseguramos que esos
  // assets se empaqueten en el bundle serverless de Vercel.
  outputFileTracingIncludes: {
    '/api/export/pdf': ['./node_modules/pdfkit/js/data/**/*'],
  },
}

export default nextConfig
