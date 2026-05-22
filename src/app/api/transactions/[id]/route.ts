import { type NextRequest } from 'next/server'
import { z } from 'zod'

import { getActiveSpace } from '@/lib/auth/space'
import { jsonError, jsonOk } from '@/lib/api/response'
import { updateTransactionInputSchema } from '@/features/transactions/domain/transaction.schema'
import { transactionService } from '@/features/transactions/application/transaction.service'

const idParamSchema = z.object({ id: z.string().uuid() })

interface Context {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const space = await getActiveSpace()
    const { id } = idParamSchema.parse(await params)
    const tx = await transactionService.get(space.id, id)
    return jsonOk(tx)
  } catch (err) {
    return jsonError(err)
  }
}

export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const space = await getActiveSpace()
    const { id } = idParamSchema.parse(await params)
    const body = await request.json()
    const input = updateTransactionInputSchema.parse(body)
    const tx = await transactionService.update(space.id, id, input)
    return jsonOk(tx)
  } catch (err) {
    return jsonError(err)
  }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    const space = await getActiveSpace()
    const { id } = idParamSchema.parse(await params)

    // Si la tx tiene una foto adjunta, borramos primero el archivo de
    // Storage en best-effort. Un fallo aquí (red, RLS) no debe bloquear el
    // borrado lógico: las RLS garantizan que el archivo huérfano no es
    // visible a nadie ajeno al space.
    const tx = await transactionService.get(space.id, id)
    if (tx.attachmentPath) {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      await supabase.storage.from('receipts').remove([tx.attachmentPath])
    }

    await transactionService.remove(space.id, id)
    return jsonOk({ ok: true })
  } catch (err) {
    return jsonError(err)
  }
}
