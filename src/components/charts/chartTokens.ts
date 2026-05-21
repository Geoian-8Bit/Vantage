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

export const CHART_BAR_RADIUS: [number, number, number, number] = [8, 8, 0, 0]

export const CHART_LEGEND_STYLE = {
  fontSize: 12,
  paddingTop: 12,
  fontFamily: 'var(--font-body)',
  color: 'var(--color-subtext)',
}

export const CHART_ANIM_EASING = 'ease-out' as const
export const CHART_ANIM_DURATION = 1100

export const chartAnimationBegin = (seriesIndex: number) => 200 + seriesIndex * 90

export const chartActiveDot = (colorVar: string) => ({
  r: 5,
  strokeWidth: 2.5,
  stroke: colorVar,
  fill: 'var(--color-card)',
  style: { filter: `drop-shadow(0 4px 10px color-mix(in srgb, ${colorVar} 35%, transparent))` },
})
