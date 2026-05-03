import { useEffect, useMemo, useState } from 'react'
import { BentoTile } from '../../components/shopping/BentoTile'
import { SupermarketChip } from '../../components/shopping/SupermarketChip'
import { shoppingRepository } from '../../repositories'
import type { ShoppingSettings, ShoppingItemWithPrices, SupermarketId } from '../../../shared/types'
import type { RefreshSummary } from '../../repositories/ShoppingRepository'

interface Props {
  settings: ShoppingSettings | null
  items: ShoppingItemWithPrices[]
  refreshing: boolean
  onSaveSettings: (data: Partial<ShoppingSettings>) => Promise<void>
  onRefresh: () => Promise<RefreshSummary>
  onClearCatalog: () => Promise<{ deleted: { items: number; skus: number; snapshots: number; entries: number } }>
}

const SUPERS: Array<{ id: SupermarketId; status: 'real' | 'soon'; note?: string }> = [
  { id: 'mercadona', status: 'real' },
  { id: 'dia',       status: 'real' },
  { id: 'carrefour', status: 'soon', note: 'Akamai bloquea peticiones desde apps de escritorio. Pendiente de vía alternativa.' },
  { id: 'lidl',      status: 'soon', note: 'Sin catálogo navegable público. Pendiente de folleto-only o entrada manual.' },
]

const STATUS_LABEL: Record<'real' | 'soon', { label: string; color: string }> = {
  real: { label: 'EN DIRECTO',   color: 'var(--shop-primary)' },
  soon: { label: 'PRÓXIMAMENTE', color: 'var(--color-subtext)' },
}

