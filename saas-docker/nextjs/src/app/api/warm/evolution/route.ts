import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const evolutionUrl = process.env.EVOLUTION_URL;
    if (!evolutionUrl) {
      return NextResponse.json({ status: "no_url" });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(evolutionUrl, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    return NextResponse.json({ status: res.ok ? "warm" : "error", statusCode: res.status });
  } catch {
    return NextResponse.json({ status: "cold_booting" });
  }
}