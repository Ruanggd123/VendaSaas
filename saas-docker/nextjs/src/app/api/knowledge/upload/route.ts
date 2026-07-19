import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const mimeType = file.type;
    const title = file.name;
    const isImage = mimeType.startsWith('image/');

    // Aceita PDFs, TXT e Imagens
    if (mimeType !== 'application/pdf' && mimeType !== 'text/plain' && !isImage) {
      return NextResponse.json({ error: 'Formato não suportado. Envie PDF, TXT ou Imagem.' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const bufferData = Buffer.from(buffer);
    
    let textContent = '';

    if (mimeType === 'application/pdf') {
      const pdfParse = require('pdf-parse');
      const parsed = await pdfParse(bufferData);
      textContent = parsed.text;
    } else if (isImage) {
      // Usar visão multimodal do Gemini para transcrever a imagem/tabelas/texto
      const visionModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const imageParts = [
        {
          inlineData: {
            data: bufferData.toString("base64"),
            mimeType: mimeType
          },
        },
      ];
      
      const result = await visionModel.generateContent([
        "Faça a transcrição completa de todo o texto contido nesta imagem de forma detalhada e estruturada. Se houver tabelas, organize as informações em formato legível de texto ou markdown. Retorne somente o conteúdo transcrito, sem preâmbulos ou explicações adicionais.",
        ...imageParts
      ]);
      
      textContent = result.response.text();
    } else {
      textContent = bufferData.toString('utf-8');
    }

    // Criar o Document no DB (Status processing)
    const document = await prisma.document.create({
      data: {
        tenant_id: session.tenantId,
        title,
        content_text: textContent,
        mime_type: mimeType,
        status: 'processing',
      }
    });

    // Dividir texto em chunks de ~1000 caracteres
    const chunks = splitTextIntoChunks(textContent, 1000);
    
    // Processamento de Embeddings (em background/async ou direto se for pequeno)
    const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

    // Em um sistema real rodaria numa fila BullMQ, mas vamos processar síncrono para o MVP
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      if (chunkText.trim().length < 10) continue; // ignora chunks muito pequenos/vazios

      const result = await embeddingModel.embedContent(chunkText);
      const embedding = result.embedding.values; // array of floats [768]
      
      // Como o Prisma não suporta insert vetor direto nativamente de forma limpa, 
      // usaremos Prisma raw query para inserir o embedding pgvector.
      const chunkId = crypto.randomUUID();
      
      await prisma.$executeRaw`
        INSERT INTO document_chunks (id, document_id, chunk_index, text_content, embedding, created_at)
        VALUES (${chunkId}, ${document.id}, ${i}, ${chunkText}, ${embedding}::vector, NOW())
      `;
    }

    // Atualiza status para indexed
    await prisma.document.update({
      where: { id: document.id },
      data: { status: 'indexed' }
    });

    return NextResponse.json({ success: true, documentId: document.id });

  } catch (error: any) {
    console.error("Error uploading knowledge file:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function splitTextIntoChunks(text: string, maxChars: number) {
  // Uma quebra simples por parágrafos para manter contexto
  const paragraphs = text.split('\n\n');
  const chunks = [];
  let currentChunk = '';

  for (const p of paragraphs) {
    if ((currentChunk.length + p.length) > maxChars && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = '';
    }
    currentChunk += p + '\n\n';
  }
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk);
  }
  return chunks;
}
