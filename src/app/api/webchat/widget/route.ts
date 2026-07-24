import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('account')
  if (!accountId) return new NextResponse('Falta account', { status: 400 })

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,sans-serif;display:flex;flex-direction:column;height:100vh}
.messages{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px}
.msg{max-width:85%;padding:8px 12px;border-radius:12px;font-size:13px;line-height:1.4}
.agent{background:#f3f4f6;color:#1f2937;align-self:flex-start;border-bottom-left-radius:4px}
.user{background:#7c3aed;color:white;align-self:flex-end;border-bottom-right-radius:4px}
.input-bar{display:flex;gap:8px;padding:10px 12px;border-top:1px solid #e5e7eb;background:white}
.input-bar input{flex:1;border:1px solid #d1d5db;border-radius:8px;padding:8px 12px;font-size:13px;outline:none}
.input-bar input:focus{border-color:#7c3aed}
.input-bar button{background:#7c3aed;color:white;border:none;border-radius:8px;padding:8px 16px;font-size:13px;cursor:pointer}
</style>
</head>
<body>
<div class="messages" id="messages">
  <div class="msg agent">¡Hola! Soy el asistente virtual. ¿En qué puedo ayudarte?</div>
</div>
<div class="input-bar">
  <input id="input" placeholder="Escribí un mensaje..." onkeydown="if(event.key==='Enter') send()">
  <button onclick="send()">Enviar</button>
</div>
<script>
const SESSION = 'w-' + Date.now() + '-' + Math.random().toString(36).slice(2);
const MSGS = document.getElementById('messages');
const INPUT = document.getElementById('input');
const ACCOUNT = '${accountId}';

async function send() {
  const text = INPUT.value.trim();
  if (!text) return;
  INPUT.value = '';
  addMsg(text, 'user');
  try {
    const res = await fetch('/api/webchat', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({account_id: ACCOUNT, session_id: SESSION, text})
    });
    if (!res.ok) addMsg('Error al enviar mensaje', 'agent');
  } catch { addMsg('Error de conexión', 'agent'); }
}
function addMsg(text, role) {
  const d = document.createElement('div');
  d.className = 'msg ' + role;
  d.textContent = text;
  MSGS.appendChild(d);
  MSGS.scrollTop = MSGS.scrollHeight;
}
</script>
</body>
</html>`
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html;charset=utf-8' } })
}
