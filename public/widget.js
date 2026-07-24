(function() {
  if (window.__crmWidgetLoaded) return;
  window.__crmWidgetLoaded = true;

  const BASE = 'https://wacrm.sistemasagenticos.cloud';
  var ACCOUNT_ID = document.currentScript?.getAttribute('data-account') || '';
  var PRIMARY = document.currentScript?.getAttribute('data-color') || '#7c3aed';
  var POSITION = document.currentScript?.getAttribute('data-position') || 'right';
  var TITLE = document.currentScript?.getAttribute('data-title') || 'CRM Agentico';

  if (!ACCOUNT_ID) return console.warn('[CRM Widget] Falta data-account');

  // Crear botón flotante
  var btn = document.createElement('div');
  btn.innerHTML = '<div style="position:fixed;bottom:20px;' + POSITION + ':20px;z-index:999999;cursor:pointer;width:60px;height:60px;border-radius:30px;background:' + PRIMARY + ';display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.15);transition:transform 0.2s" onmouseover="this.style.transform=\'scale(1.1)\'" onmouseout="this.style.transform=\'scale(1)\'"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>';
  document.body.appendChild(btn);

  // Panel del chat
  var panel = document.createElement('div');
  panel.id = '__crmWidgetPanel';
  panel.innerHTML = '<div style="position:fixed;bottom:90px;' + POSITION + ':20px;z-index:999999;width:360px;height:520px;border-radius:12px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.18);display:none;flex-direction:column;background:white;font-family:-apple-system,sans-serif">' +
    '<div style="background:' + PRIMARY + ';padding:14px 16px;display:flex;align-items:center;gap:10px">' +
      '<span style="color:white;font-weight:600;font-size:14px">' + TITLE + '</span>' +
      '<span style="margin-left:auto;cursor:pointer;color:rgba(255,255,255,0.8);font-size:20px" onclick="document.getElementById(\'__crmWidgetPanel\').style.display=\'none\';document.getElementById(\'__crmWidgetBtn\').style.display=\'block\'">×</span>' +
    '</div>' +
    '<iframe id="__crmWidgetFrame" src="' + BASE + '/api/webchat/widget?account=' + ACCOUNT_ID + '" style="flex:1;border:none;width:100%"></iframe>' +
  '</div>';
  panel.style.display = 'none';
  document.body.appendChild(panel);

  btn.onclick = function() {
    panel.style.display = 'flex';
    btn.style.display = 'none';
  };
})();
