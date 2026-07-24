(function() {
  if (window.__crmWidgetLoaded) return;
  window.__crmWidgetLoaded = true;

  var BASE = 'https://wacrm.sistemasagenticos.cloud';
  var ACCOUNT_ID = document.currentScript?.getAttribute('data-account') || '';
  var PRIMARY = document.currentScript?.getAttribute('data-color') || '#7c3aed';
  var POSITION = document.currentScript?.getAttribute('data-position') || 'right';
  var TITLE = document.currentScript?.getAttribute('data-title') || 'CRM Agentico';
  var SUBTITLE = document.currentScript?.getAttribute('data-subtitle') || '';
  var WELCOME = document.currentScript?.getAttribute('data-welcome') || '¡Hola! Soy el asistente virtual. ¿En qué puedo ayudarte?';
  var AVATAR = document.currentScript?.getAttribute('data-avatar') || '';

  if (!ACCOUNT_ID) return console.warn('[CRM Widget] Falta data-account');

  var SESSION = 'w-' + Date.now() + '-' + Math.random().toString(36).slice(2);

  // Create widget button
  var btn = document.createElement('div');
  btn.innerHTML = '<div style="position:fixed;bottom:20px;' + POSITION + ':20px;z-index:999999;cursor:pointer;width:60px;height:60px;border-radius:30px;background:' + PRIMARY + ';display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.15);transition:transform 0.2s" onmouseover="this.style.transform=\'scale(1.1)\'" onmouseout="this.style.transform=\'scale(1)\'">' +
    (AVATAR ? '<img src="' + AVATAR + '" style="width:60px;height:60px;border-radius:30px;object-fit:cover" />' : '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>') +
  '</div>';
  btn.style.display = 'block';
  document.body.appendChild(btn);

  // Build the chat widget HTML
  var panel = document.createElement('div');
  panel.innerHTML = '<div id="__crmWidgetPanel" style="position:fixed;bottom:90px;' + POSITION + ':20px;z-index:999999;width:360px;height:520px;border-radius:12px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.18);display:none;flex-direction:column;background:white;font-family:-apple-system,sans-serif">' +
    '<div style="background:' + PRIMARY + ';padding:14px 16px;display:flex;align-items:center;gap:10px">' +
      (AVATAR ? '<img src="' + AVATAR + '" style="width:36px;height:36px;border-radius:18px;object-fit:cover" />' : '<div style="width:36px;height:36px;border-radius:18px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:18px">💬</div>') +
      '<div style="flex:1"><div style="color:white;font-weight:600;font-size:14px">' + TITLE + '</div>' +
      (SUBTITLE ? '<div style="color:rgba(255,255,255,0.7);font-size:11px">' + SUBTITLE + '</div>' : '') +
      '</div>' +
      '<span style="cursor:pointer;color:rgba(255,255,255,0.8);font-size:20px" onclick="document.getElementById(\'__crmWidgetPanel\').style.display=\'none\';document.getElementById(\'__crmWidgetBtn\').style.display=\'block\'">×</span>' +
    '</div>' +
    '<div id="__crmWidgetMessages" style="flex:1;overflow-y:auto;padding:12px;background:#f8f9fa;display:flex;flex-direction:column;gap:8px">' +
      '<div style="max-width:85%;padding:8px 12px;border-radius:12px;font-size:13px;line-height:1.4;background:#e9ecef;color:#1f2937;align-self:flex-start;border-bottom-left-radius:4px">' + WELCOME + '</div>' +
    '</div>' +
    '<div style="display:flex;gap:8px;padding:10px 12px;border-top:1px solid #e5e7eb;background:white">' +
      '<input id="__crmWidgetInput" type="text" style="flex:1;border:1px solid #d1d5db;border-radius:8px;padding:8px 12px;font-size:13px;outline:none" placeholder="Escribí un mensaje..." />' +
      '<button id="__crmWidgetSend" style="background:' + PRIMARY + ';color:white;border:none;border-radius:8px;padding:8px 16px;font-size:13px;cursor:pointer">Enviar</button>' +
    '</div>' +
  '</div>';
  document.body.appendChild(panel);

  var p = document.getElementById('__crmWidgetPanel');
  var inp = document.getElementById('__crmWidgetInput');
  var msgs = document.getElementById('__crmWidgetMessages');

  function sendMessage() {
    var text = inp.value.trim();
    if (!text) return;
    inp.value = '';
    addMessage(text, 'user');
    fetch(BASE + '/api/webchat', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({account_id: ACCOUNT_ID, session_id: SESSION, text})
    }).catch(function(){ addMessage('Error de conexión', 'agent'); });
  }

  function addMessage(text, role) {
    var d = document.createElement('div');
    d.style.cssText = 'max-width:85%;padding:8px 12px;border-radius:12px;font-size:13px;line-height:1.4;' +
      (role === 'user'
        ? 'background:' + PRIMARY + ';color:white;align-self:flex-end;border-bottom-right-radius:4px'
        : 'background:#e9ecef;color:#1f2937;align-self:flex-start;border-bottom-left-radius:4px');
    d.textContent = text;
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
  }

  inp.addEventListener('keydown', function(e) { if (e.key === 'Enter') sendMessage(); });
  document.getElementById('__crmWidgetSend').addEventListener('click', sendMessage);

  btn.onclick = function() {
    p.style.display = 'flex';
    btn.style.display = 'none';
  };
})();
