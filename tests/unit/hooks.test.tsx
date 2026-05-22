import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useIsClient } from '@/lib/hooks/useIsClient'
import { useAnimatedNumber } from '@/lib/hooks/useAnimatedNumber'
import {
  originFromElement,
  useModalOrigin,
} from '@/lib/hooks/useModalOrigin'
import { useRolloverEnabled } from '@/lib/hooks/useRolloverEnabled'

describe('useIsClient', () => {
  it('en el render del cliente devuelve true', () => {
    const { result } = renderHook(() => useIsClient())
    expect(result.current).toBe(true)
  })
})

describe('useAnimatedNumber', () => {
  it('en el primer render devuelve el valor target tal cual', () => {
    const { result } = renderHook(({ target }) => useAnimatedNumber(target), {
      initialProps: { target: 100 },
    })
    expect(result.current).toBe(100)
  })

  it('al final de la animación converge al nuevo target', async () => {
    const { result, rerender } = renderHook(
      ({ target }) => useAnimatedNumber(target, 20),
      { initialProps: { target: 0 } }
    )
    rerender({ target: 500 })
    // Damos margen al RAF para llegar al final del easing.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 80))
    })
    expect(result.current).toBeCloseTo(500, 0)
  })
})

describe('useModalOrigin', () => {
  it('arranca con origin null y limpia tras clear()', () => {
    const { result } = renderHook(() => useModalOrigin())
    expect(result.current.origin).toBeNull()

    act(() => {
      result.current.setOrigin({ x: 10, y: 20 })
    })
    expect(result.current.origin).toEqual({ x: 10, y: 20 })

    act(() => {
      result.current.clear()
    })
    expect(result.current.origin).toBeNull()
  })

  it('originFromElement calcula el centro a partir del getBoundingClientRect', () => {
    const el = document.createElement('div')
    el.getBoundingClientRect = () =>
      ({
        left: 100,
        top: 50,
        width: 40,
        height: 20,
        right: 140,
        bottom: 70,
        x: 100,
        y: 50,
        toJSON: () => ({}),
      }) as DOMRect
    expect(originFromElement(el)).toEqual({ x: 120, y: 60 })
  })
})

describe('useRolloverEnabled', () => {
  beforeEach(() => {
    localStorage.clear()
  })
  afterEach(() => {
    localStorage.clear()
  })

  it('arranca en false si no hay valor guardado', () => {
    const { result } = renderHook(() => useRolloverEnabled())
    expect(result.current.enabled).toBe(false)
  })

  it('toggle persiste en localStorage y sincroniza entre instancias del hook', () => {
    const { result: a } = renderHook(() => useRolloverEnabled())
    const { result: b } = renderHook(() => useRolloverEnabled())

    act(() => {
      a.current.toggle()
    })

    expect(a.current.enabled).toBe(true)
    expect(b.current.enabled).toBe(true)
    expect(localStorage.getItem('vantage-rollover-enabled')).toBe('1')

    act(() => {
      b.current.toggle()
    })
    expect(a.current.enabled).toBe(false)
    expect(localStorage.getItem('vantage-rollover-enabled')).toBe('0')
  })
})
