/**
 * Tokens compartidos para Recharts en estética Clay.
 * Separados de ChartTheme.tsx para que HMR funcione (un archivo solo exporta componentes,
 * el otro solo exporta constantes).
 */

export const CHART_GRID_PROPS = {
  strokeDasharray: '3 3',
  stroke: 'var(--color-border)',
  vertical: false as const,
}

export const CHART_AXIS_TICK = {
  fontSize: 11,
  fill: 'var(--color-subtext)',
  fontFamily: 'var(--font-body)',
}

export const CHART_AXIS_PROPS = {
  tick: CHART_AXIS_TICK,
  axisLine: false as const,
  tickLine: false as const,
}

export const CHART_CURSOR_LINE = {
  stroke: 'color-mix(in srgb, var(--color-text) 18%, transparent)',
  strokeDasharray: '4 4',
  strokeWidth: 1,
}

export const CHART_CURSOR_BAR = {
  fill: 'color-mix(in srgb, var(--color-text) 5%, transparent)',
  radius: 8,
}

/** Radio de barras alineado con la suavidad de Clay (sin llegar al extremo de las cards). */
export const CHART_BAR_RADIUS: [number, number, number, number] = [8, 8, 0, 0]

/** Estilo del wrapper de la leyenda. */
export const CHART_LEGEND_STYLE = {
  fontSize: 12,
  paddingTop: 12,
  fontFamily: 'var(--font-body)',
  color: 'var(--color-subtext)',
}

/* ──────────── Animación: curvas y stagger por serie ──────────── */

/**
 * Recharts solo acepta los presets de CSS easing. 'ease-out' es el más cercano a Clay
 * (entrada decelerada, sin overshoot — el spring queda para microinteracciones de UI).
 */
export const CHART_ANIM_EASING = 'ease-out' as const

/** Duración base de entrada de series. */
export const CHART_ANIM_DURATION = 1100

/**
 * Stagger entre series: la primera entra ya, las siguientes se retrasan 90ms cada una.
 * Mantiene la sensación viva sin que se sienta lento.
 */
export const chartAnimationBegin = (seriesIndex: number) => 200 + seriesIndex * 90

/**
 * Punto activo (hover sobre Area / Line). Aro doble con sombra cálida.
 * `colorVar` es el var() del color principal de la serie (income, expense, brand, etc.).
 */
export const chartActiveDot = (colorVar: string) => ({
  r: 5,
  strokeWidth: 2.5,
  stroke: colorVar,
  fill: 'var(--color-card)',
  style: { filter: `drop-shadow(0 4px 10px color-mix(in srgb, ${colorVar} 35%, transparent))` },
})
