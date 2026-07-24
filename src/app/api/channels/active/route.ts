import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'

export async function GET() {
  try {
    const { supabase, accountId } = await getCurrentAccount()
    const { data } = await supabase
      .from('channels')
      .select('type')
      .eq('account_id', accountId)
      .eq('is_active', true)
    const channels = (data ?? []).map((c: any) => c.type)
    return NextResponse.json({ channels })
  } catch (err) { return toErrorResponse(err) }
}
