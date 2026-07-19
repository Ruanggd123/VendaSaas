import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "http://evolution:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "429683C4C977415CAAFCCE10F7D57E11";

/**
 * Envia uma mensagem de texto via WhatsApp (Evolution API)
 * @param instanceName Nome da instância do tenant
 * @param number Número de telefone no formato internacional (ex: 5511999999999)
 * @param text Texto da mensagem
 */
export async function sendWhatsAppMessage(instanceName: string, number: string, text: string) {
  try {
    const res = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: number,
        text: text,
        delay: 1200,
      }),
    });

    if (!res.ok) {
      console.error(`Erro ao enviar mensagem para ${number} na instância ${instanceName}:`, await res.text());
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
        apikey: EVOLUTION_API_KEY,
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
export async function sendWhatsAppMedia(instanceName: string, number: string, mediaUrl: string, caption?: string) {
  try {
    // Inferir o mediatype baseado na extensão da URL
    const urlLower = mediaUrl.toLowerCase();
    let mediaType = "document"; // Padrão seguro para PDFs, ZIPs, etc.
    
    if (urlLower.match(/\.(jpeg|jpg|gif|png|webp|bmp)$/i)) {
      mediaType = "image";
    } else if (urlLower.match(/\.(mp4|avi|mkv|mov|webm)$/i)) {
      mediaType = "video";
    } else if (urlLower.match(/\.(mp3|ogg|wav)$/i)) {
      mediaType = "audio";
    }

    const res = await fetch(`${EVOLUTION_API_URL}/message/sendMedia/${instanceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: number,
        media: mediaUrl,
        mediatype: mediaType,
        caption: caption || "",
        delay: 1200,
      }),
    });

    if (!res.ok) {
      console.error(`Erro ao enviar media para ${number} na instância ${instanceName}:`, await res.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error(`Falha ao enviar media na Evolution API:`, error);
    return false;
  }
}
