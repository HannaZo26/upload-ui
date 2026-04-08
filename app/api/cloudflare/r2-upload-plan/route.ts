import { NextResponse } from "next/server";

import { buildUploadSession, type CloudflareUploadPlanRequestFile } from "../../_cloudflare_r2";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const username = String(body?.username || "").trim();
    const pageName = String(body?.pageName || "").trim();
    const rawFiles = Array.isArray(body?.files) ? body.files : [];

    if (!username) {
      return NextResponse.json({ error: "username is required." }, { status: 400 });
    }

    if (!pageName) {
      return NextResponse.json({ error: "pageName is required." }, { status: 400 });
    }

    if (!rawFiles.length) {
      return NextResponse.json({ error: "At least one file is required." }, { status: 400 });
    }

    const files: CloudflareUploadPlanRequestFile[] = rawFiles.map((file: any, index: number) => ({
      clientId: String(file?.clientId || `file-${index + 1}`).trim(),
      name: String(file?.name || "").trim(),
      size: Number(file?.size || 0),
      type: String(file?.type || "").trim(),
      lastModified: Number(file?.lastModified || 0),
    }));

    const session = await buildUploadSession({
      username,
      pageName,
      files,
    });

    return NextResponse.json({
      ok: true,
      uploadSession: session,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || "Failed to create Cloudflare upload plan.",
      },
      { status: 500 }
    );
  }
}
