(function () {
  // 1. Extrair configurações da tag do script
  const scriptTag = document.getElementById('nexus-widget-script');
  if (!scriptTag) {
    console.error('[Nexus Widget] Script tag must have id="nexus-widget-script"');
    return;
  }

  const tenantId = scriptTag.getAttribute('data-tenant-id') || '';
  const phone = scriptTag.getAttribute('data-phone') || '';
  const referralCode = scriptTag.getAttribute('data-referral-code') || '';
  const buttonColor = scriptTag.getAttribute('data-color') || '#25D366';
  const greeting = scriptTag.getAttribute('data-greeting') || 'Olá! Como posso te ajudar hoje?';

  if (!phone) {
    console.warn('[Nexus Widget] data-phone is required to send messages.');
  }

  // 2. Injetar CSS para o widget
  const style = document.createElement('style');
  style.innerHTML = `
    .nexus-widget-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .nexus-widget-btn {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: ${buttonColor};
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
    }
    .nexus-widget-btn:hover {
      transform: scale(1.1);
    }
    .nexus-widget-btn svg {
      width: 32px;
      height: 32px;
      fill: white;
    }
    .nexus-widget-badge {
      position: absolute;
      top: -2px;
      right: -2px;
      background-color: #EF4444;
      color: white;
      font-size: 10px;
      font-weight: bold;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid white;
    }
    .nexus-widget-box {
      position: absolute;
      bottom: 80px;
      right: 0;
      width: 320px;
      background-color: #0F172A;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 24px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
      display: none;
      flex-direction: column;
      overflow: hidden;
      transition: all 0.3s ease;
      color: white;
    }
    .nexus-widget-box.active {
      display: flex;
    }
    .nexus-widget-header {
      background: linear-gradient(135ms, #4F46E5, #7C3AED);
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .nexus-widget-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-color: rgba(255,255,255,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 16px;
    }
    .nexus-widget-title {
      font-weight: bold;
      font-size: 14px;
    }
    .nexus-widget-status {
      font-size: 10px;
      color: #6EE7B7;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .nexus-widget-pulse {
      width: 6px;
      height: 6px;
      background-color: #10B981;
      border-radius: 50%;
      animation: nexus-pulse 2s infinite;
    }
    .nexus-widget-content {
      padding: 16px;
      max-height: 250px;
      overflow-y: auto;
      background-color: #030712;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .nexus-widget-msg {
      background-color: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.08);
      padding: 12px;
      border-radius: 16px;
      font-size: 13px;
      line-height: 1.4;
      max-width: 85%;
    }
    .nexus-widget-footer {
      padding: 12px 16px;
      border-top: 1px solid rgba(255,255,255,0.05);
      display: flex;
      gap: 8px;
      background-color: #0F172A;
    }
    .nexus-widget-input {
      flex: 1;
      background-color: #030712;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 8px 12px;
      color: white;
      font-size: 13px;
      outline: none;
    }
    .nexus-widget-input:focus {
      border-color: #4F46E5;
    }
    .nexus-widget-send {
      background-color: #4F46E5;
      color: white;
      border: none;
      border-radius: 12px;
      padding: 8px 16px;
      cursor: pointer;
      font-size: 13px;
      font-weight: bold;
      transition: background-color 0.2s;
    }
    .nexus-widget-send:hover {
      background-color: #4338CA;
    }
    @keyframes nexus-pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }
  `;
  document.head.appendChild(style);

  // 3. Renderizar estrutura HTML do Widget
  const container = document.createElement('div');
  container.className = 'nexus-widget-container';
  container.innerHTML = `
    <div class="nexus-widget-box" id="nexus-widget-box">
      <div class="nexus-widget-header">
        <div class="nexus-widget-avatar">N</div>
        <div>
          <div class="nexus-widget-title">Nexus Assistant</div>
          <div class="nexus-widget-status">
            <span class="nexus-widget-pulse"></span> Online
          </div>
        </div>
      </div>
      <div class="nexus-widget-content">
        <div class="nexus-widget-msg">
          ${greeting}
        </div>
      </div>
      <div class="nexus-widget-footer">
        <input type="text" class="nexus-widget-input" id="nexus-widget-input" placeholder="Digite sua mensagem..." />
        <button class="nexus-widget-send" id="nexus-widget-send">Enviar</button>
      </div>
    </div>
    
    <div class="nexus-widget-btn" id="nexus-widget-btn">
      <span class="nexus-widget-badge">1</span>
      <svg viewBox="0 0 448 512">
        <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
      </svg>
    </div>
  `;
  document.body.appendChild(container);

  const btn = document.getElementById('nexus-widget-btn');
  const box = document.getElementById('nexus-widget-box');
  const badge = container.querySelector('.nexus-widget-badge');
  const input = document.getElementById('nexus-widget-input');
  const sendBtn = document.getElementById('nexus-widget-send');

  // 4. Lógica de Interação
  btn.addEventListener('click', () => {
    box.classList.toggle('active');
    if (badge) badge.style.display = 'none'; // Some após o primeiro clique
  });

  function handleSend() {
    const text = input.value.trim();
    if (!text) return;

    // Constrói o texto da mensagem incluindo o código de indicação do parceiro
    let formattedMessage = text;
    if (referralCode) {
      formattedMessage += `\n\n(Indicação: ${referralCode})`;
    }

    const encoded = encodeURIComponent(formattedMessage);
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encoded}`, '_blank');
    
    input.value = '';
    box.classList.remove('active');
  }

  sendBtn.addEventListener('click', handleSend);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
  });
})();
