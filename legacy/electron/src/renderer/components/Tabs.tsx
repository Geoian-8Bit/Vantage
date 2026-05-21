import { useLayoutEffect, useRef, useState } from 'react'

interface TabItem<T extends string> {
  id: T
  label: string
  disabled?: boolean
}

interface TabsProps<T extends string> {
  items: TabItem<T>[]
  activeId: T
  onChange: (id: T) => void
  size?: 'sm' | 'md'
  className?: string
  ariaLabel?: string
}

interface IndicatorState {
  left: number
  width: number
  visible: boolean
  animate: boolean
}

export function Tabs<T extends string>({
  items,
  activeId,
  onChange,
  size = 'sm',
  className = '',
  ariaLabel,
}: TabsProps<T>) {
  const navRef = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState<IndicatorState>({ left: 0, width: 0, visible: false, animate: false })

  useLayoutEffect(() => {
    const navEl = navRef.current
    if (!navEl) return
    const activeBtn = navEl.querySelector<HTMLButtonElement>(`button[data-id="${activeId}"]`)
    if (activeBtn) {
      const navRect = navEl.getBoundingClientRect()
      const btnRect = activeBtn.getBoundingClientRect()
      setIndicator(prev => ({
        left: btnRect.left - navRect.left,
        width: btnRect.width,
        visible: true,
        animate: prev.visible,
      }))
    } else {
      setIndicator(prev => ({ ...prev, visible: false }))
    }
  }, [activeId, items])

  const padding = size === 'md' ? 'px-3.5 py-2 text-sm' : 'px-3 py-1.5 text-xs'

  return (
    <div
      ref={navRef}
      role="tablist"
      aria-label={ariaLabel}
      className={`relative inline-flex items-center gap-1 bg-surface rounded-lg p-1 border border-border ${className}`}
    >
      {/* Indicator deslizante */}
      <div
        aria-hidden="true"
        className="absolute rounded-md pointer-events-none"
        style={{
          left: indicator.left,
          width: indicator.width,
          top: 4,
          bottom: 4,
          opacity: indicator.visible ? 1 : 0,
          background: 'var(--color-card)',
          boxShadow: 'var(--shadow-sm)',
          transition: indicator.animate
            ? 'left var(--duration-base) var(--ease-spring), width var(--duration-base) var(--ease-spring), opacity var(--duration-base) var(--ease-default)'
            : 'opacity var(--duration-base) var(--ease-default)',
          zIndex: 0,
        }}
      />

      {items.map(item => {
        const isActive = activeId === item.id
        return (
          <button
            key={item.id}
            data-id={item.id}
            role="tab"
            aria-selected={isActive}
            disabled={item.disabled}
            onClick={() => !item.disabled && onChange(item.id)}
            className={`relative z-10 rounded-md font-semibold cursor-pointer ${padding} ${
              isActive
                ? 'text-text'
                : item.disabled
                  ? 'text-subtext/50 cursor-not-allowed'
                  : 'text-subtext hover:text-text'
            }`}
            style={{
              transition: 'color var(--duration-base) var(--ease-default)',
            }}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
