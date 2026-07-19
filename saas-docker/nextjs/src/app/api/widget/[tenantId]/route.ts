import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  req: Request,
  { params }: { params: { tenantId: string } }
) {
  try {
    const { tenantId } = params;

    // 1. Busca o tenant e suas configurações
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        whatsapp_instances: true
      }
    });

    if (!tenant) {
      return new Response("console.error('WhatsApp Widget: Tenant não encontrado');", {
        headers: { "Content-Type": "application/javascript" },
      });
    }

    let settings: any = {};
    try {
      settings = JSON.parse((tenant.settings as string) || "{}");
    } catch {}

    // 2. Determina o número do telefone (Instância ativa > Telefone do Gerente > Telefone do Tenant)
    let phone = "";
    if (tenant.whatsapp_instances && tenant.whatsapp_instances.length > 0) {
      // Se houver instância cadastrada, tenta extrair o número do nome dela ou das configurações
      const activeInstance = tenant.whatsapp_instances[0];
      phone = activeInstance.name || "";
    }
    
    if (!phone || phone.length < 8) {
      phone = settings.manager_phone || tenant.phone || "";
    }

    // Limpa o número de caracteres especiais
    const cleanPhone = phone.replace(/\D/g, "");

    if (!cleanPhone) {
      return new Response("console.warn('WhatsApp Widget: Nenhum número de telefone configurado para este Tenant');", {
        headers: { "Content-Type": "application/javascript" },
      });
    }

    const companyName = settings.ai_name || tenant.name || "Suporte";
    const greetingBubbleText = `Falar com ${companyName} 👋`;
    const greetingMessage = `Olá! Vim através do site e gostaria de atendimento.`;

    // 3. Retorna o script JS minificado e formatado para injeção dinâmica
    const widgetScript = `
(function() {
  var phone = "${cleanPhone}";
  var message = "${encodeURIComponent(greetingMessage)}";
  var greeting = "${greetingBubbleText}";

  if (document.getElementById('whatsapp-widget-container')) return;

  var container = document.createElement('div');
  container.id = 'whatsapp-widget-container';
  
  var style = document.createElement('style');
  style.innerHTML = "\\n\\
    #whatsapp-widget-container {\\n\\
      position: fixed;\\n\\
      bottom: 24px;\\n\\
      right: 24px;\\n\\
      z-index: 999999;\\n\\
      display: flex;\\n\\
      flex-direction: column;\\n\\
      align-items: flex-end;\\n\\
    }\\n\\
    .wa-widget-btn {\\n\\
      width: 60px;\\n\\
      height: 60px;\\n\\
      background: #25D366;\\n\\
      border-radius: 50%;\\n\\
      box-shadow: 0 4px 16px rgba(0,0,0,0.25);\\n\\
      display: flex;\\n\\
      align-items: center;\\n\\
      justify-content: center;\\n\\
      cursor: pointer;\\n\\
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);\\n\\
      position: relative;\\n\\
    }\\n\\
    .wa-widget-btn:hover {\\n\\
      transform: scale(1.1) rotate(5deg);\\n\\
      box-shadow: 0 6px 20px rgba(0,0,0,0.3);\\n\\
    }\\n\\
    .wa-widget-bubble {\\n\\
      margin-bottom: 12px;\\n\\
      background: white;\\n\\
      color: #1a1a1a;\\n\\
      padding: 10px 16px;\\n\\
      border-radius: 16px;\\n\\
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);\\n\\
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;\\n\\
      font-size: 13px;\\n\\
      font-weight: 500;\\n\\
      pointer-events: none;\\n\\
      opacity: 0;\\n\\
      transform: translateY(10px);\\n\\
      transition: all 0.5s ease;\\n\\
      display: flex;\\n\\
      align-items: center;\\n\\
      gap: 6px;\\n\\
      border: 1px solid rgba(0,0,0,0.05);\\n\\
      white-space: nowrap;\\n\\
    }\\n\\
    .wa-widget-bubble.show {\\n\\
      opacity: 1;\\n\\
      transform: translateY(0);\\n\\
    }\\n\\
    .wa-widget-pulse {\\n\\
      position: absolute;\\n\\
      width: 100%;\\n\\
      height: 100%;\\n\\
      background: #25D366;\\n\\
      border-radius: 50%;\\n\\
      opacity: 0.6;\\n\\
      z-index: -1;\\n\\
      animation: wa-pulse 2s infinite;\\n\\
    }\\n\\
    @keyframes wa-pulse {\\n\\
      0% { transform: scale(1); opacity: 0.6; }\\n\\
      100% { transform: scale(1.4); opacity: 0; }\\n\\
    }\\n\\
  ";

  var bubble = document.createElement('div');
  bubble.className = 'wa-widget-bubble';
  bubble.innerHTML = '<span>💬</span> <span>' + greeting + '</span>';

  var btn = document.createElement('div');
  btn.className = 'wa-widget-btn';
  btn.innerHTML = '<div class="wa-widget-pulse"></div>' +
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="30" height="30">' +
      '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>' +
    '</svg>';

  btn.addEventListener('click', function() {
    var url = 'https://wa.me/' + phone + '?text=' + message;
    window.open(url, '_blank');
  });

  container.appendChild(style);
  container.appendChild(bubble);
  container.appendChild(btn);
  document.body.appendChild(container);

  setTimeout(function() { bubble.classList.add('show'); }, 2000);
  setTimeout(function() { bubble.classList.remove('show'); }, 8000);
})();
`;

    return new Response(widgetScript, {
      headers: {
        "Content-Type": "application/javascript",
        "Cache-Control": "public, max-age=3600"
      },
    });
  } catch (err: any) {
    console.error("Erro ao gerar script do widget:", err);
    return new Response("console.error('WhatsApp Widget: Erro interno no servidor');", {
      headers: { "Content-Type": "application/javascript" },
      status: 500
    });
  }
}
