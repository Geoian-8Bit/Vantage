import { useMemo, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip,
  BarChart, Bar, Cell,
} from 'recharts'
import type { Debt, SavingsAccount } from '../../shared/types'
import { useDashboard } from '../hooks/useDashboard'
import { useSavings } from '../hooks/useSavings'
import { useAnimatedNumber } from '../hooks/useAnimatedNumber'
import { formatCurrency, getTodayString } from '../lib/utils'
import {
  monthsForQuota,
  quotaForMonths,
  scenarios,
  prettyMonth,
  addMonths,
  averageMonthlyCapacity,
  evaluateProposal,
  recommendPlans,
  type Recommendation,
} from '../lib/debtMath'
import { Select, type SelectOption } from './Select'
import { ChartTooltip } from './charts/ChartTheme'

interface DebtSimulatorProps {
  /** Deudas activas para alimentar la sección "Pago extra" */
  activeDebts: Debt[]
}

type FundsSource = 'none' | 'savings' | 'free'

export function DebtSimulator({ activeDebts }: DebtSimulatorProps) {
  const { stats } = useDashboard()
  const { accounts: savingsAccounts } = useSavings()

  // ── Calculadora ──────────────────────────────────────────────────────────
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
      const acc = savingsAccounts.find(a => a.id === fundsAccountId)
      return acc?.balance ?? 0
    }
    if (fundsSource === 'free') {
      const n = parseFloat(fundsFreeAmount)
      return isFinite(n) && n > 0 ? n : 0
    }
    return 0
  }, [fundsSource, fundsAccountId, fundsFreeAmount, savingsAccounts])

  const netCapital = useMemo(
    () => Math.max(0, capitalNum - fundsAvailable),
    [capitalNum, fundsAvailable],
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

  /** Curva del capital pendiente mes a mes (lineal porque no hay intereses). */
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

  // ── Pago extra ──────────────────────────────────────────────────────────
  const [extraDebtId, setExtraDebtId] = useState<string>(activeDebts[0]?.id ?? '')
  const [extraAmount, setExtraAmount] = useState<string>('')
  const extraDebt = useMemo(
    () => activeDebts.find(d => d.id === extraDebtId) ?? null,
    [activeDebts, extraDebtId],
  )
  const extraResult = useMemo(() => {
    if (!extraDebt) return null
    const a = parseFloat(extraAmount)
    if (!isFinite(a) || a <= 0) return null
    const cappedExtra = Math.min(a, extraDebt.pending)
    const newPending = Math.max(0, extraDebt.pending - cappedExtra)
    const newMonths = newPending > 0 ? monthsForQuota(newPending, extraDebt.monthly_amount) : 0
    const today = getTodayString()
    const newEnd = addMonths(today, Math.max(0, newMonths - 1))
    const oldEnd = addMonths(today, Math.max(0, extraDebt.months_remaining - 1))
    const monthsSaved = Math.max(0, extraDebt.months_remaining - newMonths)
    return { cappedExtra, newPending, newMonths, newEnd, oldEnd, monthsSaved }
  }, [extraDebt, extraAmount])

  // ── Recomendación ───────────────────────────────────────────────────────
  const monthlyCapacity = useMemo(
    () => stats ? averageMonthlyCapacity(stats.monthlyTrend) : 0,
    [stats],
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

  // ── Listas para selects ──────────────────────────────────────────────────
  const savingsOptions: SelectOption[] = savingsAccounts
    .filter(a => a.balance > 0)
    .map((a: SavingsAccount) => ({
      value: a.id,
      label: `${a.name} · ${formatCurrency(a.balance)}`,
    }))

  const debtOptions: SelectOption[] = activeDebts.map(d => ({
    value: d.id,
    label: `${d.name} · ${formatCurrency(d.pending)} pendiente`,
  }))

  // Slider 1..60 → relleno %
  const sliderFill = `${((calcMonths - 1) / 59) * 100}%`

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* ─── Encabezado del simulador (sin card) ───────────────────────────── */}
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <h2
            className="text-text leading-tight"
            style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 2.4vw, 1.875rem)', letterSpacing: 'var(--letter-spacing-display)' }}
          >
            Simulador
          </h2>
          <p className="text-sm text-subtext leading-relaxed mt-0.5 max-w-prose">
            Proyecta una deuda nueva, calcula el efecto de un pago extra y compara la cuota con tu ahorro habitual.
          </p>
        </div>
        {monthlyCapacity > 0 && (
          <p className="text-[11px] text-subtext tabular-nums">
            Tu capacidad media: <span className="font-bold text-income">{formatCurrency(animCapacity)}</span> al mes
          </p>
        )}
      </header>

      {/* ═══════════════════════════════════════════════════════════════════
          1. CALCULADORA — banco principal
          ═══════════════════════════════════════════════════════════════════ */}
      <section
        aria-labelledby="sim-calc-title"
        className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden"
      >
        <div className="px-5 lg:px-6 pt-5 lg:pt-6 pb-2 flex items-baseline justify-between gap-4">
          <div className="flex items-baseline gap-3 min-w-0">
            <span className="sim-numeral shrink-0">01</span>
            <h3 id="sim-calc-title" className="text-base font-bold text-text">Proyectar una deuda</h3>
          </div>
          <p className="hidden md:block text-[11px] text-subtext italic shrink-0">
            Sin intereses, reparto lineal mes a mes
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 px-5 lg:px-6 pb-5 lg:pb-6">
          {/* ── Inputs (columna izquierda) ── */}
          <div className="lg:col-span-7 space-y-5">
            {/* Capital */}
            <div>
              <label className="block text-[11px] font-semibold text-subtext uppercase tracking-wider mb-1.5">
                Capital de la deuda
              </label>
              <div
                className="relative rounded-xl"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              >
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-brand pointer-events-none" style={{ fontFamily: 'var(--font-display)' }}>€</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={calcCapital}
                  onChange={e => setCalcCapital(e.target.value)}
                  placeholder="0,00"
                  className="w-full rounded-xl bg-transparent pl-10 pr-4 py-3 text-base text-text text-right tabular-nums focus:outline-none border-none"
                  style={{ fontFamily: 'var(--font-display)' }}
                />
              </div>
            </div>

            {/* Slider con número grande al lado */}
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <label className="text-[11px] font-semibold text-subtext uppercase tracking-wider">
                  Plazo
                </label>
                <span className="text-[10px] text-subtext italic">arrastra para ajustar</span>
              </div>
              <div className="flex items-center gap-5">
                <div className="flex-1 min-w-0">
                  <input
                    type="range"
                    min={1}
                    max={60}
                    step={1}
                    value={calcMonths}
                    onChange={e => setCalcMonths(parseInt(e.target.value, 10))}
                    className="range-clay"
                    style={{ ['--fill' as string]: sliderFill }}
                    aria-label="Plazo en meses"
                    aria-valuetext={`${calcMonths} meses`}
                  />
                  <div className="flex justify-between text-[10px] text-subtext mt-1 tabular-nums">
                    <span>1m</span><span>12m</span><span>24m</span><span>36m</span><span>60m</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className="text-brand tabular-nums leading-none"
                    style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.25rem, 4.5vw, 3rem)' }}
                  >
                    {Math.round(animMonths)}
                  </p>
                  <p className="text-[10px] text-subtext uppercase tracking-wider mt-0.5">
                    {calcMonths === 1 ? 'mes' : 'meses'}
                  </p>
                </div>
              </div>
            </div>

            {/* Toggle "+ Sumar dinero ya ahorrado" — chip que despliega panel inline */}
            <div>
              <button
                type="button"
                onClick={() => {
                  setFundsOpen(o => !o)
                  if (!fundsOpen && fundsSource === 'none') setFundsSource('savings')
                  if (fundsOpen) setFundsSource('none')
                }}
                aria-expanded={fundsOpen}
                className="inline-flex items-center gap-2 text-[11px] font-semibold text-subtext hover:text-text transition-colors cursor-pointer"
              >
                <span
                  className="w-5 h-5 rounded-full border border-border bg-surface flex items-center justify-center transition-colors"
                  style={{
                    background: fundsOpen ? 'var(--color-brand)' : 'var(--color-surface)',
                    borderColor: fundsOpen ? 'var(--color-brand)' : 'var(--color-border)',
                    color: fundsOpen ? 'white' : 'var(--color-subtext)',
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: fundsOpen ? 'rotate(45deg)' : 'rotate(0)', transition: 'transform var(--duration-base) var(--ease-spring)' }}>
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
                <span>{fundsOpen ? 'Sin descontar nada ya ahorrado' : 'Sumar dinero ya ahorrado'}</span>
              </button>

              {fundsOpen && (
                <div className="mt-3 rounded-xl bg-surface/60 border border-border p-3 space-y-2.5" style={{ animation: 'fade-up var(--duration-base) var(--ease-spring) both' }}>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFundsSource('savings')}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${fundsSource === 'savings' ? 'bg-brand text-white' : 'bg-card text-subtext border border-border hover:text-text'}`}
                    >
                      Desde un apartado
                    </button>
                    <button
                      type="button"
                      onClick={() => setFundsSource('free')}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${fundsSource === 'free' ? 'bg-brand text-white' : 'bg-card text-subtext border border-border hover:text-text'}`}
                    >
                      Importe libre
                    </button>
                  </div>

                  {fundsSource === 'savings' && (
                    savingsOptions.length === 0 ? (
                      <p className="text-[11px] text-subtext leading-relaxed">
                        Aún no tienes apartados con saldo. Crea uno desde la sección Ahorros y aparecerá aquí.
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
                    )
                  )}

                  {fundsSource === 'free' && (
                    <div
                      className="relative rounded-xl"
                      style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
                    >
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-brand pointer-events-none" style={{ fontFamily: 'var(--font-display)' }}>€</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={fundsFreeAmount}
                        onChange={e => setFundsFreeAmount(e.target.value)}
                        placeholder="0,00"
                        className="w-full rounded-xl bg-transparent pl-9 pr-4 py-2 text-sm text-text text-right tabular-nums focus:outline-none border-none"
                      />
                    </div>
                  )}

                  {fundsAvailable > 0 && capitalNum > 0 && (
                    <p className="text-[11px] text-subtext leading-relaxed">
                      Restando <span className="font-semibold text-text tabular-nums">{formatCurrency(fundsAvailable)}</span>, financiarías <span className="font-semibold text-text tabular-nums">{formatCurrency(netCapital)}</span>. El dinero del apartado no se mueve, solo se simula.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Visualización (columna derecha) ── */}
          <div className="lg:col-span-5 flex flex-col">
            {calcResult ? (
              <>
                <div className="rounded-xl bg-surface/40 border border-border px-4 py-3 mb-3">
                  <p className="text-[10px] text-subtext uppercase tracking-wider font-semibold mb-1">
                    Cuota mensual estimada
                  </p>
                  <p
                    className="text-brand tabular-nums leading-none"
                    style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.75rem, 3.6vw, 2.25rem)' }}
                  >
                    {formatCurrency(animQuota)}
                    <span className="text-xs font-medium text-subtext"> / mes</span>
                  </p>
                  <p className="text-[11px] text-subtext mt-1.5 leading-snug">
                    Saldarías la deuda en <span className="font-semibold text-text">{prettyMonth(calcResult.endDate)}</span>.
                  </p>
                </div>

                {/* Mini AreaChart de capital pendiente mes a mes */}
                <div className="flex-1 min-h-[120px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={capitalCurve} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="sim-curve" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.45} />
                          <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" hide />
                      <YAxis hide domain={[0, 'dataMax']} />
                      <Tooltip
                        cursor={{ stroke: 'color-mix(in srgb, var(--color-text) 18%, transparent)', strokeDasharray: '4 4', strokeWidth: 1 }}
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
                          style: { filter: 'drop-shadow(0 4px 10px color-mix(in srgb, var(--color-brand) 35%, transparent))' },
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  <p className="text-[10px] text-subtext text-center mt-1">
                    Capital pendiente en cada cuota
                  </p>
                </div>
              </>
            ) : (
              <div className="flex-1 min-h-[180px] rounded-xl border border-dashed border-border bg-surface/30 flex flex-col items-center justify-center text-center px-6 py-8">
                <span className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-subtext mb-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3v18h18" /><path d="M7 14l4-4 4 4 5-5" />
                  </svg>
                </span>
                <p className="text-[11px] text-subtext leading-relaxed">
                  Indica un capital mayor que 0 para ver la cuota y la curva de amortización.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Tira de escenarios alternativos ── */}
        {calcScenarios.length > 0 && (
          <div className="border-t border-border bg-surface/40 px-5 lg:px-6 py-4">
            <div className="flex items-baseline justify-between mb-2.5">
              <p className="text-[11px] font-semibold text-subtext uppercase tracking-wider">Otros plazos</p>
              <p className="text-[10px] text-subtext italic">toca uno para probarlo</p>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" role="list">
              {calcScenarios.map((s, idx) => {
                const isActive = s.months === calcMonths
                return (
                  <button
                    key={s.months}
                    type="button"
                    role="listitem"
                    onClick={() => setCalcMonths(s.months)}
                    className={`sim-chip shrink-0 rounded-xl px-3 py-2 text-left cursor-pointer transition-all ${isActive ? 'bg-brand text-white shadow-md' : 'bg-card border border-border text-text hover:border-brand hover:bg-brand-light'}`}
                    style={{ animationDelay: `${idx * 30}ms`, minWidth: 92 }}
                    aria-pressed={isActive}
                  >
                    <p className="text-[10px] uppercase tracking-wider font-semibold leading-none mb-1">
                      <span className={isActive ? 'text-white/80' : 'text-subtext'}>{s.months}m</span>
                    </p>
                    <p
                      className="tabular-nums leading-tight"
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

      {/* ═══════════════════════════════════════════════════════════════════
          2 + 3. PAGO EXTRA  /  RECOMENDACIÓN — paneles secundarios
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">

        {/* ── 02. Pago extra ── */}
        <section
          aria-labelledby="sim-extra-title"
          className="rounded-2xl bg-card border border-border shadow-sm p-5 lg:p-6 flex flex-col"
        >
          <div className="flex items-baseline gap-3 mb-4">
            <span className="sim-numeral shrink-0">02</span>
            <div className="min-w-0">
              <h3 id="sim-extra-title" className="text-base font-bold text-text">Pago extra puntual</h3>
              <p className="text-[11px] text-subtext leading-relaxed">
                Adelanta dinero sobre una deuda activa sin tocar la cuota mensual.
              </p>
            </div>
          </div>

          {activeDebts.length === 0 ? (
            <div className="flex-1 rounded-xl border border-dashed border-border bg-surface/40 flex flex-col items-center justify-center text-center px-5 py-8">
              <span className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-subtext mb-2.5">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16l3-2 2 2 2-2 2 2 2-2 3 2V8z" />
                  <line x1="9" y1="9" x2="15" y2="9" /><line x1="9" y1="13" x2="15" y2="13" />
                </svg>
              </span>
              <p className="text-xs text-text font-semibold leading-tight">No tienes deudas activas</p>
              <p className="text-[11px] text-subtext mt-1 leading-relaxed max-w-[28ch]">
                Cuando registres una deuda podrás simular aquí cuántos meses te ahorras adelantando dinero.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-2.5 mb-4">
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
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                >
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-brand pointer-events-none" style={{ fontFamily: 'var(--font-display)' }}>€</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={extraAmount}
                    onChange={e => setExtraAmount(e.target.value)}
                    placeholder="0,00"
                    aria-label="Importe extra"
                    className="w-full rounded-xl bg-transparent pl-9 pr-4 py-2.5 text-sm text-text text-right tabular-nums focus:outline-none border-none"
                  />
                </div>
              </div>

              {extraDebt && extraResult ? (
                <ExtraPaymentResult debt={extraDebt} result={extraResult} />
              ) : extraDebt ? (
                <p className="text-[11px] text-subtext leading-relaxed mt-1">
                  Introduce un importe para ver el efecto sobre <span className="font-semibold text-text">{extraDebt.name}</span>.
                </p>
              ) : (
                <p className="text-[11px] text-subtext leading-relaxed mt-1">
                  Elige una deuda activa para empezar.
                </p>
              )}
            </>
          )}
        </section>

        {/* ── 03. Recomendación ── */}
        <section
          aria-labelledby="sim-rec-title"
          className="rounded-2xl bg-card border border-border shadow-sm p-5 lg:p-6 flex flex-col"
          style={{
            background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-accent) 7%, var(--color-card)) 0%, var(--color-card) 60%)',
          }}
        >
          <div className="flex items-baseline gap-3 mb-4">
            <span className="sim-numeral shrink-0">03</span>
            <div className="min-w-0">
              <h3 id="sim-rec-title" className="text-base font-bold text-text">Plan recomendado</h3>
              <p className="text-[11px] text-subtext leading-relaxed">
                Cruzamos la cuota con tu ahorro mensual medio (últimos 6 meses).
              </p>
            </div>
          </div>

          {monthlyCapacity <= 0 ? (
            <div className="flex-1 rounded-xl border border-dashed border-border bg-surface/40 flex flex-col items-center justify-center text-center px-5 py-8">
              <span className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-subtext mb-2.5">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
              </span>
              <p className="text-xs text-text font-semibold leading-tight">Aún sin datos para recomendar</p>
              <p className="text-[11px] text-subtext mt-1 leading-relaxed max-w-[34ch]">
                Necesitamos al menos un mes con ingresos mayores que gastos. Sigue registrando movimientos y volveremos con un plan a tu medida.
              </p>
            </div>
          ) : (
            <>
              {/* Línea narrativa con la capacidad */}
              <div className="flex items-baseline gap-3 mb-3">
                <p
                  className="text-income tabular-nums leading-none shrink-0"
                  style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 3vw, 2rem)' }}
                >
                  {formatCurrency(animCapacity)}
                </p>
                <p className="text-[11px] text-subtext leading-snug">
                  es lo que sueles ahorrar al mes según tus últimos 6 meses.
                </p>
              </div>

              {/* Veredicto sobre la propuesta actual (inline, sin card) */}
              {proposalEvaluation && (
                <ProposalLine rec={proposalEvaluation} />
              )}

              {/* 3 planes como filas, no cards */}
              {plans && (
                <div className="mt-4 pt-4 border-t border-border space-y-1.5">
                  <p className="text-[11px] font-semibold text-subtext uppercase tracking-wider mb-1.5">
                    Tres ritmos posibles
                  </p>
                  <PlanRow label="Tranquilo" subtitle="Más holgura, más meses" rec={plans.calm} onPick={r => setCalcMonths(r.months)} />
                  <PlanRow label="Óptimo" subtitle="Buen equilibrio" rec={plans.optimal} highlight onPick={r => setCalcMonths(r.months)} />
                  <PlanRow label="Rápido" subtitle="Saldas antes, menos margen" rec={plans.fast} onPick={r => setCalcMonths(r.months)} />
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponentes locales

interface ExtraPaymentResultProps {
  debt: Debt
  result: {
    cappedExtra: number
    newPending: number
    newMonths: number
    newEnd: string
    oldEnd: string
    monthsSaved: number
  }
}

function ExtraPaymentResult({ debt, result }: ExtraPaymentResultProps) {
  const data = [
    { name: 'Antes',   meses: debt.months_remaining, fill: 'color-mix(in srgb, var(--color-subtext) 35%, transparent)' },
    { name: 'Después', meses: result.newMonths,      fill: 'var(--color-income)' },
  ]
  const max = Math.max(debt.months_remaining, result.newMonths, 1)

  return (
    <div className="flex-1 flex flex-col">
      {/* Mini bars antes/después */}
      <div className="h-[88px] -ml-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 6, right: 8, bottom: 4, left: 8 }}>
            <XAxis type="number" hide domain={[0, max]} />
            <YAxis
              type="category"
              dataKey="name"
              axisLine={false}
              tickLine={false}
              width={56}
              tick={{ fontSize: 11, fill: 'var(--color-subtext)', fontFamily: 'var(--font-body)' }}
            />
            <Tooltip
              cursor={{ fill: 'color-mix(in srgb, var(--color-text) 5%, transparent)', radius: 8 }}
              content={
                <ChartTooltip
                  valueFormatter={(v) => `${v} ${v === 1 ? 'mes' : 'meses'}`}
                  nameFormatter={() => 'Restantes'}
                />
              }
            />
            <Bar dataKey="meses" radius={[6, 6, 6, 6]} animationDuration={700} animationEasing="ease-out">
              {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Texto narrativo */}
      <div className="rounded-xl bg-income-light border border-income/25 px-4 py-3 mt-2 space-y-1">
        {result.newMonths === 0 ? (
          <p className="text-xs text-text leading-relaxed">
            Aportando <span className="font-bold tabular-nums">{formatCurrency(result.cappedExtra)}</span>, la deuda quedaría <span className="font-bold text-income">saldada</span> con este pago.
          </p>
        ) : (
          <>
            <p className="text-xs text-text leading-relaxed">
              Aportando <span className="font-bold tabular-nums">{formatCurrency(result.cappedExtra)}</span>, te quedarían <span className="font-bold tabular-nums">{result.newMonths} {result.newMonths === 1 ? 'mes' : 'meses'}</span> en lugar de {debt.months_remaining}.
            </p>
            <p className="text-[11px] text-subtext leading-relaxed">
              Saldarías en <span className="font-semibold text-text">{prettyMonth(result.newEnd)}</span> en vez de <span className="line-through">{prettyMonth(result.oldEnd)}</span>.
            </p>
          </>
        )}
        {result.monthsSaved > 0 && (
          <p className="text-xs font-bold text-income leading-tight">
            Te ahorras {result.monthsSaved} {result.monthsSaved === 1 ? 'mes' : 'meses'} de pagos.
          </p>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

interface ProposalLineProps { rec: Recommendation }

function ProposalLine({ rec }: ProposalLineProps) {
  const palette = {
    ok:      { dot: 'var(--color-income)',  label: 'Cómodo',   tone: 'text-income' },
    tight:   { dot: 'var(--color-brand)',   label: 'Ajustado', tone: 'text-brand' },
    risk:    { dot: 'var(--color-expense)', label: 'Riesgo',   tone: 'text-expense' },
    unknown: { dot: 'var(--color-subtext)', label: 'Sin datos', tone: 'text-subtext' },
  } as const
  const p = palette[rec.severity]
  return (
    <p className="text-xs text-text leading-relaxed">
      <span className="inline-flex items-center gap-1.5 mr-1.5">
        <span
          aria-hidden="true"
          className="w-1.5 h-1.5 rounded-full inline-block"
          style={{ background: p.dot, boxShadow: `0 0 0 3px color-mix(in srgb, ${p.dot} 18%, transparent)` }}
        />
        <span className={`text-[11px] font-bold uppercase tracking-wider ${p.tone}`}>{p.label}.</span>
      </span>
      {rec.hint}
      {rec.severity !== 'unknown' && (
        <> Margen estimado <span className="font-semibold tabular-nums">{rec.margin >= 0 ? '+' : ''}{formatCurrency(rec.margin)}/mes</span>.</>
      )}
    </p>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

interface PlanRowProps {
  label: string
  subtitle: string
  rec: Recommendation
  highlight?: boolean
  onPick: (rec: Recommendation) => void
}

function PlanRow({ label, subtitle, rec, highlight, onPick }: PlanRowProps) {
  return (
    <button
      type="button"
      onClick={() => onPick(rec)}
      className={`group w-full text-left rounded-xl px-3 py-2.5 flex items-center gap-3 transition-colors cursor-pointer ${highlight ? 'bg-brand-light' : 'hover:bg-surface'}`}
      style={highlight ? { boxShadow: '0 0 0 1px color-mix(in srgb, var(--color-brand) 35%, transparent) inset' } : undefined}
    >
      <div className="min-w-0 flex-1">
        <p className={`text-[11px] font-bold uppercase tracking-wider leading-tight ${highlight ? 'text-brand' : 'text-text'}`}>
          {label}
          {highlight && (
            <span className="ml-1.5 text-[9px] font-semibold text-brand/70 normal-case tracking-normal">recomendado</span>
          )}
        </p>
        <p className="text-[11px] text-subtext leading-tight mt-0.5">{subtitle}</p>
      </div>
      <div className="text-right shrink-0">
        <p
          className="tabular-nums leading-none"
          style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', color: highlight ? 'var(--color-brand)' : 'var(--color-text)' }}
        >
          {formatCurrency(rec.quota)}<span className="text-[10px] font-medium text-subtext"> /m</span>
        </p>
        <p className="text-[10px] text-subtext tabular-nums mt-0.5">
          {rec.months}m, margen {rec.margin >= 0 ? '+' : ''}{formatCurrency(rec.margin)}
        </p>
      </div>
      <span
        aria-hidden="true"
        className={`shrink-0 transition-transform group-hover:translate-x-0.5 ${highlight ? 'text-brand' : 'text-subtext'}`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </span>
    </button>
  )
}
