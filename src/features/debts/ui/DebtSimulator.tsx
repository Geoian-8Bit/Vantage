'use client'

import { useMemo, useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from 'recharts'

import { Select, type SelectOption } from '@/components/ui/Select'
import { ChartTooltip } from '@/components/charts/ChartTheme'
import { useAnimatedNumber } from '@/lib/hooks/useAnimatedNumber'
import { formatCurrency, getTodayString, pad } from '@/lib/utils/format'
import {
  addMonths,
  averageMonthlyCapacity,
  evaluateProposal,
  monthsForQuota,
  prettyMonth,
  quotaForMonths,
  recommendPlans,
  scenarios,
  type Recommendation,
} from '@/lib/utils/debtMath'

import type { Debt } from '@/features/debts/domain/debt.schema'
import type { Transaction } from '@/features/transactions/domain/transaction.schema'

type FundsSource = 'none' | 'savings' | 'free'

interface DebtSimulatorProps {
  activeDebts: Debt[]
  paidByDebt: Map<string, number>
  transactions: Transaction[]
  savingsAccounts: { id: string; name: string }[]
  savingsBalances: Map<string, number>
}

export function DebtSimulator({
  activeDebts,
  paidByDebt,
  transactions,
  savingsAccounts,
  savingsBalances,
}: DebtSimulatorProps) {
  // monthlyTrend 6 meses (mismo cálculo que dashboard)
  const monthlyTrend = useMemo(() => {
    const now = new Date()
    const series: { month: string; income: number; expenses: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
      let inc = 0
      let exp = 0
      for (const t of transactions) {
        if (!t.date.startsWith(key)) continue
        const amt = Number(t.amount)
        if (t.type === 'income') inc += amt
        else exp += amt
      }
      series.push({ month: key, income: inc, expenses: exp })
    }
    return series
  }, [transactions])

  const [calcCapital, setCalcCapital] = useState<string>('1000')
  const [calcMonths, setCalcMonths] = useState<number>(10)
  const [fundsOpen, setFundsOpen] = useState(false)
  const [fundsSource, setFundsSource] = useState<FundsSource>('none')
  const [fundsAccountId, setFundsAccountId] = useState<string>('')
  const [fundsFreeAmount, setFundsFreeAmount] = useState<string>('')

  const capitalNum = useMemo(() => {
    const n = parseFloat(calcCapital)
    return isFinite(n) && n > 0 ? n : 0
  }, [calcCapital])

  const fundsAvailable = useMemo(() => {
    if (fundsSource === 'savings') {
      return savingsBalances.get(fundsAccountId) ?? 0
    }
    if (fundsSource === 'free') {
      const n = parseFloat(fundsFreeAmount)
      return isFinite(n) && n > 0 ? n : 0
    }
    return 0
  }, [fundsSource, fundsAccountId, fundsFreeAmount, savingsBalances])

  const netCapital = useMemo(
    () => Math.max(0, capitalNum - fundsAvailable),
    [capitalNum, fundsAvailable]
  )

  const calcResult = useMemo(() => {
    if (netCapital <= 0 || calcMonths <= 0) return null
    const q = quotaForMonths(netCapital, calcMonths)
    const today = getTodayString()
    return {
      quota: q,
      months: calcMonths,
      endDate: addMonths(today, calcMonths - 1),
    }
  }, [netCapital, calcMonths])

  const capitalCurve = useMemo(() => {
    if (!calcResult) return []
    const points: { month: number; pending: number }[] = []
    for (let i = 0; i <= calcResult.months; i++) {
      points.push({
        month: i,
        pending: Math.max(0, netCapital - calcResult.quota * i),
      })
    }
    return points
  }, [calcResult, netCapital])

  const calcScenarios = useMemo(() => {
    if (netCapital <= 0) return []
    return scenarios(netCapital, getTodayString())
  }, [netCapital])

  const animQuota = useAnimatedNumber(calcResult?.quota ?? 0)
  const animMonths = useAnimatedNumber(calcMonths)

  // Pago extra
  const [extraDebtId, setExtraDebtId] = useState<string>(activeDebts[0]?.id ?? '')
  const [extraAmount, setExtraAmount] = useState<string>('')
  const extraDebt = useMemo(
    () => activeDebts.find((d) => d.id === extraDebtId) ?? null,
    [activeDebts, extraDebtId]
  )
  const extraDebtMetrics = useMemo(() => {
    if (!extraDebt) return null
    const paid = paidByDebt.get(extraDebt.id) ?? 0
    const pending = Math.max(0, Number(extraDebt.initialAmount) - paid)
    const monthly = Number(extraDebt.monthlyAmount)
    const monthsRemaining = monthly > 0 ? monthsForQuota(pending, monthly) : 0
    return { paid, pending, monthly, monthsRemaining }
  }, [extraDebt, paidByDebt])

  const extraResult = useMemo(() => {
    if (!extraDebt || !extraDebtMetrics) return null
    const a = parseFloat(extraAmount)
    if (!isFinite(a) || a <= 0) return null
    const cappedExtra = Math.min(a, extraDebtMetrics.pending)
    const newPending = Math.max(0, extraDebtMetrics.pending - cappedExtra)
    const newMonths =
      newPending > 0 && extraDebtMetrics.monthly > 0
        ? monthsForQuota(newPending, extraDebtMetrics.monthly)
        : 0
    const today = getTodayString()
    const newEnd = addMonths(today, Math.max(0, newMonths - 1))
    const oldEnd = addMonths(today, Math.max(0, extraDebtMetrics.monthsRemaining - 1))
    const monthsSaved = Math.max(0, extraDebtMetrics.monthsRemaining - newMonths)
    return { cappedExtra, newPending, newMonths, newEnd, oldEnd, monthsSaved }
  }, [extraDebt, extraDebtMetrics, extraAmount])

  // Recomendación
  const monthlyCapacity = useMemo(
    () => averageMonthlyCapacity(monthlyTrend),
    [monthlyTrend]
  )
  const proposalEvaluation = useMemo<Recommendation | null>(() => {
    if (!calcResult || netCapital <= 0) return null
    return evaluateProposal(netCapital, calcResult.quota, monthlyCapacity)
  }, [calcResult, netCapital, monthlyCapacity])
  const plans = useMemo(() => {
    if (netCapital <= 0 || monthlyCapacity <= 0) return null
    return recommendPlans(netCapital, monthlyCapacity)
  }, [netCapital, monthlyCapacity])

  const animCapacity = useAnimatedNumber(monthlyCapacity)

  const savingsOptions: SelectOption[] = savingsAccounts
    .filter((a) => (savingsBalances.get(a.id) ?? 0) > 0)
    .map((a) => ({
      value: a.id,
      label: `${a.name} · ${formatCurrency(savingsBalances.get(a.id) ?? 0)}`,
    }))

  const debtOptions: SelectOption[] = activeDebts.map((d) => {
    const pending = Math.max(
      0,
      Number(d.initialAmount) - (paidByDebt.get(d.id) ?? 0)
    )
    return {
      value: d.id,
      label: `${d.name} · ${formatCurrency(pending)} pendiente`,
    }
  })

  const sliderFill = `${((calcMonths - 1) / 59) * 100}%`

  return (
    <div className="space-y-6 lg:space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <h2
            className="leading-tight text-text"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.5rem, 2.4vw, 1.875rem)',
              letterSpacing: 'var(--letter-spacing-display)',
            }}
          >
            Simulador
          </h2>
          <p className="mt-0.5 max-w-prose text-sm leading-relaxed text-subtext">
            Proyecta una deuda nueva, calcula el efecto de un pago extra y compara la cuota
            con tu ahorro habitual.
          </p>
        </div>
        {monthlyCapacity > 0 && (
          <p className="text-[11px] tabular-nums text-subtext">
            Tu capacidad media:{' '}
            <span className="font-bold text-income">{formatCurrency(animCapacity)}</span> al
            mes
          </p>
        )}
      </header>

      {/* 01 Calculadora */}
      <section
        aria-labelledby="sim-calc-title"
        className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
      >
        <div className="flex items-baseline justify-between gap-4 px-5 pb-2 pt-5 lg:px-6 lg:pt-6">
          <div className="flex min-w-0 items-baseline gap-3">
            <span className="sim-numeral shrink-0">01</span>
            <h3 id="sim-calc-title" className="text-base font-bold text-text">
              Proyectar una deuda
            </h3>
          </div>
          <p className="hidden shrink-0 text-[11px] italic text-subtext md:block">
            Sin intereses, reparto lineal mes a mes
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 px-5 pb-5 lg:grid-cols-12 lg:gap-6 lg:px-6 lg:pb-6">
          <div className="space-y-5 lg:col-span-7">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-subtext">
                Capital de la deuda
              </label>
              <div
                className="relative rounded-xl"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <span
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-brand"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  €
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={calcCapital}
                  onChange={(e) => setCalcCapital(e.target.value)}
                  placeholder="0,00"
                  className="w-full rounded-xl border-none bg-transparent py-3 pl-10 pr-4 text-right text-base tabular-nums text-text focus:outline-none"
                  style={{ fontFamily: 'var(--font-display)' }}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-subtext">
                  Plazo
                </label>
                <span className="text-[10px] italic text-subtext">arrastra para ajustar</span>
              </div>
              <div className="flex items-center gap-5">
                <div className="min-w-0 flex-1">
                  <input
                    type="range"
                    min={1}
                    max={60}
                    step={1}
                    value={calcMonths}
                    onChange={(e) => setCalcMonths(parseInt(e.target.value, 10))}
                    className="range-clay"
                    style={{ ['--fill' as string]: sliderFill }}
                    aria-label="Plazo en meses"
                    aria-valuetext={`${calcMonths} meses`}
                  />
                  <div className="mt-1 flex justify-between text-[10px] tabular-nums text-subtext">
                    <span>1m</span>
                    <span>12m</span>
                    <span>24m</span>
                    <span>36m</span>
                    <span>60m</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className="leading-none tabular-nums text-brand"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(2.25rem, 4.5vw, 3rem)',
                    }}
                  >
                    {Math.round(animMonths)}
                  </p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wider text-subtext">
                    {calcMonths === 1 ? 'mes' : 'meses'}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => {
                  setFundsOpen((o) => !o)
                  if (!fundsOpen && fundsSource === 'none') setFundsSource('savings')
                  if (fundsOpen) setFundsSource('none')
                }}
                aria-expanded={fundsOpen}
                className="inline-flex cursor-pointer items-center gap-2 text-[11px] font-semibold text-subtext transition-colors hover:text-text"
              >
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full transition-colors"
                  style={{
                    background: fundsOpen ? 'var(--color-brand)' : 'var(--color-surface)',
                    borderColor: fundsOpen ? 'var(--color-brand)' : 'var(--color-border)',
                    borderWidth: 1,
                    color: fundsOpen ? 'white' : 'var(--color-subtext)',
                  }}
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      transform: fundsOpen ? 'rotate(45deg)' : 'rotate(0)',
                      transition: 'transform var(--duration-base) var(--ease-spring)',
                    }}
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
                <span>
                  {fundsOpen ? 'Sin descontar nada ya ahorrado' : 'Sumar dinero ya ahorrado'}
                </span>
              </button>

              {fundsOpen && (
                <div
                  className="mt-3 space-y-2.5 rounded-xl border border-border bg-surface/60 p-3"
                  style={{ animation: 'fade-up var(--duration-base) var(--ease-spring) both' }}
                >
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFundsSource('savings')}
                      className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                        fundsSource === 'savings'
                          ? 'bg-brand text-white'
                          : 'border border-border bg-card text-subtext hover:text-text'
                      }`}
                    >
                      Desde un apartado
                    </button>
                    <button
                      type="button"
                      onClick={() => setFundsSource('free')}
                      className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                        fundsSource === 'free'
                          ? 'bg-brand text-white'
                          : 'border border-border bg-card text-subtext hover:text-text'
                      }`}
                    >
                      Importe libre
                    </button>
                  </div>

                  {fundsSource === 'savings' &&
                    (savingsOptions.length === 0 ? (
                      <p className="text-[11px] leading-relaxed text-subtext">
                        Aún no tienes apartados con saldo. Crea uno desde Ahorros y aparecerá aquí.
                      </p>
                    ) : (
                      <Select
                        value={fundsAccountId}
                        onChange={setFundsAccountId}
                        options={savingsOptions}
                        placeholder="Selecciona apartado…"
                        className="w-full"
                        size="md"
                      />
                    ))}

                  {fundsSource === 'free' && (
                    <div
                      className="relative rounded-xl"
                      style={{
                        background: 'var(--color-card)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <span
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-brand"
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        €
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={fundsFreeAmount}
                        onChange={(e) => setFundsFreeAmount(e.target.value)}
                        placeholder="0,00"
                        className="w-full rounded-xl border-none bg-transparent py-2 pl-9 pr-4 text-right text-sm tabular-nums text-text focus:outline-none"
                      />
                    </div>
                  )}

                  {fundsAvailable > 0 && capitalNum > 0 && (
                    <p className="text-[11px] leading-relaxed text-subtext">
                      Restando{' '}
                      <span className="font-semibold tabular-nums text-text">
                        {formatCurrency(fundsAvailable)}
                      </span>
                      , financiarías{' '}
                      <span className="font-semibold tabular-nums text-text">
                        {formatCurrency(netCapital)}
                      </span>
                      . El dinero del apartado no se mueve, solo se simula.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col lg:col-span-5">
            {calcResult ? (
              <>
                <div className="mb-3 rounded-xl border border-border bg-surface/40 px-4 py-3">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-subtext">
                    Cuota mensual estimada
                  </p>
                  <p
                    className="leading-none tabular-nums text-brand"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(1.75rem, 3.6vw, 2.25rem)',
                    }}
                  >
                    {formatCurrency(animQuota)}
                    <span className="text-xs font-medium text-subtext"> / mes</span>
                  </p>
                  <p className="mt-1.5 text-[11px] leading-snug text-subtext">
                    Saldarías la deuda en{' '}
                    <span className="font-semibold text-text">
                      {prettyMonth(calcResult.endDate)}
                    </span>
                    .
                  </p>
                </div>

                <div className="min-h-[120px] flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={capitalCurve}
                      margin={{ top: 6, right: 4, bottom: 0, left: 0 }}
                    >
                      <defs>
                        <linearGradient id="sim-curve" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.45} />
                          <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" hide />
                      <YAxis hide domain={[0, 'dataMax']} />
                      <Tooltip
                        cursor={{
                          stroke: 'color-mix(in srgb, var(--color-text) 18%, transparent)',
                          strokeDasharray: '4 4',
                          strokeWidth: 1,
                        }}
                        content={
                          <ChartTooltip
                            labelFormatter={(l) => `Mes ${l}`}
                            valueFormatter={(v) => formatCurrency(v)}
                            nameFormatter={() => 'Pendiente'}
                          />
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="pending"
                        stroke="var(--color-brand)"
                        strokeWidth={2.5}
                        fill="url(#sim-curve)"
                        animationDuration={900}
                        animationEasing="ease-out"
                        dot={false}
                        activeDot={{
                          r: 5,
                          strokeWidth: 2.5,
                          stroke: 'var(--color-brand)',
                          fill: 'var(--color-card)',
                          style: {
                            filter:
                              'drop-shadow(0 4px 10px color-mix(in srgb, var(--color-brand) 35%, transparent))',
                          },
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  <p className="mt-1 text-center text-[10px] text-subtext">
                    Capital pendiente en cada cuota
                  </p>
                </div>
              </>
            ) : (
              <div className="flex min-h-[180px] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/30 px-6 py-8 text-center">
                <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-subtext">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 3v18h18" />
                    <path d="M7 14l4-4 4 4 5-5" />
                  </svg>
                </span>
                <p className="text-[11px] leading-relaxed text-subtext">
                  Indica un capital mayor que 0 para ver la cuota y la curva de amortización.
                </p>
              </div>
            )}
          </div>
        </div>

        {calcScenarios.length > 0 && (
          <div className="border-t border-border bg-surface/40 px-5 py-4 lg:px-6">
            <div className="mb-2.5 flex items-baseline justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-subtext">
                Otros plazos
              </p>
              <p className="text-[10px] italic text-subtext">toca uno para probarlo</p>
            </div>
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="list">
              {calcScenarios.map((s, idx) => {
                const isActive = s.months === calcMonths
                return (
                  <button
                    key={s.months}
                    type="button"
                    onClick={() => setCalcMonths(s.months)}
                    className={`shrink-0 cursor-pointer rounded-xl px-3 py-2 text-left transition-all ${
                      isActive
                        ? 'bg-brand text-white shadow-md'
                        : 'border border-border bg-card text-text hover:border-brand hover:bg-brand-light'
                    }`}
                    style={{ animationDelay: `${idx * 30}ms`, minWidth: 92 }}
                    aria-pressed={isActive}
                  >
                    <p className="mb-1 text-[10px] font-semibold uppercase leading-none tracking-wider">
                      <span className={isActive ? 'text-white/80' : 'text-subtext'}>
                        {s.months}m
                      </span>
                    </p>
                    <p
                      className="leading-tight tabular-nums"
                      style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem' }}
                    >
                      {formatCurrency(s.quota)}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
        {/* 02 Pago extra */}
        <section
          aria-labelledby="sim-extra-title"
          className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm lg:p-6"
        >
          <div className="mb-4 flex items-baseline gap-3">
            <span className="sim-numeral shrink-0">02</span>
            <div className="min-w-0">
              <h3 id="sim-extra-title" className="text-base font-bold text-text">
                Pago extra puntual
              </h3>
              <p className="text-[11px] leading-relaxed text-subtext">
                Adelanta dinero sobre una deuda activa sin tocar la cuota mensual.
              </p>
            </div>
          </div>

          {activeDebts.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/40 px-5 py-8 text-center">
              <span className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-subtext">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16l3-2 2 2 2-2 2 2 2-2 3 2V8z" />
                  <line x1="9" y1="9" x2="15" y2="9" />
                  <line x1="9" y1="13" x2="15" y2="13" />
                </svg>
              </span>
              <p className="text-xs font-semibold leading-tight text-text">
                No tienes deudas activas
              </p>
              <p className="mt-1 max-w-[28ch] text-[11px] leading-relaxed text-subtext">
                Cuando registres una deuda podrás simular aquí cuántos meses te ahorras
                adelantando dinero.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_140px]">
                <Select
                  value={extraDebtId}
                  onChange={setExtraDebtId}
                  options={debtOptions}
                  placeholder="Selecciona deuda…"
                  className="w-full"
                  size="md"
                  ariaLabel="Deuda"
                />
                <div
                  className="relative rounded-xl"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <span
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-brand"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    €
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={extraAmount}
                    onChange={(e) => setExtraAmount(e.target.value)}
                    placeholder="0,00"
                    aria-label="Importe extra"
                    className="w-full rounded-xl border-none bg-transparent py-2.5 pl-9 pr-4 text-right text-sm tabular-nums text-text focus:outline-none"
                  />
                </div>
              </div>

              {extraDebt && extraDebtMetrics && extraResult ? (
                <ExtraPaymentResult
                  debt={extraDebt}
                  monthsRemaining={extraDebtMetrics.monthsRemaining}
                  result={extraResult}
                />
              ) : extraDebt ? (
                <p className="mt-1 text-[11px] leading-relaxed text-subtext">
                  Introduce un importe para ver el efecto sobre{' '}
                  <span className="font-semibold text-text">{extraDebt.name}</span>.
                </p>
              ) : (
                <p className="mt-1 text-[11px] leading-relaxed text-subtext">
                  Elige una deuda activa para empezar.
                </p>
              )}
            </>
          )}
        </section>

        {/* 03 Recomendación */}
        <section
          aria-labelledby="sim-rec-title"
          className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm lg:p-6"
          style={{
            background:
              'linear-gradient(180deg, color-mix(in srgb, var(--color-accent) 7%, var(--color-card)) 0%, var(--color-card) 60%)',
          }}
        >
          <div className="mb-4 flex items-baseline gap-3">
            <span className="sim-numeral shrink-0">03</span>
            <div className="min-w-0">
              <h3 id="sim-rec-title" className="text-base font-bold text-text">
                Plan recomendado
              </h3>
              <p className="text-[11px] leading-relaxed text-subtext">
                Cruzamos la cuota con tu ahorro mensual medio (últimos 6 meses).
              </p>
            </div>
          </div>

          {monthlyCapacity <= 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/40 px-5 py-8 text-center">
              <span className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-subtext">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </span>
              <p className="text-xs font-semibold leading-tight text-text">
                Aún sin datos para recomendar
              </p>
              <p className="mt-1 max-w-[34ch] text-[11px] leading-relaxed text-subtext">
                Necesitamos al menos un mes con ingresos mayores que gastos. Sigue registrando
                movimientos y volveremos con un plan a tu medida.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-baseline gap-3">
                <p
                  className="shrink-0 leading-none tabular-nums text-income"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(1.6rem, 3vw, 2rem)',
                  }}
                >
                  {formatCurrency(animCapacity)}
                </p>
                <p className="text-[11px] leading-snug text-subtext">
                  es lo que sueles ahorrar al mes según tus últimos 6 meses.
                </p>
              </div>

              {proposalEvaluation && <ProposalLine rec={proposalEvaluation} />}

              {plans && (
                <div className="mt-4 space-y-1.5 border-t border-border pt-4">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-subtext">
                    Tres ritmos posibles
                  </p>
                  <PlanRow
                    label="Tranquilo"
                    subtitle="Más holgura, más meses"
                    rec={plans.calm}
                    onPick={(r) => setCalcMonths(r.months)}
                  />
                  <PlanRow
                    label="Óptimo"
                    subtitle="Buen equilibrio"
                    rec={plans.optimal}
                    highlight
                    onPick={(r) => setCalcMonths(r.months)}
                  />
                  <PlanRow
                    label="Rápido"
                    subtitle="Saldas antes, menos margen"
                    rec={plans.fast}
                    onPick={(r) => setCalcMonths(r.months)}
                  />
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}

function ExtraPaymentResult({
  debt,
  monthsRemaining,
  result,
}: {
  debt: Debt
  monthsRemaining: number
  result: {
    cappedExtra: number
    newPending: number
    newMonths: number
    newEnd: string
    oldEnd: string
    monthsSaved: number
  }
}) {
  const data = [
    {
      name: 'Antes',
      meses: monthsRemaining,
      fill: 'color-mix(in srgb, var(--color-subtext) 35%, transparent)',
    },
    { name: 'Después', meses: result.newMonths, fill: 'var(--color-income)' },
  ]
  const max = Math.max(monthsRemaining, result.newMonths, 1)

  return (
    <div className="flex flex-1 flex-col">
      <div className="-ml-1 h-[88px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 6, right: 8, bottom: 4, left: 8 }}
          >
            <XAxis type="number" hide domain={[0, max]} />
            <YAxis
              type="category"
              dataKey="name"
              axisLine={false}
              tickLine={false}
              width={56}
              tick={{
                fontSize: 11,
                fill: 'var(--color-subtext)',
                fontFamily: 'var(--font-body)',
              }}
            />
            <Tooltip
              cursor={{
                fill: 'color-mix(in srgb, var(--color-text) 5%, transparent)',
                radius: 8,
              }}
              content={
                <ChartTooltip
                  valueFormatter={(v) => `${v} ${v === 1 ? 'mes' : 'meses'}`}
                  nameFormatter={() => 'Restantes'}
                />
              }
            />
            <Bar
              dataKey="meses"
              radius={[6, 6, 6, 6]}
              animationDuration={700}
              animationEasing="ease-out"
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 space-y-1 rounded-xl border border-income/25 bg-income-light px-4 py-3">
        {result.newMonths === 0 ? (
          <p className="text-xs leading-relaxed text-text">
            Aportando{' '}
            <span className="font-bold tabular-nums">{formatCurrency(result.cappedExtra)}</span>
            , la deuda quedaría <span className="font-bold text-income">saldada</span> con este
            pago.
          </p>
        ) : (
          <>
            <p className="text-xs leading-relaxed text-text">
              Aportando{' '}
              <span className="font-bold tabular-nums">
                {formatCurrency(result.cappedExtra)}
              </span>
              , te quedarían{' '}
              <span className="font-bold tabular-nums">
                {result.newMonths} {result.newMonths === 1 ? 'mes' : 'meses'}
              </span>{' '}
              en lugar de {monthsRemaining}.
            </p>
            <p className="text-[11px] leading-relaxed text-subtext">
              Saldarías en{' '}
              <span className="font-semibold text-text">{prettyMonth(result.newEnd)}</span> en
              vez de <span className="line-through">{prettyMonth(result.oldEnd)}</span>.
            </p>
          </>
        )}
        {result.monthsSaved > 0 && (
          <p className="text-xs font-bold leading-tight text-income">
            Te ahorras {result.monthsSaved} {result.monthsSaved === 1 ? 'mes' : 'meses'} de
            pagos.
          </p>
        )}
        <p className="sr-only">{debt.name}</p>
      </div>
    </div>
  )
}

function ProposalLine({ rec }: { rec: Recommendation }) {
  const palette = {
    ok: { dot: 'var(--color-income)', label: 'Cómodo', tone: 'text-income' },
    tight: { dot: 'var(--color-brand)', label: 'Ajustado', tone: 'text-brand' },
    risk: { dot: 'var(--color-expense)', label: 'Riesgo', tone: 'text-expense' },
    unknown: { dot: 'var(--color-subtext)', label: 'Sin datos', tone: 'text-subtext' },
  } as const
  const p = palette[rec.severity]
  return (
    <p className="text-xs leading-relaxed text-text">
      <span className="mr-1.5 inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{
            background: p.dot,
            boxShadow: `0 0 0 3px color-mix(in srgb, ${p.dot} 18%, transparent)`,
          }}
        />
        <span className={`text-[11px] font-bold uppercase tracking-wider ${p.tone}`}>
          {p.label}.
        </span>
      </span>
      {rec.hint}
      {rec.severity !== 'unknown' && (
        <>
          {' '}
          Margen estimado{' '}
          <span className="font-semibold tabular-nums">
            {rec.margin >= 0 ? '+' : ''}
            {formatCurrency(rec.margin)}/mes
          </span>
          .
        </>
      )}
    </p>
  )
}

function PlanRow({
  label,
  subtitle,
  rec,
  highlight,
  onPick,
}: {
  label: string
  subtitle: string
  rec: Recommendation
  highlight?: boolean
  onPick: (rec: Recommendation) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(rec)}
      className={`group flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
        highlight ? 'bg-brand-light' : 'hover:bg-surface'
      }`}
      style={
        highlight
          ? {
              boxShadow:
                '0 0 0 1px color-mix(in srgb, var(--color-brand) 35%, transparent) inset',
            }
          : undefined
      }
    >
      <div className="min-w-0 flex-1">
        <p
          className={`text-[11px] font-bold uppercase leading-tight tracking-wider ${
            highlight ? 'text-brand' : 'text-text'
          }`}
        >
          {label}
          {highlight && (
            <span className="ml-1.5 text-[9px] font-semibold normal-case tracking-normal text-brand/70">
              recomendado
            </span>
          )}
        </p>
        <p className="mt-0.5 text-[11px] leading-tight text-subtext">{subtitle}</p>
      </div>
      <div className="shrink-0 text-right">
        <p
          className="leading-none tabular-nums"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.05rem',
            color: highlight ? 'var(--color-brand)' : 'var(--color-text)',
          }}
        >
          {formatCurrency(rec.quota)}
          <span className="text-[10px] font-medium text-subtext"> /m</span>
        </p>
        <p className="mt-0.5 text-[10px] tabular-nums text-subtext">
          {rec.months}m, margen {rec.margin >= 0 ? '+' : ''}
          {formatCurrency(rec.margin)}
        </p>
      </div>
      <span
        aria-hidden="true"
        className={`shrink-0 transition-transform group-hover:translate-x-0.5 ${
          highlight ? 'text-brand' : 'text-subtext'
        }`}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </span>
    </button>
  )
}
