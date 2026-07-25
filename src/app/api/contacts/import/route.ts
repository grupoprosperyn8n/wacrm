import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import { requireRole, toErrorResponse } from '@/lib/auth/account'

export async function POST(request: Request) {
  try {
    const ctx = await requireRole('agent')
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file || !file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'Se requiere un archivo CSV' }, { status: 400 })
    }

    const text = await file.text()
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length < 2) return NextResponse.json({ error: 'CSV vacío' }, { status: 400 })

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const nameIdx = headers.indexOf('nombre') ?? headers.indexOf('name') ?? -1
    const phoneIdx = headers.indexOf('telefono') ?? headers.indexOf('phone') ?? -1
    const emailIdx = headers.indexOf('email') ?? headers.indexOf('correo') ?? -1
    const companyIdx = headers.indexOf('empresa') ?? headers.indexOf('company') ?? -1

    if (phoneIdx === -1) return NextResponse.json({ error: 'El CSV debe tener columna "telefono" o "phone"' }, { status: 400 })

    const db = supabaseAdmin()
    let imported = 0; let errors = 0

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''))
      const phone = cols[phoneIdx]?.replace(/[^\d+]/g, '')
      if (!phone) { errors++; continue }

      const contact: Record<string, any> = {
        account_id: ctx.accountId,
        phone,
        name: nameIdx >= 0 ? cols[nameIdx] || null : null,
        email: emailIdx >= 0 ? cols[emailIdx] || null : null,
        company: companyIdx >= 0 ? cols[companyIdx] || null : null,
      }

      const { error: upsertErr } = await db.from('contacts').upsert(contact, {
        onConflict: 'phone',
        ignoreDuplicates: false,
      })
      if (upsertErr) errors++; else imported++
    }

    return NextResponse.json({ imported, errors, total: lines.length - 1 })
  } catch (err) { return toErrorResponse(err) }
}
