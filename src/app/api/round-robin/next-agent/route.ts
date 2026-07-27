import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { supabaseAdmin } from '@/lib/automations/admin-client'

/**
 * GET /api/round-robin/next-agent
 * Devuelve el proximo agente disponible segun Round Robin.
 * Incrementa su round_robin_index automaticamente.
 */
export async function GET() {
  try {
    const ctx = await getCurrentAccount()
    const db = supabaseAdmin()

    const { data, error } = await db.rpc('get_next_round_robin_agent', {
      target_account_id: ctx.accountId,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        { error: 'No hay agentes disponibles en esta cuenta' },
        { status: 404 },
      )
    }

    // Cargar datos del agente seleccionado
    const { data: agent } = await db
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .eq('id', data)
      .single()

    return NextResponse.json({ agent })
  } catch (err) {
    return toErrorResponse(err)
  }
}
