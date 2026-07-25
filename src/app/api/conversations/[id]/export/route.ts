import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { supabase, accountId } = await getCurrentAccount()
    const { id } = await params

    const { data: conversation } = await supabase
      .from('conversations').select('*, contact:contacts(name, phone)').eq('id', id).eq('account_id', accountId).single()
    if (!conversation) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: messages } = await supabase
      .from('messages')
      .select('sender_type, content_text, created_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })

    const contactName = (conversation as any).contact?.name || (conversation as any).contact?.phone || 'Unknown'
    let txt = `Conversacion con: ${contactName}\n`
    txt += `Canal: ${conversation.channel || 'desconocido'}\n`
    txt += `Fecha: ${new Date(conversation.created_at).toLocaleDateString()}\n`
    txt += `${'='.repeat(50)}\n\n`

    for (const m of (messages ?? []) as any[]) {
      const who = m.sender_type === 'customer' ? contactName : 'Yo'
      const time = new Date(m.created_at).toLocaleString()
      txt += `[${time}] ${who}:\n${m.content_text || '(sin texto)'}\n\n`
    }

    return new NextResponse(txt, {
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
        'Content-Disposition': `attachment; filename="chat-${id.slice(0, 8)}.txt"`,
      },
    })
  } catch (err) { return toErrorResponse(err) }
}