export function ShoppingSettingsScreen({ settings, items, refreshing, onSaveSettings, onRefresh, onClearCatalog }: Props) {
  // ── Estado local del CP ─────────────────────────────────────────────────
  const [cpDraft, setCpDraft] = useState(settings?.postal_code ?? '')
  const [cpStatus, setCpStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid' | 'error'>('idle')
  const [cpSaved, setCpSaved] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    setCpDraft(settings?.postal_code ?? '')
  }, [settings?.postal_code])

  const cpDirty = cpDraft.trim() !== (settings?.postal_code ?? '')

  const handleValidateCp = async () => {
    const pc = cpDraft.trim()
    if (!/^\d{5}$/.test(pc)) {
      setCpStatus('invalid')
      return
    }
    setCpStatus('validating')
    try {
      const ok = await shoppingRepository.validatePostalCode(pc)
      setCpStatus(ok ? 'valid' : 'invalid')
    } catch {
      setCpStatus('error')
    }
  }

  const handleSaveCp = async () => {
    const pc = cpDraft.trim()
    await onSaveSettings({ postal_code: pc || null })
    setCpSaved(true)
    window.setTimeout(() => setCpSaved(false), 2500)
  }

  const handleClearCp = async () => {
    setCpDraft('')
    setCpStatus('idle')
    await onSaveSettings({ postal_code: null })
  }

  // ── Stats agregados ─────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalItems = items.length
    const linkedToReal = items.filter(it =>
      it.prices.some(p => p.available && p.supermarket === 'mercadona' && /^\d+$/.test(p.sku))
    ).length
    const totalSnapshots = items.reduce((acc, it) => acc + it.recent_min.length, 0)
    return { totalItems, linkedToReal, totalSnapshots }
  }, [items])

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Bloque CP */}
      <BentoTile
        accent="var(--shop-primary)"
        eyebrow="Geolocalización"
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        }
      >
        <h3 className="text-base font-semibold text-text mb-1">Código postal</h3>
        <p className="text-xs text-subtext mb-4 leading-relaxed">
          Mercadona varía precios según el almacén regional. El CP determina qué precios verás.
          Si lo dejas vacío, usaremos el catálogo por defecto del super.
        </p>

        <div className="flex flex-wrap gap-2 items-stretch">
          <input
            type="text"
            inputMode="numeric"
            pattern="\d{5}"
            maxLength={5}
            value={cpDraft}
            onChange={e => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 5)
              setCpDraft(v)
              setCpStatus('idle')
            }}
            placeholder="28001"
            className="px-4 py-2.5 rounded-xl bg-surface border border-border text-base text-text placeholder:text-subtext focus:outline-none w-32 tabular-nums"
            aria-label="Código postal"
          />
          <button
            type="button"
            onClick={handleValidateCp}
            disabled={cpDraft.length !== 5 || cpStatus === 'validating'}
            className="px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            style={{
              background: 'var(--color-card)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
          >
            {cpStatus === 'validating' && (
              <span
                className="w-3 h-3 rounded-full border-2 animate-spin"
                style={{ borderColor: 'var(--shop-primary)', borderTopColor: 'transparent' }}
              />
            )}
            Validar
          </button>
          {cpDirty && (
            <button
              type="button"
              onClick={handleSaveCp}
              className="btn-primary px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-income hover:bg-income-hover cursor-pointer"
            >
              Guardar
            </button>
          )}
          {settings?.postal_code && (
            <button
              type="button"
              onClick={handleClearCp}
              className="px-3 py-2.5 rounded-xl text-xs font-medium text-subtext hover:text-expense cursor-pointer"
            >
              Limpiar
            </button>
          )}
        </div>

        <CpStatusLine status={cpStatus} cpSaved={cpSaved} />
      </BentoTile>

      {/* Bloque Supers */}
      <BentoTile
        accent="var(--shop-accent)"
        eyebrow="Supermercados"
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3h2l2.4 12.4a2 2 0 0 0 2 1.6h9.2a2 2 0 0 0 2-1.6L23 6H6" />
            <circle cx="9" cy="20" r="1.6" />
            <circle cx="18" cy="20" r="1.6" />
          </svg>
        }
      >
        <p className="text-xs text-subtext mb-4 leading-relaxed">
          Estado actual de la integración con cada super.
          <strong> EN DIRECTO</strong> = precios reales y estables vía API pública.
          <strong> PRÓXIMAMENTE</strong> = la integración no es viable hoy por restricciones técnicas del super.
        </p>
        <ul className="space-y-2.5">
          {SUPERS.map(({ id, status, note }) => (
            <li key={id} className="flex flex-col gap-1.5 px-3 py-2.5 rounded-xl border border-border bg-surface/40">
              <div className="flex items-center justify-between gap-3">
                <SupermarketChip id={id} variant="dot" size="sm" />
                <span
                  className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full"
                  style={{
                    background: `color-mix(in srgb, ${STATUS_LABEL[status].color} 14%, transparent)`,
                    color: STATUS_LABEL[status].color,
                    border: `1px solid color-mix(in srgb, ${STATUS_LABEL[status].color} 28%, transparent)`,
                  }}
                >
                  {STATUS_LABEL[status].label}
                </span>
              </div>
              {note && (
                <p className="text-[10px] text-subtext leading-relaxed">{note}</p>
              )}
            </li>
          ))}
        </ul>
      </BentoTile>

      {/* Bloque Actualizaciones */}
      <BentoTile
        accent="var(--color-brand)"
        eyebrow="Actualizaciones"
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Productos" value={stats.totalItems} />
            <Stat label="Reales" value={stats.linkedToReal} accent="var(--shop-primary)" />
            <Stat label="Snapshots" value={stats.totalSnapshots} />
          </div>

          <div className="text-xs text-subtext leading-relaxed">
            Última actualización:{' '}
            <strong className="text-text">{formatLastRefresh(settings?.last_refresh_at)}</strong>
            <br />
            La app refresca automáticamente cada 24 horas al abrir el módulo.
          </div>

          <button
            type="button"
            onClick={() => { void onRefresh() }}
            disabled={refreshing}
            className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-income hover:bg-income-hover cursor-pointer disabled:opacity-50 disabled:cursor-wait"
          >
            {refreshing ? (
              <>
                <span
                  className="w-4 h-4 rounded-full border-2 animate-spin"
                  style={{ borderColor: 'white', borderTopColor: 'transparent' }}
                />
                Actualizando…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                Refrescar precios ahora
              </>
            )}
          </button>
        </div>
      </BentoTile>

      {/* Bloque Zona peligrosa */}
      <BentoTile
        accent="var(--color-expense)"
        eyebrow="Zona peligrosa"
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
        }
      >
        <h3 className="text-base font-semibold text-text mb-1">Vaciar catálogo</h3>
        <p className="text-xs text-subtext mb-4 leading-relaxed">
          Borra <strong>todos los productos, sus SKUs por super, el histórico de precios y los items de tus listas</strong>.
          Las listas en sí se conservan vacías. Tu CP y demás ajustes no se tocan.
          <br />
          <span className="text-[11px]" style={{ color: 'var(--color-expense)' }}>
            Útil para empezar de cero sin los datos de demostración. La acción no se puede deshacer.
          </span>
        </p>

        {!confirmClear ? (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            disabled={items.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'var(--color-expense-light)',
              color: 'var(--color-expense)',
              border: '1px solid color-mix(in srgb, var(--color-expense) 30%, transparent)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            </svg>
            Vaciar catálogo ({items.length} {items.length === 1 ? 'producto' : 'productos'})
          </button>
        ) : (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-semibold text-text">¿Seguro? Vas a borrar {items.length} productos.</span>
            <button
              type="button"
              onClick={() => setConfirmClear(false)}
              disabled={clearing}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-subtext bg-surface border border-border hover:text-text cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={async () => {
                setClearing(true)
                try {
                  await onClearCatalog()
                  setConfirmClear(false)
                } finally {
                  setClearing(false)
                }
              }}
              disabled={clearing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white cursor-pointer disabled:opacity-50 disabled:cursor-wait"
              style={{ background: 'var(--color-expense)' }}
            >
              {clearing && (
                <span
                  className="w-3 h-3 rounded-full border-2 animate-spin"
                  style={{ borderColor: 'white', borderTopColor: 'transparent' }}
                />
              )}
              Sí, borrar todo
            </button>
          </div>
        )}
      </BentoTile>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function CpStatusLine({ status, cpSaved }: { status: string; cpSaved: boolean }) {
  if (cpSaved) return <p className="text-xs mt-3" style={{ color: 'var(--shop-primary)' }}>✓ Guardado</p>
  if (status === 'valid')      return <p className="text-xs mt-3" style={{ color: 'var(--shop-primary)' }}>✓ CP válido en Mercadona — guarda para aplicar</p>
  if (status === 'invalid')    return <p className="text-xs mt-3 text-error">CP fuera del área de cobertura de Mercadona</p>
  if (status === 'error')      return <p className="text-xs mt-3 text-error">No se pudo validar (sin conexión?)</p>
  if (status === 'validating') return <p className="text-xs mt-3 text-subtext">Comprobando…</p>
  return null
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface/40 px-3 py-3">
      <p
        className="text-2xl font-bold tabular-nums leading-tight"
        style={{
          color: accent ?? 'var(--color-text)',
          fontFamily: 'var(--font-numeric)',
        }}
      >
        {value.toLocaleString('es-ES')}
      </p>
      <p className="text-[10px] uppercase tracking-wider text-subtext font-semibold mt-1">
        {label}
      </p>
    </div>
  )
}

function formatLastRefresh(iso: string | null | undefined): string {
  if (!iso) return 'nunca'
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return 'hace un momento'
  const min = Math.round(ms / 60_000)
  if (min < 60) return `hace ${min} ${min === 1 ? 'minuto' : 'minutos'}`
  const h = Math.round(min / 60)
  if (h < 24) return `hace ${h} ${h === 1 ? 'hora' : 'horas'}`
  const d = Math.round(h / 24)
  return `hace ${d} ${d === 1 ? 'día' : 'días'}`
}
