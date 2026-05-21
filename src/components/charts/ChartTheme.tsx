'use client'

import { Sector } from 'recharts'

interface PayloadItem {
  name: string
  value: number
  color: string
  dataKey?: string
  payload?: { fill?: string }
}

interface ChartTooltipProps {
  active?: boolean
  payload?: PayloadItem[]
  label?: string
  labelFormatter?: (label: string) => string
  valueFormatter?: (value: number) => string
  nameFormatter?: (name: string) => string
}

export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter = (v) => String(v),
  nameFormatter,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  const renderedLabel =
    label !== undefined && labelFormatter ? labelFormatter(String(label)) : label
  return (
    <div
      className="px-3.5 py-2.5 text-xs"
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        color: 'var(--color-text)',
        backdropFilter: 'blur(12px)',
        fontFamily: 'var(--font-body)',
      }}
    >
      {renderedLabel !== undefined && renderedLabel !== '' && (
        <p
          className="mb-1.5 font-semibold capitalize"
          style={{
            fontFamily: 'var(--font-display)',
            letterSpacing: 'var(--letter-spacing-display)',
          }}
        >
          {renderedLabel}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((p) => {
          const renderedName = nameFormatter ? nameFormatter(p.name) : p.name
          return (
            <div key={p.dataKey ?? p.name} className="flex items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: p.color, boxShadow: `0 0 0 2px ${p.color}22` }}
              />
              <span style={{ color: 'var(--color-subtext)' }}>{renderedName}:</span>
              <span className="font-bold tabular-nums">{valueFormatter(p.value)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface ChartPieTooltipProps {
  active?: boolean
  payload?: PayloadItem[]
  total?: number
  valueFormatter?: (value: number) => string
}

export function ChartPieTooltip({
  active,
  payload,
  total,
  valueFormatter = (v) => String(v),
}: ChartPieTooltipProps) {
  if (!active || !payload?.length) return null
  const item = payload[0]!
  const fill = item.payload?.fill ?? item.color
  const pct = total && total > 0 ? Math.round((item.value / total) * 100) : null
  return (
    <div
      className="px-3.5 py-2.5 text-xs"
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        color: 'var(--color-text)',
        backdropFilter: 'blur(12px)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <div className="mb-1 flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: fill, boxShadow: `0 0 0 2px ${fill}22` }}
        />
        <span
          className="font-semibold"
          style={{
            fontFamily: 'var(--font-display)',
            letterSpacing: 'var(--letter-spacing-display)',
          }}
        >
          {item.name}
        </span>
      </div>
      <div className="flex items-baseline gap-2" style={{ paddingLeft: '1.125rem' }}>
        <span className="font-bold tabular-nums">{valueFormatter(item.value)}</span>
        {pct !== null && <span style={{ color: 'var(--color-subtext)' }}>· {pct}%</span>}
      </div>
    </div>
  )
}

interface ActiveSectorProps {
  cx?: number
  cy?: number
  innerRadius?: number
  outerRadius?: number
  startAngle?: number
  endAngle?: number
  fill?: string
}

export function PieActiveSector(props: ActiveSectorProps) {
  const { cx, cy, innerRadius = 0, outerRadius = 0, startAngle, endAngle, fill } = props
  return (
    <g
      style={{
        filter: `drop-shadow(0 6px 14px color-mix(in srgb, ${fill} 40%, transparent))`,
      }}
    >
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 8}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.35}
      />
    </g>
  )
}
