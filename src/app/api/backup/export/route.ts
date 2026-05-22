import { getActiveSpace } from '@/lib/auth/space'
import { requireNonAnonymousUser } from '@/lib/auth/session'
import { jsonError } from '@/lib/api/response'
import { transactionService } from '@/features/transactions/application/transaction.service'
import { categoryService } from '@/features/categories/application/category.service'
import { savingsService } from '@/features/savings/application/savings.service'
import { debtService } from '@/features/debts/application/debt.service'
import { recurringService } from '@/features/recurring/application/recurring.service'

export const runtime = 'nodejs'

export async function GET() {
  try {
    await requireNonAnonymousUser()
    const space = await getActiveSpace()
    const [transactions, categories, savings, debts, recurring] = await Promise.all([
      transactionService.list(space.id, { limit: 500, offset: 0 }),
      categoryService.list(space.id),
      savingsService.list(space.id),
      debtService.list(space.id),
      recurringService.list(space.id),
    ])

    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      spaceId: space.id,
      transactions,
      categories,
      savings,
      debts,
      recurring,
    }

    const json = JSON.stringify(payload, null, 2)
    const filename = `vantage-backup-${new Date().toISOString().slice(0, 10)}.json`
    return new Response(json, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    return jsonError(err)
  }
}
