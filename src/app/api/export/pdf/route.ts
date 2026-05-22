import { type NextRequest } from 'next/server'
import { z } from 'zod'

import { requireNonAnonymousUser } from '@/lib/auth/session'
import { jsonError } from '@/lib/api/response'

export const runtime = 'nodejs'

const payloadSchema = z.object({
  period: z.string(),
  income: z.number(),
  expenses: z.number(),
  balance: z.number(),
  categories: z.array(
    z.object({
      name: z.string(),
      amount: z.number(),
      percent: z.number(),
    })
  ),
  transactions: z.array(
    z.object({
      date: z.string(),
      description: z.string(),
      category: z.string(),
      amount: z.number(),
      type: z.enum(['income', 'expense']),
    })
  ),
})

function formatCurrency(n: number): string {
  const fixed = Math.abs(n).toFixed(2)
  const [intPart, decPart] = fixed.split('.')
  const withDots = intPart!.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const sign = n < 0 ? '-' : ''
  return `${sign}${withDots},${decPart} €`
}

export async function POST(request: NextRequest) {
  try {
    await requireNonAnonymousUser()
    const body = await request.json()
    const payload = payloadSchema.parse(body)

    const PDFDocument = (await import('pdfkit')).default

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 })
      const chunks: Buffer[] = []
      doc.on('data', (c: Buffer) => chunks.push(c))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('Vantage', { align: 'center' })
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#6B6B6F')
        .text('Reporte de movimientos', { align: 'center' })
      doc.moveDown(0.5)
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor('#2D2D2F')
        .text(payload.period, { align: 'center' })
      doc.moveDown(1)

      // Summary
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#2D2D2F').text('Resumen')
      doc.moveDown(0.3)
      doc.fontSize(10).font('Helvetica')
      doc.fillColor('#1B7A4E').text(`Ingresos:  ${formatCurrency(payload.income)}`)
      doc.fillColor('#7A1B2D').text(`Gastos:    ${formatCurrency(payload.expenses)}`)
      doc
        .fillColor(payload.balance >= 0 ? '#1B7A4E' : '#7A1B2D')
        .text(`Balance:   ${formatCurrency(payload.balance)}`)
      doc.moveDown(1)

      // Categories
      if (payload.categories.length > 0) {
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#2D2D2F')
          .text('Gastos por categoría')
        doc.moveDown(0.3)
        doc.fontSize(9).font('Helvetica').fillColor('#6B6B6F')
        for (const cat of payload.categories) {
          doc.text(`${cat.name}:  ${formatCurrency(cat.amount)}  (${cat.percent}%)`)
        }
        doc.moveDown(1)
      }

      // Transactions table
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#2D2D2F').text('Movimientos')
      doc.moveDown(0.3)

      const tableTop = doc.y
      const col = { date: 50, desc: 130, cat: 310, amount: 430 }

      doc.fontSize(8).font('Helvetica-Bold').fillColor('#6B6B6F')
      doc.text('Fecha', col.date, tableTop)
      doc.text('Descripción', col.desc, tableTop)
      doc.text('Categoría', col.cat, tableTop)
      doc.text('Importe', col.amount, tableTop)
      doc.moveDown(0.5)

      const lineY = doc.y
      doc.moveTo(50, lineY).lineTo(545, lineY).strokeColor('#E2E0DE').lineWidth(0.5).stroke()
      doc.moveDown(0.3)

      doc.fontSize(8).font('Helvetica')
      for (const t of payload.transactions) {
        if (doc.y > 750) {
          doc.addPage()
        }
        const y = doc.y
        doc.fillColor('#2D2D2F').text(t.date, col.date, y, { width: 70 })
        doc.text(
          t.description || (t.type === 'income' ? 'Ingreso' : 'Gasto'),
          col.desc,
          y,
          { width: 170 }
        )
        doc.text(t.category, col.cat, y, { width: 110 })
        doc
          .fillColor(t.type === 'income' ? '#1B7A4E' : '#7A1B2D')
          .text(
            `${t.type === 'income' ? '+' : '−'}${formatCurrency(t.amount)}`,
            col.amount,
            y,
            { width: 115 }
          )
        doc.moveDown(0.4)
      }

      doc.end()
    })

    const filename = `vantage-reporte-${payload.period.replace(/\s/g, '-')}.pdf`
    const responseBody = new Uint8Array(buffer)
    return new Response(responseBody, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(responseBody.byteLength),
      },
    })
  } catch (err) {
    return jsonError(err)
  }
}
