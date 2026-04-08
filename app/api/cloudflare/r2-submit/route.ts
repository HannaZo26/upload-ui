import { NextResponse } from "next/server";

import { getR2StorageDescriptor, uploadJsonToR2 } from "../../_cloudflare_r2";

export const runtime = "nodejs";

const parseJsonSafe = (value: string) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return value;
  }
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const uploadSession = body?.uploadSession;
    const uploadedFiles = Array.isArray(body?.uploadedFiles) ? body.uploadedFiles : [];
    const username = String(body?.username || "").trim();
    const pageName = String(body?.pageName || "").trim();
    const folderName = String(body?.folderName || "").trim();
    const facebookPage = String(body?.facebookPage || pageName).trim();
    const manifestWebhookUrl = String(
      process.env.N8N_CLOUDFLARE_MANIFEST_WEBHOOK_URL || body?.n8nWebhookUrl || ""
    ).trim();

    if (!uploadSession?.sessionId || !uploadSession?.objectPrefix || !uploadSession?.manifestKey) {
      return NextResponse.json({ error: "uploadSession is incomplete." }, { status: 400 });
    }

    if (!username || !pageName || !folderName) {
      return NextResponse.json(
        { error: "username, pageName, and folderName are required." },
        { status: 400 }
      );
    }

    if (!uploadedFiles.length) {
      return NextResponse.json({ error: "uploadedFiles is required." }, { status: 400 });
    }

    const manifest = {
      manifestVersion: 1,
      provider: "cloudflare-r2",
      createdAt: new Date().toISOString(),
      uploadSession: {
        sessionId: String(uploadSession.sessionId),
        objectPrefix: String(uploadSession.objectPrefix),
        manifestKey: String(uploadSession.manifestKey),
      },
      storage: getR2StorageDescriptor(),
      username,
      page_name: pageName,
      folder_name: folderName,
      facebook_page: facebookPage,
      title: String(body?.title || "").trim(),
      target_url: String(body?.targetUrl || "").trim(),
      notes: String(body?.notes || "").trim(),
      facebook_comment: String(body?.facebookComment || "").trim(),
      short_url: String(body?.shortUrl || "").trim(),
      okurl_slug: String(body?.okurlSlug || "").trim(),
      okurl_domain: String(body?.okurlDomain || "").trim(),
      domain_id: String(body?.domainId || "").trim(),
      utm_template: String(body?.utmTemplate || "").trim(),
      utm_source: String(body?.utmFields?.source || "").trim(),
      utm_medium: String(body?.utmFields?.medium || "").trim(),
      utm_campaign: String(body?.utmFields?.campaign || "").trim(),
      utm_term: String(body?.utmFields?.term || "").trim(),
      utm_content: String(body?.utmFields?.content || "").trim(),
      utm_source_platform: String(body?.utmFields?.sourcePlatform || "").trim(),
      uploaded_files: uploadedFiles.map((file: any) => ({
        client_id: String(file?.clientId || "").trim(),
        file_name: String(file?.fileName || "").trim(),
        key: String(file?.key || "").trim(),
        public_url: String(file?.publicUrl || "").trim(),
        content_type: String(file?.contentType || "").trim(),
        size: Number(file?.size || 0),
        last_modified: Number(file?.lastModified || 0),
      })),
    };

    const manifestPublicUrl = await uploadJsonToR2(String(uploadSession.manifestKey), manifest);
    const manifestPayload = {
      ...manifest,
      manifest_public_url: manifestPublicUrl,
    };

    if (!manifestWebhookUrl) {
      return NextResponse.json({
        ok: true,
        manifest: manifestPayload,
        forwarded: null,
      });
    }

    const forwardResponse = await fetch(manifestWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(manifestPayload),
      cache: "no-store",
    });

    const rawForwardBody = await forwardResponse.text();
    const parsedForwardBody = parseJsonSafe(rawForwardBody);

    if (!forwardResponse.ok) {
      return NextResponse.json(
        {
          error:
            (typeof parsedForwardBody === "object" &&
              parsedForwardBody &&
              ((parsedForwardBody as any).error || (parsedForwardBody as any).message)) ||
            `Manifest webhook failed (${forwardResponse.status}).`,
          manifest: manifestPayload,
          forwarded: {
            status: forwardResponse.status,
            body: parsedForwardBody,
          },
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      manifest: manifestPayload,
      forwarded: {
        status: forwardResponse.status,
        body: parsedForwardBody,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || "Failed to submit Cloudflare manifest.",
      },
      { status: 500 }
    );
  }
}
