// Service worker mínimo para que Vantage sea PWA installable.
// No cachea respuestas de API (los datos vienen siempre frescos de Supabase),
// solo activa el ciclo de vida del SW para que el navegador ofrezca instalar.

const CACHE_NAME = 'vantage-shell-v1'
const SHELL_ASSETS = ['/logo-icon.png', '/manifest.json']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Estrategia: solo servimos desde cache los assets del shell precacheados.
// Todo lo demás (HTML, JS de Next, APIs) va directo a red para evitar servir
// datos viejos de finanzas.
self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (!SHELL_ASSETS.some((path) => url.pathname === path)) return

  event.respondWith(
    caches.match(req).then((cached) => cached ?? fetch(req))
  )
})
