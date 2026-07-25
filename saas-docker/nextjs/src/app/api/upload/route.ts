import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

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
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Arquivo muito grande. Limite: 10MB' }, { status: 400 });
    }

    // Validar tipo de arquivo por extensão (whitelist segura)
    const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.mp4', '.mp3', '.ogg', '.webm', '.m4a', '.docx', '.xlsx', '.zip'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: `Tipo de arquivo não permitido: ${ext}. Permitidos: ${ALLOWED_EXTENSIONS.join(', ')}` }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const bufferData = Buffer.from(buffer);
    
    // Nome único para evitar conflito
    const filename = `${session.tenantId}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    // Configuração Cloudflare R2
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.R2_BUCKET_NAME;
    const publicUrl = process.env.R2_PUBLIC_URL;

    // Fallback: Se o R2 não estiver configurado no .env, salva no disco local.
    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      console.log("R2 credentials not fully configured. Using local disk fallback.");
      const publicDir = join(process.cwd(), 'public');
      const uploadsDir = join(publicDir, 'uploads');
      await mkdir(uploadsDir, { recursive: true });
      
      const filePath = join(uploadsDir, filename);
      await writeFile(filePath, bufferData);
      
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin).replace(/\/$/, '');
      return NextResponse.json({ success: true, url: `${appUrl}/uploads/${filename}` });
    }

    // Instancia o Client do S3 apontando para o Cloudflare R2
    const s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: filename,
      Body: bufferData,
      ContentType: file.type || "application/octet-stream",
    }));

    // Retorna a URL pública. (A URL pública precisa estar mapeada no Cloudflare)
    const fileUrl = publicUrl ? `${publicUrl.replace(/\/$/, '')}/${filename}` : `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${filename}`;

    return NextResponse.json({ success: true, url: fileUrl });
  } catch (error) {
    console.error("Error in upload API:", error);
    return NextResponse.json({ error: 'Não foi possível enviar o arquivo. Tente novamente.' }, { status: 500 });
  }
}
