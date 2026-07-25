import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/flows/admin-client'

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data: page } = await supabaseAdmin().from('booking_pages').select('*, accounts!inner(name)').eq('slug', slug).eq('enabled', true).single()
  if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ page: { title: page.title, description: page.description, duration: page.duration_minutes, color: page.color } })
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const body = await request.json()
  if (!body.start_time || !body.contact_name) return NextResponse.json({ error: 'start_time y contact_name requeridos' }, { status: 400 })

  const db = supabaseAdmin()
  const { data: page } = await db.from('booking_pages').select('*, accounts!inner(id)').eq('slug', slug).eq('enabled', true).single()
  if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const start = new Date(body.start_time)
  const end = new Date(start.getTime() + (page.duration_minutes || 30) * 60000)

  const { data, error } = await db.from('bookings').insert({
    account_id: (page as any).account_id, title: 'Turno web: ' + body.contact_name,
    start_time: start.toISOString(), end_time: end.toISOString(),
    contact_name: body.contact_name, contact_email: body.contact_email, contact_phone: body.contact_phone,
    status: 'pending', source: 'public:' + slug,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ booking: data }, { status: 201 })
}
