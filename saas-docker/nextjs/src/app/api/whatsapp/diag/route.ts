import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const evolutionUrl = process.env.EVOLUTION_URL;
  const evolutionKey = process.env.EVOLUTION_API_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  const results: Record<string, any> = {
    appUrl,
    webhookUrl: appUrl ? `${appUrl}/api/webhooks/evolution` : null,
    evolutionUrl,
    evolutionOnline: false,
    evolutionKeyConfigured: !!evolutionKey,
    webhookReachable: false,
  };

  // Test Evolution API
  if (evolutionUrl) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(evolutionUrl, { signal: controller.signal });
      clearTimeout(timeout);
      results.evolutionOnline = res.ok;
    } catch {
      results.evolutionOnline = false;
    }
  }

  // Test webhook endpoint is reachable
  if (appUrl) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${appUrl}/api/warm/evolution`, { signal: controller.signal });
      clearTimeout(timeout);
      results.webhookReachable = true;
    } catch {
      results.webhookReachable = false;
    }
  }

  return NextResponse.json(results);
}