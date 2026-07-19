import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function getRelevantKnowledge(tenantId: string, query: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) return "";
  
  try {
    // 1. Gera embedding da pergunta
    const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await embeddingModel.embedContent(query);
    const queryEmbedding = result.embedding.values;

    // 2. Busca similaridade no PGVector (L2 distance <-> cosine similarity, pgvector usa <=> pra cosine)
    // Usando <= 0.3 de distancia cosine para retornar resultados relevantes
    // Cast queryEmbedding to a string format accepted by pgvector: '[1.0, 2.0, ...]'
    const vectorStr = `[${queryEmbedding.join(',')}]`;

    // A tabela document_chunks guarda os trechos. Vamos juntar com Document pra garantir tenantId.
    const chunks: any[] = await prisma.$queryRaw`
      SELECT c.text_content, 1 - (c.embedding <=> ${vectorStr}::vector) as similarity
      FROM document_chunks c
      JOIN "Document" d ON c.document_id = d.id
      WHERE d.tenant_id = ${tenantId}
        AND d.status = 'indexed'
      ORDER BY c.embedding <=> ${vectorStr}::vector
      LIMIT 3
    `;

    if (chunks.length === 0) return "";

    // Filtra chunks com similaridade muito baixa (< 0.6)
    const relevantChunks = chunks.filter(c => c.similarity > 0.6);
    
    if (relevantChunks.length === 0) return "";

    let knowledgeContext = "\n\n[BASE DE CONHECIMENTO DA EMPRESA (RAG)]\n";
    knowledgeContext += "Use os trechos abaixo extraídos dos manuais da empresa para responder à dúvida do cliente de forma precisa:\n\n";
    
    for (const chunk of relevantChunks) {
      knowledgeContext += `"""\n${chunk.text_content}\n"""\n\n`;
    }

    return knowledgeContext;
  } catch (err) {
    console.error("Erro na busca RAG:", err);
    return "";
  }
}
