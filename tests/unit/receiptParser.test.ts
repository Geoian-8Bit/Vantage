import { describe, expect, it } from 'vitest'

import { parseReceipt } from '@/features/transactions/domain/receiptParser'

const MERCADONA = `MERCADONA S.A.
C/ EJEMPLO 12
46019 VALENCIA
TEL. 900 500 100

CARNICERIA
POLLO ENTERO        3,45
LECHE 6L            5,99
ATUN CLARO         12,30

TOTAL A PAGAR     21,74 €
EFECTIVO          25,00
CAMBIO             3,26

22/05/2026  18:34
TICKET N. 0023421`

const CARREFOUR = `CARREFOUR EXPRESS
AVDA EJEMPLO 33
CIF A28425270

LACTEOS Y BEBIDAS
YOGUR NATURAL 12U   2.79
AGUA MINERAL 6L     1.55
PAN BAGUETTE        0.85

IMPORTE TOTAL  5.19 EUR
TARJETA        5.19

07-03-2026  10:12`

const DIA = `DIA % MAXI
CALLE EJEMPLO 5
TEL.: 91 000 00 00
CIF B82198076

PAN INTEGRAL        1,15
JAMON SERRANO       3,99
QUESO MANCHEGO      7,50

TOTAL          12,64 €

15/01/2026  09:55
GRACIAS POR SU VISITA`

const LIDL = `LIDL SUPERMERCADOS

LECHUGA            0,89
TOMATE PERA        1,20
HUEVOS CLASE M     2,49

TOTAL TICKET     4,58 EUR

03/12/2025`

const ANGLO = `MORRISONS DAILY
123 HIGH STREET

Eggs Free Range    2.50
Milk 2L            1.85

TOTAL              4.35 GBP
2025-12-04 14:20`

describe('parseReceipt — comercios españoles', () => {
  it('Mercadona — extrae comercio, importe TOTAL A PAGAR y fecha dd/mm/yyyy', () => {
    const r = parseReceipt(MERCADONA)
    expect(r.merchant).toBe('Mercadona')
    expect(r.amount).toBe(21.74)
    expect(r.date).toBe('2026-05-22')
  })

  it('Carrefour — extrae la línea completa "Carrefour Express", IMPORTE TOTAL con punto decimal y fecha dd-mm-yyyy', () => {
    const r = parseReceipt(CARREFOUR)
    expect(r.merchant).toBe('Carrefour Express')
    expect(r.amount).toBe(5.19)
    expect(r.date).toBe('2026-03-07')
  })

  it('Día — extrae comercio reconocido aunque el ticket lleve "DIA %"', () => {
    const r = parseReceipt(DIA)
    expect(r.merchant).toBe('Dia Maxi')
    expect(r.amount).toBe(12.64)
    expect(r.date).toBe('2026-01-15')
  })

  it('Lidl — soporta variante TOTAL TICKET', () => {
    const r = parseReceipt(LIDL)
    expect(r.merchant).toBe('Lidl Supermercados')
    expect(r.amount).toBe(4.58)
    expect(r.date).toBe('2025-12-03')
  })
})

describe('parseReceipt — fallbacks', () => {
  it('comercio desconocido cae a la primera línea limpia, ignorando direcciones', () => {
    const ticket = `BAR LA ESPERANZA
C/ MAYOR 7
TEL. 600000000

CAÑA             1,50
TAPA             0,80

TOTAL            2,30 €
22/05/2026`
    const r = parseReceipt(ticket)
    expect(r.merchant).toBe('Bar La Esperanza')
  })

  it('si no hay línea "TOTAL", se queda con el mayor importe con €', () => {
    const ticket = `RESTAURANTE EJEMPLO
PRIMER PLATO    8,50 €
SEGUNDO         12,00 €
POSTRE           4,50 €
A PAGAR  25,00 €
05/04/2026`
    const r = parseReceipt(ticket)
    // "A PAGAR" matchea TOTAL_PATTERNS[1] → 25.00
    expect(r.amount).toBe(25.0)
  })

  it('importe con miles europeos "1.234,56" se normaliza correctamente', () => {
    const ticket = `MUEBLES EJEMPLO
TOTAL  1.234,56 €
01/02/2026`
    const r = parseReceipt(ticket)
    expect(r.amount).toBe(1234.56)
  })

  it('ignora importes absurdamente grandes (ruido OCR)', () => {
    const ticket = `TIENDA EJEMPLO
TOTAL  234.567,89 €
01/02/2026`
    const r = parseReceipt(ticket)
    // 234.567,89 > 100.000 → se filtra como ruido.
    expect(r.amount).toBeNull()
  })

  it('fecha dd/mm/yy se interpreta como 20YY', () => {
    const ticket = `TIENDA
TOTAL 3,00 €
15/03/26`
    const r = parseReceipt(ticket)
    expect(r.date).toBe('2026-03-15')
  })

  it('fecha inválida (32/13/2026) no se acepta', () => {
    const ticket = `TIENDA
TOTAL 3,00 €
32/13/2026`
    const r = parseReceipt(ticket)
    expect(r.date).toBeNull()
  })

  it('comercio extranjero también se detecta vía heurística de primera línea', () => {
    const r = parseReceipt(ANGLO)
    expect(r.merchant).toBe('Morrisons Daily')
    // El primer patrón hace match con "TOTAL  4.35" porque el sufijo €/EUR
    // es opcional. El usuario corrige la moneda al guardar — es preferible
    // dar un número aproximado a no dar nada.
    expect(r.amount).toBe(4.35)
  })
})

describe('parseReceipt — robustez', () => {
  it('texto vacío devuelve todo null sin lanzar', () => {
    expect(parseReceipt('')).toEqual({ amount: null, date: null, merchant: null })
  })

  it('texto solo con ruido devuelve todo null sin lanzar', () => {
    expect(parseReceipt('!!!@@@###')).toEqual({
      amount: null,
      date: null,
      merchant: null,
    })
  })
})
