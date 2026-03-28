import type { DashboardStats } from '../../shared/types'
import { getDatabase } from './schema'

export function getDashboardStats(): DashboardStats {
  const db = getDatabase()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed

  const curStart = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const nextMonth = month === 11 ? new Date(year + 1, 0, 1) : new Date(year, month + 1, 1)
  const curEnd = nextMonth.toISOString().slice(0, 10)

  const prevMonthDate = month === 0 ? new Date(year - 1, 11, 1) : new Date(year, month - 1, 1)
  const prevStart = prevMonthDate.toISOString().slice(0, 10)
  const prevEnd = curStart

  // Balance
  const balStmt = db.prepare("SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE -amount END), 0) as bal FROM transactions")
  balStmt.step()
  const balance = Number((balStmt.getAsObject() as { bal: number }).bal)
  balStmt.free()

  // Current month expenses
  const curStmt = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type='expense' AND date >= ? AND date < ?")
  curStmt.bind([curStart, curEnd])
  curStmt.step()
  const monthExpenses = Number((curStmt.getAsObject() as { total: number }).total)
  curStmt.free()

  // Previous month expenses
  const prevStmt = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type='expense' AND date >= ? AND date < ?")
  prevStmt.bind([prevStart, prevEnd])
  prevStmt.step()
  const prevMonthExpenses = Number((prevStmt.getAsObject() as { total: number }).total)
  prevStmt.free()

  const monthExpenseChange = prevMonthExpenses > 0
    ? ((monthExpenses - prevMonthExpenses) / prevMonthExpenses) * 100
    : 0

  // Top category this month
  const catStmt = db.prepare("SELECT category, SUM(amount) as total FROM transactions WHERE type='expense' AND date >= ? AND date < ? GROUP BY category ORDER BY total DESC LIMIT 1")
  catStmt.bind([curStart, curEnd])
  let topCategory: DashboardStats['topCategory'] = null
  if (catStmt.step()) {
    const row = catStmt.getAsObject() as { category: string; total: number }
    topCategory = { name: String(row.category), amount: Number(row.total) }
  }
  catStmt.free()

  // Upcoming recurring (next 5)
  const recStmt = db.prepare("SELECT * FROM recurring_templates WHERE active = 1 ORDER BY next_date ASC LIMIT 5")
  const upcomingRecurring: DashboardStats['upcomingRecurring'] = []
  while (recStmt.step()) {
    const r = recStmt.getAsObject() as Record<string, unknown>
    upcomingRecurring.push({
      id: String(r.id),
      amount: Number(r.amount),
      type: r.type as 'income' | 'expense',
      description: String(r.description),
      category: String(r.category),
      frequency: r.frequency as 'weekly' | 'monthly' | 'quarterly' | 'annual',
      next_date: String(r.next_date),
      active: Boolean(r.active),
      created_at: String(r.created_at),
    })
  }
  recStmt.free()

  // Monthly trend (last 6 months)
  const monthlyTrend: DashboardStats['monthlyTrend'] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, month - i, 1)
    const mStart = d.toISOString().slice(0, 10)
    const mNext = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    const mEnd = mNext.toISOString().slice(0, 10)
    const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

    const tStmt = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN type='income' THEN amount END), 0) as income,
        COALESCE(SUM(CASE WHEN type='expense' THEN amount END), 0) as expenses
      FROM transactions WHERE date >= ? AND date < ?
    `)
    tStmt.bind([mStart, mEnd])
    tStmt.step()
    const tRow = tStmt.getAsObject() as { income: number; expenses: number }
    monthlyTrend.push({ month: label, income: Number(tRow.income), expenses: Number(tRow.expenses) })
    tStmt.free()
  }

  return { balance, monthExpenses, prevMonthExpenses, monthExpenseChange, topCategory, upcomingRecurring, monthlyTrend }
}
