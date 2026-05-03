import { useMemo } from 'react'

interface Props {
  /** Serie de valores numéricos. Se normaliza al alto del SVG. */
  values: number[]
  width?: number
  height?: number
  /** Trazo en px (default 1.5) */
  stroke?: number
  /** Tendencia: si se omite, se calcula de los datos */
  trend?: 'up' | 'down' | 'flat'
  /** Mostrar relleno gradient bajo la curva */
  filled?: boolean
  className?: string
  ariaLabel?: string
}

const COLORS: Record<'up' | 'down' | 'flat', string> = {
  down: 'var(--color-income)',     // baja → bueno → verde
  up:   'var(--color-expense)',    // sube → malo → rojo
  flat: 'var(--color-subtext)',
}

function autoTrend(values: number[]): 'up' | 'down' | 'flat' {
  if (values.length < 4) return 'flat'
  const splitIdx = Math.floor(values.length * 0.75)
  const a = values.slice(0, splitIdx).reduce((x, y) => x + y, 0) / splitIdx
  const b = values.slice(splitIdx).reduce((x, y) => x + y, 0) / (values.length - splitIdx)
  const pct = ((b - a) / a) * 100
  if (pct >  2) return 'up'
  if (pct < -2) return 'down'
  return 'flat'
}

/**
 * Micro-gráfica de tendencia (~80×24). Sin ejes, sin tooltip — solo silueta.
 * El path se dibuja con stroke-dashoffset al montar (clase .shop-spark-path).
 * Si `filled`, añade un gradiente translúcido bajo la curva.
 *
 * Para series con muy pocos valores (<2) renderiza una línea horizontal plana.
 */
export function SparklineMini({
  values,
  width = 80,
  height = 24,
  stroke = 1.5,
  trend,
  filled = false,
  className = '',
  ariaLabel,
}: Props) {
  const t = trend ?? autoTrend(values)
  const color = COLORS[t]

  const { d, area, len } = useMemo(() => {
    if (values.length < 2) {
      const y = height / 2
      return { d: `M 0 ${y} L ${width} ${y}`, area: '', len: width }
    }
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1
    const stepX = width / (values.length - 1)
    const padY = stroke + 1
    const useY = (v: number) => height - padY - ((v - min) / range) * (height - 2 * padY)
    const points = values.map((v, i) => [i * stepX, useY(v)] as const)
    const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
    const last = points[points.length - 1]
    const first = points[0]
    const areaPath = `${path} L ${last[0].toFixed(1)} ${height} L ${first[0].toFixed(1)} ${height} Z`
    // Estimación de longitud para stroke-dasharray (suma de segmentos)
    let length = 0
    for (let i = 1; i < points.length; i++) {
      const [x1, y1] = points[i - 1]
      const [x2, y2] = points[i]
      length += Math.hypot(x2 - x1, y2 - y1)
    }
    return { d: path, area: areaPath, len: Math.ceil(length) }
  }, [values, width, height, stroke])

  const gradId = `spark-grad-${t}`

  return (
    <svg
      role="img"
      aria-label={ariaLabel ?? `Tendencia: ${t === 'down' ? 'bajada' : t === 'up' ? 'subida' : 'estable'}`}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
    >
      {filled && (
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      {filled && area && (
        <path d={area} fill={`url(#${gradId})`} />
      )}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shop-spark-path"
        style={{ ['--spark-len' as string]: String(len) }}
      />
    </svg>
  )
}
