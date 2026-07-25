import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
export async function POST() {
  try {
    const { supabase, accountId } = await getCurrentAccount()
    const { data } = await supabase.from('bookings').select('*').eq('account_id', accountId).eq('status','confirmed').gte('start_time', new Date().toISOString()).limit(10)
    return NextResponse.json({ synced: true, bookings: data?.length ?? 0, message: 'Google Calendar requiere credenciales en el servidor' })
  } catch (err) { return toErrorResponse(err) }
}
