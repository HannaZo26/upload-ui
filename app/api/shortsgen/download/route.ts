import { NextResponse } from "next/server";

import { errorResponse, pickFirstString } from "../../_shortsgen";

const isPrivateHostname = (hostname: string) => {
  const host = hostname.trim().toLowerCase();

  if (!host) return true;
  if (host === "localhost" || host.endsWith(".local")) return true;
  if (host === "127.0.0.1" || host === "::1") return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^169\.254\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;

  return false;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const targetUrl = pickFirstString(body?.url);

    if (!targetUrl) {
      return NextResponse.json(
        { error: "Missing required field: url" },
        { status: 400 }
      );
    }

    let parsed: URL;

    try {
      parsed = new URL(targetUrl);
    } catch {
      return NextResponse.json({ error: "Invalid download URL." }, { status: 400 });
    }

    if (parsed.protocol !== "https:") {
      return NextResponse.json(
        { error: "Only https download URLs are allowed." },
        { status: 400 }
      );
    }

    if (isPrivateHostname(parsed.hostname)) {
      return NextResponse.json(
        { error: "Private or local hosts are not allowed." },
        { status: 400 }
      );
    }

    const upstream = await fetch(parsed.toString(), {
      method: "GET",
      cache: "no-store",
    });

    if (!upstream.ok) {
      return NextResponse.json(
        {
          error: `Failed to fetch shorts file (${upstream.status}).`,
        },
        { status: upstream.status || 502 }
      );
    }

    const arrayBuffer = await upstream.arrayBuffer();
    const contentType = upstream.headers.get("content-type") || "video/mp4";
    const contentLength = upstream.headers.get("content-length");

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        ...(contentLength ? { "Content-Length": contentLength } : {}),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
