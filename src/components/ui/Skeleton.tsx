import type { CSSProperties } from 'react'

interface SkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  style?: CSSProperties
}

const ROUNDED_MAP = {
  sm: 'var(--radius-sm)',
  md: 'var(--radius-md)',
  lg: 'var(--radius-lg)',
  xl: 'var(--radius-xl)',
  full: '9999px',
}

/**
 * Placeholder con shimmer animation para loading states.
 * Se adapta al tema activo via tokens (border, radius).
 */
export function Skeleton({ className = '', width, height, rounded = 'sm', style }: SkeletonProps) {
  return (
    <span
      className={`skeleton ${className}`}
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width,
        height,
        borderRadius: ROUNDED_MAP[rounded],
        ...style,
      }}
    />
  )
}
