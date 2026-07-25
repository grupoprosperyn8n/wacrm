import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'

export async function GET() {
  try {
    const { supabase, accountId } = await getCurrentAccount()
    const { data } = await supabase
      .from('contacts')
      .select('name, phone, email, company')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })

    if (!data?.length) return NextResponse.json({ error: 'Sin contactos' }, { status: 404 })

    const header = 'nombre,telefono,email,empresa'
    const rows = data.map((c: any) =>
      `"${c.name || ''}","${c.phone || ''}","${c.email || ''}","${c.company || ''}"`
    ).join('\n')

    return new NextResponse(header + '\n' + rows, {
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': 'attachment; filename="contactos.csv"',
      },
    })
  } catch (err) { return toErrorResponse(err) }
}
