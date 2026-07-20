import { getSession } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

const prisma = new PrismaClient();

export default async function ApiKeysPage() {
  const session = await getSession();
  if (!session || !session.tenant_id) {
    redirect("/login");
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenant_id },
  });

  if (!tenant) {
    redirect("/login");
  }

  // Se o Tenant não tiver API Key (registros antigos antes da migração), gera uma agora
  let apiKey = tenant.api_key;
  if (!apiKey) {
    const crypto = require("crypto");
    apiKey = crypto.randomUUID();
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { api_key: apiKey },
    });
  }

  // Pegar o host dinâmico para os exemplos
  const headersList = headers();
  const host = headersList.get("host") || "seusistema.com.br";
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Integrações e API</h1>
        <p className="text-gray-500">
          Utilize sua Chave de API para conectar sistemas externos (como sites de rifas, e-commerce, automações) e enviar mensagens de WhatsApp através da sua conta conectada.
        </p>
      </div>

      {/* Card da API Key */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Sua Chave de API (API Key)</h2>
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <code className="flex-1 w-full block bg-gray-50 p-4 rounded-xl border border-gray-200 text-sm font-mono break-all text-gray-800 shadow-inner">
            {apiKey}
          </code>
        </div>
        <p className="mt-4 text-sm text-amber-700 font-medium bg-amber-50 p-3 rounded-lg border border-amber-200 inline-block">
          ⚠️ <strong>Atenção:</strong> Nunca compartilhe esta chave publicamente. Qualquer sistema com esta chave poderá enviar mensagens no seu nome usando sua instância do WhatsApp.
        </p>
      </div>

      {/* Documentação */}
      <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-6 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <svg width="100" height="100" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 7H20M4 12H20M4 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h2 className="text-xl font-semibold mb-4 text-gray-100 relative z-10">Como enviar mensagens (Documentação)</h2>
        <p className="text-slate-400 mb-6 relative z-10">
          Para enviar mensagens a partir do site de um terceiro, o desenvolvedor deles precisa fazer uma requisição HTTP POST para o nosso sistema informando o número de destino e o texto.
        </p>
        
        <div className="space-y-6 relative z-10">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Endpoint URL</h3>
            <code className="block bg-slate-950 p-4 rounded-xl text-emerald-400 font-mono text-sm border border-slate-800 shadow-inner">
              POST {baseUrl}/api/v1/messages
            </code>
          </div>

          <div className="pt-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Exemplo de Requisição cURL</h3>
            <pre className="bg-slate-950 p-4 rounded-xl overflow-x-auto text-sm font-mono border border-slate-800 shadow-inner text-slate-300 leading-relaxed">
{`curl -X POST ${baseUrl}/api/v1/messages \\
-H "Content-Type: application/json" \\
-H "Authorization: Bearer ${apiKey}" \\
-d '{
  "numero": "5511999999999",
  "mensagem": "Olá, João! Seus números da rifa são 45 e 12."
}'`}
            </pre>
          </div>

          <div className="pt-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Exemplo com JavaScript (Fetch)</h3>
            <pre className="bg-slate-950 p-4 rounded-xl overflow-x-auto text-sm font-mono border border-slate-800 shadow-inner text-cyan-300 leading-relaxed">
{`fetch("${baseUrl}/api/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer ${apiKey}"
  },
  body: JSON.stringify({
    numero: "5511999999999",
    mensagem: "O seu pedido #123 foi aprovado com sucesso!"
  })
})
.then(res => res.json())
.then(data => console.log(data));`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
