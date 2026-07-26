const EVOLUTION_API_URL = process.env.EVOLUTION_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
  console.warn("⚠️  EVOLUTION_URL ou EVOLUTION_API_KEY não configurados. Mensagens WhatsApp não funcionarão.");
}

/**
 * Envia uma mensagem de texto via WhatsApp (Evolution API)
 * @param instanceName Nome da instância do tenant
 * @param number Número de telefone no formato internacional (ex: 5511999999999)
 * @param text Texto da mensagem
 */
export async function sendWhatsAppMessage(instanceName: string, number: string, text: string) {
  try {
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      console.error("Evolution sendText indisponível: configuração ausente", {
        instanceName,
        hasUrl: Boolean(EVOLUTION_API_URL),
        hasKey: Boolean(EVOLUTION_API_KEY),
      });
      return false;
    }

    const res = await fetch(`${EVOLUTION_API_URL.replace(/\/$/, "")}/message/sendText/${encodeURIComponent(instanceName)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: EVOLUTION_API_KEY || "",
      },
      body: JSON.stringify({
        number: number,
        text: text,
        delay: 280,
      }),
    });

    if (!res.ok) {
      console.error("Evolution sendText recusou a mensagem", {
        instanceName,
        status: res.status,
        statusText: res.statusText,
      });
      return false;
    }
    return true;
  } catch (error) {
    console.error(`Falha ao conectar na Evolution API:`, error);
    return false;
  }
}

export async function getProfilePicture(instanceName: string, number: string) {
  try {
    const res = await fetch(`${EVOLUTION_API_URL}/chat/fetchProfilePictureUrl/${instanceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: EVOLUTION_API_KEY || "",
      },
      body: JSON.stringify({ number }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.profilePictureUrl || null;
    }
  } catch (e) {
    console.error("Erro ao buscar foto de perfil:", e);
  }
  return null;
}

/**
 * Envia uma mídia/arquivo via WhatsApp (Evolution API)
 * Infere automaticamente se é document, video, ou image.
 */
export async function sendWhatsAppMedia(instanceName: string, number: string, mediaUrl: string, caption?: string, explicitMediaType?: string) {
  try {
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      console.error("Evolution sendMedia indisponível: configuração ausente", {
        instanceName,
        hasUrl: Boolean(EVOLUTION_API_URL),
        hasKey: Boolean(EVOLUTION_API_KEY),
      });
      return false;
    }

    // Inferir o mediatype baseado na extensão da URL
    const urlLower = mediaUrl.toLowerCase();
    let mediaType = explicitMediaType || "document"; // Padrão seguro para PDFs, ZIPs, etc.
    
    if (!explicitMediaType) {
      if (urlLower.match(/\.(jpeg|jpg|gif|png|webp|bmp)$/i)) {
        mediaType = "image";
      } else if (urlLower.match(/\.(mp4|avi|mkv|mov)$/i)) {
        mediaType = "video";
      } else if (urlLower.match(/\.(mp3|ogg|wav|webm)$/i)) {
        mediaType = "audio";
      }
    }

    const res = await fetch(`${EVOLUTION_API_URL.replace(/\/$/, "")}/message/sendMedia/${encodeURIComponent(instanceName)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: EVOLUTION_API_KEY || "",
      },
      body: JSON.stringify({
        number: number,
        media: mediaUrl,
        mediatype: mediaType,
        caption: caption || "",
        delay: 280,
      }),
    });

    if (!res.ok) {
      console.error("Evolution sendMedia recusou a mídia", {
        instanceName,
        status: res.status,
        statusText: res.statusText,
      });
      return false;
    }
    return true;
  } catch (error) {
    console.error(`Falha ao enviar media na Evolution API:`, error);
    return false;
  }
}
