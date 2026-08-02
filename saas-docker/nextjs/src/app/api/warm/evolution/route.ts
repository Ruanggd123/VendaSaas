import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const evolutionUrl = process.env.EVOLUTION_URL || "https://evolution-api-03xi.onrender.com";

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(evolutionUrl, {
      method: "GET",
      signal: controller.signal,
    }).catch(() => null);

    clearTimeout(timeout);

    return NextResponse.json({ status: res?.ok ? "warm" : "ready", statusCode: res?.status || 200 });
  } catch {
    return NextResponse.json({ status: "ready" });
  }
}