'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { useIsClient } from '@/lib/hooks/useIsClient'

interface DateInputProps {
  value: string // formato 'YYYY-MM-DD' o 'YYYY-MM' si variant='month'
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  ariaLabel?: string
  required?: boolean
  variant?: 'date' | 'month'
}

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']
const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function todayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatDisplay(value: string, variant: 'date' | 'month'): string {
  if (!value) return ''
  if (variant === 'month') {
    const [y, m] = value.split('-').map(Number)
    if (!y || !m) return value
    return `${MONTH_NAMES[m - 1]} ${y}`
  }
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return value
  return `${pad(d)}/${pad(m)}/${y}`
}

export function DateInput({
  value,
  onChange,
  placeholder = 'Selecciona fecha',
  className = '',
  ariaLabel,
  required,
  variant = 'date',
}: DateInputProps) {
  const [open, setOpen] = useState(false)
  const isClient = useIsClient()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number; width: number } | null>(
    null
  )

  const initialDate = value
    ? new Date(value + (variant === 'month' ? '-01' : '') + 'T00:00:00')
    : new Date()
  const [viewYear, setViewYear] = useState(initialDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth())
  const [prevValue, setPrevValue] = useState(value)

  // Sincroniza el mes visible cuando la prop value cambia desde fuera.
  // Patrón "ajustar state al cambiar prop" durante el render.
  if (prevValue !== value) {
    setPrevValue(value)
    if (value) {
      const d = new Date(value + (variant === 'month' ? '-01' : '') + 'T00:00:00')
      setViewYear(d.getFullYear())
      setViewMonth(d.getMonth())
    }
  }

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const popoverHeight = variant === 'month' ? 220 : 320
    const wouldOverflow = rect.bottom + popoverHeight + 12 > window.innerHeight
    setPopoverPos({
      top: wouldOverflow ? rect.top - popoverHeight - 8 : rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 280),
    })
  }, [open, variant])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (popoverRef.current?.contains(e.target as Node)) return
      if (triggerRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
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

  const today = todayString()

  const calendarDays = (() => {
    if (variant === 'month') return []
    const firstDay = new Date(viewYear, viewMonth, 1)
    const lastDay = new Date(viewYear, viewMonth + 1, 0)
    const startDow = (firstDay.getDay() + 6) % 7
    const days: { date: string; day: number; inMonth: boolean }[] = []
    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(viewYear, viewMonth, -i)
      days.push({
        date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        day: d.getDate(),
        inMonth: false,
      })
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({
        date: `${viewYear}-${pad(viewMonth + 1)}-${pad(d)}`,
        day: d,
        inMonth: true,
      })
    }
    while (days.length % 7 !== 0) {
      const d = new Date(viewYear, viewMonth + 1, days.length - lastDay.getDate() - startDow + 1)
      days.push({
        date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        day: d.getDate(),
        inMonth: false,
      })
    }
    return days
  })()

  function navigatePrev() {
    if (variant === 'month') setViewYear((y) => y - 1)
    else {
      setViewMonth((m) => {
        if (m === 0) {
          setViewYear((y) => y - 1)
          return 11
        }
        return m - 1
      })
    }
  }
  function navigateNext() {
    if (variant === 'month') setViewYear((y) => y + 1)
    else {
      setViewMonth((m) => {
        if (m === 11) {
          setViewYear((y) => y + 1)
          return 0
        }
        return m + 1
      })
    }
  }

  function selectDate(date: string) {
    onChange(date)
    setOpen(false)
  }

  function selectMonth(monthIdx: number) {
    onChange(`${viewYear}-${pad(monthIdx + 1)}`)
    setOpen(false)
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`date-input-trigger inline-flex cursor-pointer items-center gap-2 rounded-xl border bg-surface px-4 py-2.5 text-sm transition-colors ${value ? 'text-text' : 'text-subtext'} ${className}`}
        style={{ borderColor: open ? 'var(--color-brand)' : 'var(--color-border)' }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 text-subtext"
        >
          {variant === 'month' ? (
            <>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </>
          ) : (
            <>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </>
          )}
        </svg>
        <span className="font-medium">{value ? formatDisplay(value, variant) : placeholder}</span>
        {required && !value && <span className="ml-1 text-expense">*</span>}
      </button>

      {open &&
        popoverPos &&
        isClient &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label={ariaLabel}
            className="date-popover fixed z-50 rounded-2xl border shadow-xl"
            style={{
              top: popoverPos.top,
              left: popoverPos.left,
              background: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              boxShadow: 'var(--shadow-xl)',
              padding: 16,
              width: variant === 'month' ? 280 : Math.max(popoverPos.width, 300),
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={navigatePrev}
                aria-label="Anterior"
                className="cursor-pointer rounded-lg p-1.5 text-subtext transition-colors hover:bg-surface hover:text-text"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                {variant === 'month' ? viewYear : `${MONTH_NAMES[viewMonth]} ${viewYear}`}
              </span>
              <button
                type="button"
                onClick={navigateNext}
                aria-label="Siguiente"
                className="cursor-pointer rounded-lg p-1.5 text-subtext transition-colors hover:bg-surface hover:text-text"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>

            {variant === 'month' ? (
              <div className="grid grid-cols-3 gap-2">
                {MONTH_NAMES.map((name, idx) => {
                  const monthValue = `${viewYear}-${pad(idx + 1)}`
                  const isSelected = value === monthValue
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => selectMonth(idx)}
                      className={`cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-brand text-white shadow-sm'
                          : 'text-subtext hover:bg-surface hover:text-text'
                      }`}
                    >
                      {name.slice(0, 3)}
                    </button>
                  )
                })}
              </div>
            ) : (
              <>
                <div className="mb-1 grid grid-cols-7 gap-1">
                  {WEEKDAYS.map((d) => (
                    <div
                      key={d}
                      className="py-1 text-center text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--color-subtext)' }}
                    >
                      {d}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((cell, i) => {
                    const isSelected = cell.date === value
                    const isToday = cell.date === today
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => selectDate(cell.date)}
                        className={`h-8 cursor-pointer rounded-lg text-xs font-medium transition-all ${
                          !cell.inMonth ? 'opacity-30 hover:opacity-60' : ''
                        } ${
                          isSelected
                            ? 'bg-brand text-white shadow-sm'
                            : isToday
                              ? 'bg-brand-light font-bold text-brand'
                              : 'text-text hover:bg-surface'
                        }`}
                      >
                        {cell.day}
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {variant === 'date' && (
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <button
                  type="button"
                  onClick={() => selectDate(today)}
                  className="cursor-pointer text-xs font-semibold text-brand hover:text-brand-hover"
                >
                  Hoy
                </button>
                {value && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange('')
                      setOpen(false)
                    }}
                    className="cursor-pointer text-xs font-medium text-subtext hover:text-text"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  )
}
