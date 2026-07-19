import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

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
      const { writeFile, mkdir } = require('fs/promises');
      const { join } = require('path');
      
      const publicDir = join(process.cwd(), 'public');
      const uploadsDir = join(publicDir, 'uploads');
      await mkdir(uploadsDir, { recursive: true });
      
      const filePath = join(uploadsDir, filename);
      await writeFile(filePath, bufferData);
      
      return NextResponse.json({ success: true, url: `/uploads/${filename}` });
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
  } catch (error: any) {
    console.error("Error in upload API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
