import { createContext, useCallback, useContext, useRef, type ReactNode } from 'react'

/**
 * "Fly to cart" — al añadir un producto a la lista, se clona el elemento
 * (típicamente la foto del producto) y se anima en arc-curve hacia un
 * receptor (típicamente el icono de cesta del bottom-bar o de la sidebar).
 *
 * Patrón:
 *   1. Un componente arriba en el árbol (ShoppingScreen) provee FlyToCartProvider
 *      y registra el receptor con `useRegisterCartReceiver(ref)`.
 *   2. Cualquier componente hijo invoca `useFlyToCart()` y llama a
 *      `fly(originElement)` cuando ocurra el "añadir".
 *   3. El helper clona el origen, lo posiciona fixed en su rect actual,
 *      calcula el delta hacia el receptor y aplica las custom props
 *      --shop-fly-x / --shop-fly-y. La animación se gestiona con CSS.
 *
 * Si no hay receptor registrado (ej. al usar fly desde un punto sin Provider),
 * el helper se hace no-op silencioso.
 */

interface FlyContext {
  registerReceiver: (el: HTMLElement | null) => void
  fly: (origin: HTMLElement | null) => void
}

const Ctx = createContext<FlyContext | null>(null)

export function FlyToCartProvider({ children }: { children: ReactNode }) {
  const receiverRef = useRef<HTMLElement | null>(null)

  const registerReceiver = useCallback((el: HTMLElement | null) => {
    receiverRef.current = el
  }, [])

  const fly = useCallback((origin: HTMLElement | null) => {
    if (!origin) return
    const receiver = receiverRef.current
    if (!receiver) return

    // Respetar prefers-reduced-motion → solo bump del receptor sin clon
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      receiver.classList.remove('shop-cart-receive')
      // Forzar reflow para reiniciar animación si ya estaba aplicada
      void receiver.offsetWidth
      receiver.classList.add('shop-cart-receive')
      window.setTimeout(() => receiver.classList.remove('shop-cart-receive'), 500)
      return
    }

    const oRect = origin.getBoundingClientRect()
    const rRect = receiver.getBoundingClientRect()

    const clone = origin.cloneNode(true) as HTMLElement
    clone.classList.add('shop-fly-clone')
    clone.style.left = `${oRect.left}px`
    clone.style.top = `${oRect.top}px`
    clone.style.width = `${oRect.width}px`
    clone.style.height = `${oRect.height}px`
    // Borrar cualquier interactividad o foco residual del clon
    clone.removeAttribute('tabindex')
    clone.setAttribute('aria-hidden', 'true')

    // Delta hacia el centro del receptor
    const dx = (rRect.left + rRect.width / 2) - (oRect.left + oRect.width / 2)
    const dy = (rRect.top + rRect.height / 2) - (oRect.top + oRect.height / 2)
    clone.style.setProperty('--shop-fly-x', `${dx}px`)
    clone.style.setProperty('--shop-fly-y', `${dy}px`)

    document.body.appendChild(clone)

    // Bump del receptor justo cuando "llega" el item (~720ms del fly)
    window.setTimeout(() => {
      receiver.classList.remove('shop-cart-receive')
      void receiver.offsetWidth
      receiver.classList.add('shop-cart-receive')
      window.setTimeout(() => receiver.classList.remove('shop-cart-receive'), 500)
    }, 600)

    // Limpieza al final de la animación
    clone.addEventListener('animationend', () => {
      clone.remove()
    }, { once: true })
    // Salvavidas por si el evento no dispara
    window.setTimeout(() => clone.remove(), 1500)
  }, [])

  return <Ctx.Provider value={{ registerReceiver, fly }}>{children}</Ctx.Provider>
}

/**
 * Hook para componentes que disparan el fly. Devuelve { fly } o un no-op
 * silencioso si no hay Provider arriba.
 */
export function useFlyToCart(): { fly: (origin: HTMLElement | null) => void } {
  const ctx = useContext(Ctx)
  return { fly: ctx?.fly ?? (() => { /* no-op fuera de Provider */ }) }
}

/**
 * Hook para que el componente receptor (el icono de cesta) se registre.
 * Pásale el `ref.current` cuando esté montado.
 */
export function useRegisterCartReceiver(): (el: HTMLElement | null) => void {
  const ctx = useContext(Ctx)
  return ctx?.registerReceiver ?? (() => { /* no-op fuera de Provider */ })
}
