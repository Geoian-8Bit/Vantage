import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
  ariaLabel?: string
  size?: 'sm' | 'md'
}

export function Select({
  value, onChange, options, placeholder = 'Selecciona…', className = '', ariaLabel, size = 'sm',
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number; width: number; alignBottom: boolean } | null>(null)

  const current = options.find(o => o.value === value)

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const popoverHeight = Math.min(options.length * 36 + 16, 320)
    const wouldOverflow = rect.bottom + popoverHeight + 12 > window.innerHeight
    setPopoverPos({
      top: wouldOverflow ? rect.top - popoverHeight - 6 : rect.bottom + 6,
      left: rect.left,
      width: rect.width,
      alignBottom: wouldOverflow,
    })
  }, [open, options.length])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (popoverRef.current?.contains(e.target as Node)) return
      if (triggerRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onScroll = () => setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  const sizing = size === 'md' ? 'px-4 py-2.5 text-sm' : 'px-3 py-1.5 text-xs'

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`select-trigger inline-flex items-center gap-2 rounded-lg border bg-surface font-medium cursor-pointer transition-colors ${sizing} ${current ? 'text-text' : 'text-subtext'} ${className}`}
        style={{ borderColor: open ? 'var(--color-brand)' : 'var(--color-border)' }}
      >
        <span className="truncate">{current?.label ?? placeholder}</span>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="ml-auto shrink-0 text-subtext transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && popoverPos && createPortal(
        <div
          ref={popoverRef}
          role="listbox"
          aria-label={ariaLabel}
          className="select-popover fixed z-50 rounded-xl border shadow-xl py-1 overflow-y-auto"
          style={{
            top: popoverPos.top,
            left: popoverPos.left,
            minWidth: popoverPos.width,
            maxHeight: 320,
            background: 'var(--color-card)',
            borderColor: 'var(--color-border)',
            boxShadow: 'var(--shadow-xl)',
            transformOrigin: popoverPos.alignBottom ? 'bottom left' : 'top left',
          }}
        >
          {options.map(opt => {
            const isSelected = opt.value === value
            return (
              <button
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false) }}
                className={`select-option w-full flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors ${
                  isSelected ? 'bg-brand-light text-brand font-semibold' : 'text-text hover:bg-surface'
                }`}
              >
                <span className="flex-1 text-left truncate">{opt.label}</span>
                {isSelected && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>,
        document.body
      )}
    </>
  )
}
