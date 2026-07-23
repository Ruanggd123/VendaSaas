import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function disconnectWhatsappInstances(filter: { tenant_id?: string; partner_id?: string }) {
  try {
    const { tenant_id, partner_id } = filter;
    if (!tenant_id && !partner_id) return;

    const instances = await prisma.whatsappInstance.findMany({
      where: {
        ...(tenant_id ? { tenant_id } : {}),
        ...(partner_id ? { partner_id } : {})
      }
    });

    if (instances.length === 0) return;

    const evolutionUrl = process.env.EVOLUTION_URL || "http://evolution:8080";
    const evolutionKey = process.env.EVOLUTION_API_KEY;

    for (const instance of instances) {
      console.log(`[WhatsApp Disconnect] Desconectando instância: ${instance.name}`);

      // 1. Tentar logout na Evolution API
      if (evolutionKey) {
        try {
          await fetch(`${evolutionUrl}/instance/logout/${instance.name}`, {
            method: "DELETE",
            headers: {
              'apikey': evolutionKey,
              'ngrok-skip-browser-warning': 'true'
            }
          }).catch(() => {});

          // 2. Deletar instância na Evolution API
          await fetch(`${evolutionUrl}/instance/delete/${instance.name}`, {
            method: "DELETE",
            headers: {
              'apikey': evolutionKey,
              'ngrok-skip-browser-warning': 'true'
            }
          }).catch(() => {});
        } catch (err) {
          console.error(`[WhatsApp Disconnect] Erro ao chamar Evolution API para ${instance.name}:`, err);
        }
      }

      // 3. Remover do banco de dados
      await prisma.whatsappInstance.delete({
        where: { id: instance.id }
      }).catch(err => console.error(`[WhatsApp Disconnect] Erro ao deletar do DB ${instance.id}:`, err));
    }
  } catch (error) {
    console.error("[WhatsApp Disconnect] Erro geral ao desconectar instâncias de WhatsApp:", error);
  }
}
