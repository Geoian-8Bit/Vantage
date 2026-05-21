import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  // sql.js usa un wrapper UMD que webpack rompe ("Cannot set properties of
  // undefined (setting 'exports')"). Marcarlo external hace que Node lo cargue
  // directamente desde node_modules en runtime.
  serverExternalPackages: ['sql.js'],
  // pdfkit lee AFM files de su carpeta data/ en runtime y sql.js carga su WASM
  // en runtime. Aseguramos que esos assets se empaqueten en el bundle
  // serverless de Vercel.
  outputFileTracingIncludes: {
    '/api/export/pdf': ['./node_modules/pdfkit/js/data/**/*'],
    '/api/backup/restore': [
      './node_modules/sql.js/dist/sql-wasm.wasm',
      './node_modules/sql.js/dist/sql-wasm.js',
    ],
  },
}

export default nextConfig
