import { describe, expect, it } from 'vitest'
import {
  autoDetectMapping,
  validateRows,
  type ColumnMapping,
} from '@/lib/utils/importValidation'

const fullMapping: ColumnMapping = {
  amount: 'importe',
  type: 'tipo',
  date: 'fecha',
  description: 'concepto',
  category: 'categoria',
}

describe('validateRows', () => {
  it('acepta una fila bien formada y normaliza importe positivo + tipo expense', () => {
    const { validRows, invalidRows } = validateRows(
      [
        {
          importe: '12,50',
          tipo: 'gasto',
          fecha: '2026-05-22',
          concepto: 'Café',
          categoria: 'Ocio',
        },
      ],
      fullMapping
    )
    expect(invalidRows).toHaveLength(0)
    expect(validRows[0]).toEqual({
      amount: 12.5,
      type: 'expense',
      description: 'Café',
      date: '2026-05-22',
      category: 'Ocio',
    })
  })

  it('infiere el tipo por el signo cuando no hay columna de tipo', () => {
    const { validRows } = validateRows(
      [
        { importe: '-50', fecha: '2026-05-22', concepto: 'x', categoria: '' },
        { importe: '50', fecha: '2026-05-22', concepto: 'y', categoria: '' },
      ],
      { ...fullMapping, type: null }
    )
    expect(validRows[0]?.type).toBe('expense')
    expect(validRows[1]?.type).toBe('income')
    // El importe se almacena siempre en valor absoluto.
    expect(validRows[0]?.amount).toBe(50)
  })

  it('parsea fechas en formatos dd/mm/yyyy y dd-mm-yyyy', () => {
    const { validRows } = validateRows(
      [
        {
          importe: '10',
          tipo: 'ingreso',
          fecha: '22/05/2026',
          concepto: '',
          categoria: '',
        },
        {
          importe: '10',
          tipo: 'ingreso',
          fecha: '22-05-2026',
          concepto: '',
          categoria: '',
        },
      ],
      fullMapping
    )
    expect(validRows[0]?.date).toBe('2026-05-22')
    expect(validRows[1]?.date).toBe('2026-05-22')
  })

  it('parsea importes con punto de miles y coma decimal', () => {
    const { validRows } = validateRows(
      [
        {
          importe: '1.234,56 €',
          tipo: 'ingreso',
          fecha: '2026-05-22',
          concepto: '',
          categoria: '',
        },
      ],
      fullMapping
    )
    expect(validRows[0]?.amount).toBeCloseTo(1234.56)
  })

  it('reporta fila inválida cuando el importe es cero o ilegible', () => {
    const { invalidRows } = validateRows(
      [
        {
          importe: 'abc',
          tipo: 'ingreso',
          fecha: '2026-05-22',
          concepto: '',
          categoria: '',
        },
        {
          importe: '0',
          tipo: 'ingreso',
          fecha: '2026-05-22',
          concepto: '',
          categoria: '',
        },
      ],
      fullMapping
    )
    expect(invalidRows).toHaveLength(2)
    expect(invalidRows[0]?.reason).toMatch(/importe/i)
  })

  it('reporta fila inválida cuando el tipo no se reconoce y hay columna de tipo mapeada', () => {
    const { invalidRows } = validateRows(
      [
        {
          importe: '10',
          tipo: 'xxx',
          fecha: '2026-05-22',
          concepto: '',
          categoria: '',
        },
      ],
      fullMapping
    )
    expect(invalidRows).toHaveLength(1)
    expect(invalidRows[0]?.reason).toMatch(/tipo/i)
  })

  it('rellena la categoría con "Otros" cuando viene vacía', () => {
    const { validRows } = validateRows(
      [
        {
          importe: '10',
          tipo: 'ingreso',
          fecha: '2026-05-22',
          concepto: '',
          categoria: '',
        },
      ],
      fullMapping
    )
    expect(validRows[0]?.category).toBe('Otros')
  })
})

describe('autoDetectMapping', () => {
  it('detecta columnas en español por keywords (acepta variaciones)', () => {
    const m = autoDetectMapping([
      'Fecha',
      'Concepto',
      'Importe',
      'Categoría',
      'Tipo',
    ])
    expect(m).toEqual({
      amount: 'Importe',
      type: 'Tipo',
      date: 'Fecha',
      description: 'Concepto',
      category: 'Categoría',
    })
  })

  it('deja en null las columnas que no encuentra', () => {
    const m = autoDetectMapping(['Foo', 'Bar'])
    expect(m.amount).toBeNull()
    expect(m.date).toBeNull()
  })

  it('no asigna la misma columna a dos campos', () => {
    // "fecha" matchea date; no debe colarse de nuevo en otro campo.
    const m = autoDetectMapping(['fecha', 'concepto'])
    expect(m.date).toBe('fecha')
    expect(m.description).toBe('concepto')
  })
})
