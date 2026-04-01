export async function GET(req: Request) {
  try {
    const apiKey = String(process.env.OKURL_API_KEY || "").trim();
    const domainId = String(process.env.OKURL_DOMAIN_ID || "").trim();

    if (!apiKey) {
      return Response.json(
        { error: "Missing OKURL_API_KEY in environment variables" },
        { status: 500 }
      );
    }

    if (!domainId) {
      return Response.json(
        { error: "Missing OKURL_DOMAIN_ID in environment variables" },
        { status: 500 }
      );
    }

    // 如果你的 OKURL 文件顯示的 endpoint 不同，只改這一行
    const ENDPOINT = "https://okurl.io/v1/utm_templates/list";

    const url = new URL(req.url);
    const projectId = url.searchParams.get("project_id");

    const payload: Record<string, string | number> = {
      domain_id: domainId,
    };

    if (projectId) {
      payload.project_id = Number(projectId);
    }

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const raw = await res.json();

    if (!res.ok || raw?._res === "err") {
      return Response.json(
        {
          error: raw?.code || raw?.message || "Failed to load UTM templates",
          raw,
        },
        { status: res.ok ? 400 : res.status }
      );
    }

    const rawUtms = Array.isArray(raw?.utms)
      ? raw.utms
      : Array.isArray(raw?.data?.utms)
      ? raw.data.utms
      : Array.isArray(raw?.data)
      ? raw.data
      : [];

    const utms = rawUtms
      .map((item: any) => ({
        id: Number(item?.id),
        name: String(item?.name || item?.title || "").trim(),
      }))
      .filter((item: any) => item.id && item.name);

    return Response.json({ utms });
  } catch (err: any) {
    return Response.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
