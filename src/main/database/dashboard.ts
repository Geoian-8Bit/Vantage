import type { DashboardStats } from '../../shared/types'
import { getDatabase } from './schema'
import { getTotalSavings } from './savings'
import { getTotalDebtPending } from './debts'

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

  // Monthly trend (last 6 months) — single query
  const trendMonths: { label: string; start: string }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, month - i, 1)
    trendMonths.push({
      label: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      start: d.toISOString().slice(0, 10),
    })
  }
  const trendStart = trendMonths[0].start
  const trendEnd = new Date(year, month + 1, 1).toISOString().slice(0, 10)

  const trendStmt = db.prepare(`
    SELECT
      strftime('%Y-%m', date) as month,
      COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as expenses
    FROM transactions WHERE date >= ? AND date < ?
    GROUP BY month
  `)
  trendStmt.bind([trendStart, trendEnd])
  const trendRows: Record<string, { income: number; expenses: number }> = {}
  while (trendStmt.step()) {
    const r = trendStmt.getAsObject() as { month: string; income: number; expenses: number }
    trendRows[r.month] = { income: Number(r.income), expenses: Number(r.expenses) }
  }
  trendStmt.free()

  const monthlyTrend = trendMonths.map(m => ({
    month: m.label,
    income: trendRows[m.label]?.income ?? 0,
    expenses: trendRows[m.label]?.expenses ?? 0,
  }))

  // Savings + deudas: patrimonio neto = balance líquido + apartados − deudas pendientes
  const totalSavings = getTotalSavings()
  const totalDebtPending = getTotalDebtPending()
  const netWorth = balance + totalSavings - totalDebtPending

  return {
    balance,
    monthExpenses,
    prevMonthExpenses,
    monthExpenseChange,
    topCategory,
    upcomingRecurring,
    monthlyTrend,
    totalSavings,
    totalDebtPending,
    netWorth,
  }
}
