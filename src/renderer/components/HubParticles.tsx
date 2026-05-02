import { useEffect, useRef } from 'react'

/**
 * Constelación de partículas de fondo para el HubScreen.
 *
 * Renderiza un canvas absoluto detrás del contenido del Hub con ~35 partículas
 * tipo "polvo dorado" del color accent del tema. Se desplazan muy lentamente
 * sin gravedad. Cuando el cursor entra en un radio de 180px de una partícula,
 * la partícula se atrae ligeramente hacia él y se "enciende" más.
 *
 * - 60fps en Electron desktop (~35 entidades, sin shaders, canvas 2D).
 * - Pausa el RAF cuando la pestaña pierde visibilidad (visibilitychange).
 * - Respeta prefers-reduced-motion: si está activo, NO renderiza nada.
 * - Resamplea el color accent en cada frame para que el cambio de paleta sea
 *   transparente (sin reinit del componente).
 */
export function HubParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Respeta prefers-reduced-motion: el sistema global ya neutraliza
    // animations CSS, pero un canvas con RAF necesita check explícito.
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let dpr = window.devicePixelRatio || 1

    const resize = () => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    interface Particle {
      x: number
      y: number
      vx: number
      vy: number
      size: number
      baseAlpha: number
    }

    const PARTICLE_COUNT = 38
    const particles: Particle[] = []
    const w0 = canvas.offsetWidth
    const h0 = canvas.offsetHeight
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * w0,
        y: Math.random() * h0,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        size: Math.random() * 1.6 + 0.7,
        baseAlpha: Math.random() * 0.35 + 0.18,
      })
    }

    const mouse = { x: -9999, y: -9999 }
    const ATTRACTION_RADIUS = 180
    const ATTRACTION_FORCE = 0.045
    const DRAG = 0.965
    const MAX_SPEED = 0.9

    // Lee el color accent del tema activo. Un re-read por frame es barato
    // y permite que el cambio de paleta se refleje sin reinit.
    const rootStyle = getComputedStyle(document.documentElement)
    const readAccent = () => rootStyle.getPropertyValue('--color-accent').trim() || '#C9A84C'

    // Listeners en window porque el canvas es pointer-events:none (los tiles
    // del Hub deben seguir siendo clicables). Calculamos la posición relativa
    // al canvas con getBoundingClientRect.
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      // Si el cursor está fuera del canvas, lo tratamos como ausente
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
        mouse.x = -9999
        mouse.y = -9999
      } else {
        mouse.x = x
        mouse.y = y
      }
    }
    const onLeaveWindow = () => {
      mouse.x = -9999
      mouse.y = -9999
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseleave', onLeaveWindow)

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)

    let rafId: number | null = null

    const draw = () => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      ctx.clearRect(0, 0, w, h)

      const accent = readAccent()
      ctx.fillStyle = accent

      for (const p of particles) {
        // Atracción suave hacia el cursor si está en radio
        const dx = mouse.x - p.x
        const dy = mouse.y - p.y
        const dist2 = dx * dx + dy * dy
        let glow = 0
        if (dist2 < ATTRACTION_RADIUS * ATTRACTION_RADIUS && dist2 > 1) {
          const dist = Math.sqrt(dist2)
          const norm = 1 - dist / ATTRACTION_RADIUS
          const force = ATTRACTION_FORCE * norm
          p.vx += (dx / dist) * force
          p.vy += (dy / dist) * force
          glow = norm * 0.55
        }

        // Drag: amortigua para que las partículas no aceleren infinito
        p.vx *= DRAG
        p.vy *= DRAG

        // Velocidad cap: si se acelera demasiado al entrar el cursor, lo limito
        const speed = Math.hypot(p.vx, p.vy)
        if (speed > MAX_SPEED) {
          p.vx = (p.vx / speed) * MAX_SPEED
          p.vy = (p.vy / speed) * MAX_SPEED
        }

        p.x += p.vx
        p.y += p.vy

        // Wrap edges (toroidal): salir por un lado, entrar por el otro
        if (p.x < -10) p.x = w + 10
        else if (p.x > w + 10) p.x = -10
        if (p.y < -10) p.y = h + 10
        else if (p.y > h + 10) p.y = -10

        const alpha = Math.min(1, p.baseAlpha + glow)
        const radius = p.size + glow * 1.8

        ctx.globalAlpha = alpha
        ctx.beginPath()
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalAlpha = 1
      rafId = requestAnimationFrame(draw)
    }
    rafId = requestAnimationFrame(draw)

    // Pausa el RAF cuando la ventana pierde visibilidad para no quemar CPU
    const onVisibility = () => {
      if (document.hidden) {
        if (rafId !== null) {
          cancelAnimationFrame(rafId)
          rafId = null
        }
      } else if (rafId === null) {
        rafId = requestAnimationFrame(draw)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseleave', onLeaveWindow)
      document.removeEventListener('visibilitychange', onVisibility)
      resizeObserver.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  )
}
