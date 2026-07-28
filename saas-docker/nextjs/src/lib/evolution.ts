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
/**
 * Envia uma lista interativa via WhatsApp (Evolution API)
 * Suporta até 10 opções em múltiplas seções.
 * O usuário clica no botão e vê um menu suspenso para selecionar.
 */
export async function sendWhatsAppList(
  instanceName: string,
  number: string,
  title: string,
  description: string,
  sections: { title: string; rows: { title: string; description?: string; rowId: string }[] }[],
  footerText?: string,
  buttonText?: string
) {
  try {
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      console.error("Evolution sendList indisponível: configuração ausente");
      return false;
    }

    const res = await fetch(`${EVOLUTION_API_URL.replace(/\/$/, "")}/message/sendList/${encodeURIComponent(instanceName)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: EVOLUTION_API_KEY || "",
      },
      body: JSON.stringify({
        number,
        title,
        description,
        footerText: footerText || "",
        buttonText: buttonText || "Ver opções",
        sections,
      }),
    });

    if (!res.ok) {
      const responseBody = await res.text().catch(() => "");
      console.error("Evolution sendList recusou", {
        instanceName,
        status: res.status,
        responseBody,
      });
      return false;
    }
    return true;
  } catch (error) {
    console.error(`Falha ao enviar lista na Evolution API:`, error);
    return false;
  }
}

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

/**
 * Envia opções como enquete de escolha única. Enquetes usam um formato nativo
 * que funciona no WhatsApp móvel e Web mesmo quando quick replies não renderizam.
 */
export async function sendWhatsAppPoll(
  instanceName: string,
  number: string,
  title: string,
  options: string[],
) {
  try {
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      console.error("Evolution sendPoll indisponível: configuração ausente");
      return false;
    }

    const values = options.map((option) => option.trim()).filter(Boolean).slice(0, 12);
    if (values.length < 2) return false;

    const res = await fetch(`${EVOLUTION_API_URL.replace(/\/$/, "")}/message/sendPoll/${encodeURIComponent(instanceName)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number,
        name: title,
        selectableCount: 1,
        values,
      }),
    });

    if (!res.ok) {
      const responseBody = await res.text().catch(() => "");
      console.error("Evolution sendPoll recusou", {
        instanceName,
        status: res.status,
        responseBody,
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error("Falha ao enviar enquete na Evolution API:", error);
    return false;
  }
}

/**
 * Envia uma mensagem com botões interativos via WhatsApp (Evolution API)
 * Máximo de 3 botões.
 */
export async function sendWhatsAppButtons(
  instanceName: string,
  number: string,
  text: string,
  buttons: { text: string; id: string }[],
  title?: string,
  footer?: string
) {
  try {
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      console.error("Evolution sendButtons indisponível: configuração ausente");
      return false;
    }

    const formattedButtons = buttons.slice(0, 3).map((b) => ({
      type: "reply",
      displayText: b.text,
      id: b.id,
    }));

    const res = await fetch(`${EVOLUTION_API_URL.replace(/\/$/, "")}/message/sendButtons/${encodeURIComponent(instanceName)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: EVOLUTION_API_KEY || "",
      },
      body: JSON.stringify({
        number,
        title: title || "Opções",
        description: text,
        footer: footer || "",
        buttons: formattedButtons,
      }),
    });

    if (!res.ok) {
      const responseBody = await res.text().catch(() => "");
      console.error("Evolution sendButtons recusou", {
        instanceName,
        status: res.status,
        responseBody,
      });
      return false;
    }
    return true;
  } catch (error) {
    console.error(`Falha ao enviar botões na Evolution API:`, error);
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

/** Envia áudio como mensagem de voz nativa (PTT), em vez de arquivo genérico. */
export async function sendWhatsAppAudio(instanceName: string, number: string, audioUrl: string) {
  try {
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      console.error("Evolution sendWhatsAppAudio indisponível: configuração ausente");
      return false;
    }

    const res = await fetch(`${EVOLUTION_API_URL.replace(/\/$/, "")}/message/sendWhatsAppAudio/${encodeURIComponent(instanceName)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: EVOLUTION_API_KEY,
      },
      body: JSON.stringify({ number, audio: audioUrl, delay: 280 }),
    });

    if (!res.ok) {
      const responseBody = await res.text().catch(() => "");
      console.error("Evolution sendWhatsAppAudio recusou", {
        instanceName,
        status: res.status,
        responseBody,
      });
      return false;
    }
    return true;
  } catch (error) {
    console.error("Falha ao enviar áudio na Evolution API:", error);
    return false;
  }
}
