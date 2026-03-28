import { useState } from 'react'
import { PageHeader } from '../components/layout/PageHeader'
import { validateRows } from '../lib/importValidation'
import type {
  ImportFilePreview,
  ColumnMapping,
  ImportValidationResult,
  ImportCommitResult,
} from '../../shared/types'

// ── Types ──────────────────────────────────────────────────────────────────

type ImportStep = 'file-select' | 'table-select' | 'column-mapping' | 'confirm'

interface ImportScreenProps {
  onBack: () => void
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StepBadge({ n, label, active }: { n: number; label: string; active: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${active ? 'text-brand' : 'text-subtext'}`}>
      <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${active ? 'bg-brand text-white' : 'bg-surface border border-border text-subtext'}`}>
        {n}
      </span>
      <span className="text-xs font-medium">{label}</span>
    </div>
  )
}

function StepIndicator({ step, fileType }: { step: ImportStep; fileType: 'excel' | 'access' | null }) {
  const steps: { key: ImportStep; label: string }[] = [
    { key: 'file-select',    label: 'Archivo' },
    ...(fileType === 'access' ? [{ key: 'table-select' as ImportStep, label: 'Tabla' }] : []),
    { key: 'column-mapping', label: 'Columnas' },
    { key: 'confirm',        label: 'Confirmar' },
  ]
  return (
    <div className="flex items-center gap-2 lg:gap-4 px-4 lg:px-6 py-3 bg-card rounded-xl border border-border flex-wrap">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-3">
          <StepBadge n={i + 1} label={s.label} active={s.key === step} />
          {i < steps.length - 1 && (
            <div className="w-8 h-px bg-border" />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Step 1: File Select ────────────────────────────────────────────────────

interface FileSelectStepProps {
  onChoose: (type: 'excel' | 'access') => Promise<void>
  loading: boolean
}

function FileSelectStep({ onChoose, loading }: FileSelectStepProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <button
        onClick={() => onChoose('excel')}
        disabled={loading}
        className="rounded-xl bg-card border border-border shadow-sm p-6 text-left flex items-start gap-4 hover:bg-surface/60 hover:border-brand/40 transition-all cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="w-12 h-12 rounded-xl bg-income-light flex items-center justify-center text-income shrink-0 group-hover:bg-income group-hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
            <polyline points="14 2 14 8 20 8"/>
            <path d="M8 13h2"/><path d="M8 17h2"/><path d="M14 13h2"/><path d="M14 17h2"/>
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-text">Excel</p>
          <p className="text-xs text-subtext mt-1 leading-relaxed">Archivos .xlsx o .xls. Compatible con Excel, Google Sheets, LibreOffice.</p>
        </div>
        <svg className="text-subtext mt-1 shrink-0" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>

      <button
        onClick={() => onChoose('access')}
        disabled={loading}
        className="rounded-xl bg-card border border-border shadow-sm p-6 text-left flex items-start gap-4 hover:bg-surface/60 hover:border-brand/40 transition-all cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="w-12 h-12 rounded-xl bg-brand-light flex items-center justify-center text-brand shrink-0 group-hover:bg-brand group-hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3"/>
            <path d="M3 5v14c0 1.657 4.03 3 9 3s9-1.343 9-3V5"/>
            <path d="M3 12c0 1.657 4.03 3 9 3s9-1.343 9-3"/>
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-text">Microsoft Access</p>
          <p className="text-xs text-subtext mt-1 leading-relaxed">Archivos .mdb o .accdb. Ideal para migrar desde una base de datos existente.</p>
        </div>
        <svg className="text-subtext mt-1 shrink-0" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>
    </div>
  )
}

// ── Step 2: Table Select (Access) ──────────────────────────────────────────

interface TableSelectStepProps {
  tables: string[]
  onChoose: (tableName: string) => Promise<void>
  loading: boolean
}

function TableSelectStep({ tables, onChoose, loading }: TableSelectStepProps) {
  return (
    <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-surface/60">
        <p className="text-sm font-semibold text-text">Selecciona una tabla</p>
        <p className="text-xs text-subtext mt-0.5">{tables.length} tablas encontradas</p>
      </div>
      <div className="divide-y divide-border/40">
        {tables.map(t => (
          <button
            key={t}
            onClick={() => onChoose(t)}
            disabled={loading}
            className="w-full text-left px-5 py-3 hover:bg-surface/60 transition-colors flex items-center justify-between group cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <svg className="text-subtext" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>
              </svg>
              <span className="text-sm font-medium text-text">{t}</span>
            </div>
            <svg className="text-subtext opacity-0 group-hover:opacity-100 transition-opacity" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Step 3: Column Mapping ─────────────────────────────────────────────────

const MAPPING_FIELDS: { key: keyof ColumnMapping; label: string; required: boolean; hint: string }[] = [
  { key: 'amount',      label: 'Importe',      required: true,  hint: 'Ej: 45.90, 1234,56' },
  { key: 'type',        label: 'Tipo',         required: true,  hint: 'Ingreso/Gasto o Income/Expense' },
  { key: 'date',        label: 'Fecha',        required: true,  hint: 'YYYY-MM-DD, DD/MM/YYYY, etc.' },
  { key: 'description', label: 'Descripción',  required: false, hint: 'Concepto o descripción del movimiento' },
  { key: 'category',    label: 'Categoría',    required: false, hint: 'Si no se mapea, se usará "Otros"' },
]

interface ColumnMappingStepProps {
  preview: ImportFilePreview
  mapping: ColumnMapping
  onMappingChange: (field: keyof ColumnMapping, value: string) => void
  onNext: () => void
  onBack: () => void
}

function ColumnMappingStep({ preview, mapping, onMappingChange, onNext, onBack }: ColumnMappingStepProps) {
  const canProceed = mapping.amount !== null && mapping.type !== null && mapping.date !== null

  return (
    <div className="space-y-4">
      {/* Sample data preview */}
      <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-surface/60">
          <p className="text-sm font-semibold text-text">Vista previa del archivo</p>
          <p className="text-xs text-subtext mt-0.5">{preview.totalRows} filas encontradas · mostrando las primeras {Math.min(5, preview.rows.length)}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface/40">
                {preview.columns.map(col => (
                  <th key={col} className="px-4 py-2 text-left font-semibold text-subtext whitespace-nowrap border-b border-border/60">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {preview.rows.slice(0, 5).map((row, i) => (
                <tr key={i} className="hover:bg-surface/30">
                  {preview.columns.map(col => (
                    <td key={col} className="px-4 py-2 text-text whitespace-nowrap max-w-[180px] overflow-hidden text-ellipsis">
                      {row[col] ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Column mapping */}
      <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-surface/60">
          <p className="text-sm font-semibold text-text">Mapear columnas</p>
          <p className="text-xs text-subtext mt-0.5">Indica qué columna del archivo corresponde a cada campo de Vantage</p>
        </div>
        <div className="divide-y divide-border/40">
          {MAPPING_FIELDS.map(field => (
            <div key={field.key} className="flex items-center gap-4 px-5 py-3">
              <div className="w-32 shrink-0">
                <p className="text-sm font-semibold text-text flex items-center gap-1">
                  {field.label}
                  {field.required && <span className="text-expense text-xs">*</span>}
                </p>
                <p className="text-xs text-subtext mt-0.5">{field.hint}</p>
              </div>
              <svg className="text-subtext shrink-0" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
              <select
                value={mapping[field.key] ?? ''}
                onChange={e => onMappingChange(field.key, e.target.value)}
                className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              >
                <option value="">-- No mapear --</option>
                {preview.columns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-subtext bg-surface hover:bg-border transition-colors cursor-pointer"
        >
          Volver
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          Siguiente — Validar datos
        </button>
      </div>
    </div>
  )
}

// ── Step 4: Confirm ────────────────────────────────────────────────────────

interface ConfirmStepProps {
  validation: ImportValidationResult
  importing: boolean
  result: ImportCommitResult | null
  onConfirm: () => Promise<void>
  onBack: () => void
  onDone: () => void
}

function ConfirmStep({ validation, importing, result, onConfirm, onBack, onDone }: ConfirmStepProps) {
  const [showInvalid, setShowInvalid] = useState(false)

  if (result) {
    return (
      <div className="rounded-xl bg-card border border-border shadow-sm p-8 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-income-light flex items-center justify-center text-income mx-auto">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <p className="text-lg font-bold text-text">
          {result.inserted === 1 ? '1 movimiento importado' : `${result.inserted} movimientos importados`}
        </p>
        {result.errors.length > 0 && (
          <p className="text-xs text-subtext">{result.errors.length} filas no pudieron importarse</p>
        )}
        <button
          onClick={onDone}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand hover:bg-brand-hover transition-colors cursor-pointer"
        >
          Volver a Ajustes
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl bg-income-light border border-income/20 p-5">
          <p className="text-2xl font-bold text-income">{validation.validRows.length}</p>
          <p className="text-sm text-income/80 mt-1">filas válidas listas para importar</p>
        </div>
        <div className={`rounded-xl border p-5 ${validation.invalidRows.length > 0 ? 'bg-expense-light border-expense/20' : 'bg-surface border-border'}`}>
          <p className={`text-2xl font-bold ${validation.invalidRows.length > 0 ? 'text-expense' : 'text-subtext'}`}>
            {validation.invalidRows.length}
          </p>
          <p className={`text-sm mt-1 ${validation.invalidRows.length > 0 ? 'text-expense/80' : 'text-subtext'}`}>
            filas con errores (se omitirán)
          </p>
        </div>
      </div>

      {/* Invalid rows detail */}
      {validation.invalidRows.length > 0 && (
        <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
          <button
            onClick={() => setShowInvalid(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-subtext hover:bg-surface/60 transition-colors cursor-pointer"
          >
            <span>Ver filas con errores ({validation.invalidRows.length})</span>
            <svg
              className={`transition-transform ${showInvalid ? 'rotate-90' : ''}`}
              xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
          {showInvalid && (
            <div className="border-t border-border divide-y divide-border/40">
              {validation.invalidRows.slice(0, 10).map(row => (
                <div key={row.rowIndex} className="px-5 py-2.5 flex items-start gap-3">
                  <span className="text-xs font-bold text-subtext shrink-0 w-14">Fila {row.rowIndex}</span>
                  <span className="text-xs text-expense">{row.reason}</span>
                </div>
              ))}
              {validation.invalidRows.length > 10 && (
                <div className="px-5 py-2.5">
                  <span className="text-xs text-subtext">…y {validation.invalidRows.length - 10} más</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={importing}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-subtext bg-surface hover:bg-border transition-colors cursor-pointer disabled:opacity-50"
        >
          Volver a mapear
        </button>
        <button
          onClick={onConfirm}
          disabled={importing || validation.validRows.length === 0}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {importing
            ? 'Importando…'
            : `Importar ${validation.validRows.length} movimiento${validation.validRows.length === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export function ImportScreen({ onBack }: ImportScreenProps) {
  const [step,         setStep]         = useState<ImportStep>('file-select')
  const [fileType,     setFileType]     = useState<'excel' | 'access' | null>(null)
  const [filePath,     setFilePath]     = useState<string | null>(null)
  const [accessTables, setAccessTables] = useState<string[]>([])
  const [preview,      setPreview]      = useState<ImportFilePreview | null>(null)
  const [mapping,      setMapping]      = useState<ColumnMapping>({
    amount: null, type: null, date: null, description: null, category: null,
  })
  const [validation,   setValidation]   = useState<ImportValidationResult | null>(null)
  const [loading,      setLoading]      = useState(false)
  const [importing,    setImporting]    = useState(false)
  const [result,       setResult]       = useState<ImportCommitResult | null>(null)
  const [error,        setError]        = useState<string | null>(null)

  function handleMappingChange(field: keyof ColumnMapping, value: string) {
    setMapping(prev => ({ ...prev, [field]: value === '' ? null : value }))
  }

  function handleMappingNext() {
    if (!preview) return
    const v = validateRows(preview.rows, mapping)
    setValidation(v)
    setStep('confirm')
  }

  async function handleFileTypeChosen(type: 'excel' | 'access') {
    setError(null)
    const extensions = type === 'excel' ? ['xlsx', 'xls'] : ['mdb', 'accdb']
    const path = await window.api.fileio.openFileDialog({
      filters: [{ name: type === 'excel' ? 'Excel' : 'Access', extensions }],
      title: 'Seleccionar archivo',
    })
    if (!path) return  // user cancelled

    setFilePath(path)
    setFileType(type)
    setLoading(true)
    try {
      if (type === 'access') {
        const { tables } = await window.api.fileio.getAccessTables(path)
        if (tables.length === 0) { setError('El archivo no contiene tablas de usuario.'); return }
        setAccessTables(tables)
        setStep('table-select')
      } else {
        const p = await window.api.fileio.parseExcel(path)
        if (p.columns.length === 0) { setError('No se encontraron columnas en el archivo.'); return }
        setPreview(p)
        setMapping({ amount: null, type: null, date: null, description: null, category: null })
        setStep('column-mapping')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al leer el archivo.')
    } finally {
      setLoading(false)
    }
  }

  async function handleTableChosen(tableName: string) {
    setError(null)
    setLoading(true)
    try {
      const p = await window.api.fileio.parseAccess(filePath!, tableName)
      if (p.columns.length === 0) { setError('La tabla seleccionada no tiene columnas.'); return }
      setPreview(p)
      setMapping({ amount: null, type: null, date: null, description: null, category: null })
      setStep('column-mapping')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al leer la tabla.')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm() {
    if (!validation || validation.validRows.length === 0) return
    setImporting(true)
    try {
      const r = await window.api.fileio.commitImport({ rows: validation.validRows })
      setResult(r)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al importar los datos.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-4 lg:space-y-5 w-full">
      <PageHeader
        section="Ajustes"
        page="Importar datos"
        actions={
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-subtext bg-surface hover:bg-border border border-border transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
            Volver
          </button>
        }
      />

      <StepIndicator step={step} fileType={fileType} />

      {error && (
        <div className="rounded-lg bg-expense-light border border-expense/20 px-4 py-3 flex items-start gap-2">
          <svg className="text-expense shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p className="text-sm text-expense">{error}</p>
        </div>
      )}

      {step === 'file-select' && (
        <FileSelectStep onChoose={handleFileTypeChosen} loading={loading} />
      )}

      {step === 'table-select' && (
        <TableSelectStep tables={accessTables} onChoose={handleTableChosen} loading={loading} />
      )}

      {step === 'column-mapping' && preview && (
        <ColumnMappingStep
          preview={preview}
          mapping={mapping}
          onMappingChange={handleMappingChange}
          onNext={handleMappingNext}
          onBack={() => setStep(fileType === 'access' ? 'table-select' : 'file-select')}
        />
      )}

      {step === 'confirm' && validation && (
        <ConfirmStep
          validation={validation}
          importing={importing}
          result={result}
          onConfirm={handleConfirm}
          onBack={() => setStep('column-mapping')}
          onDone={onBack}
        />
      )}
    </div>
  )
}
