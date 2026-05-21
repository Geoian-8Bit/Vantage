import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/main',
      minify: true,
      sourcemap: false,
      rollupOptions: {
        external: ['sql.js']
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/preload',
      minify: true,
      sourcemap: false,
    }
  },
  renderer: {
    plugins: [react(), tailwindcss()],
    root: resolve('src/renderer'),
    build: {
      outDir: resolve('out/renderer'),
      // Terser: minificación agresiva — más pequeño que esbuild default
      minify: 'terser',
      cssMinify: true,
      sourcemap: false,
      // En Electron no hay red — el warning de chunk size no aplica
      chunkSizeWarningLimit: 2000,
      terserOptions: {
        compress: {
          // Eliminar console.* en producción
          drop_console: true,
          drop_debugger: true,
          // Dos pasadas para mayor compresión
          passes: 2,
          // Eliminar código inalcanzable
          dead_code: true,
        },
        mangle: true,
        format: {
          // Eliminar comentarios del bundle
          comments: false,
        },
      },
      rollupOptions: {
        input: resolve('src/renderer/index.html'),
        output: {
          // Separar recharts del bundle principal
          manualChunks: {
            'recharts': ['recharts'],
          },
        },
      },
    }
  }
})
