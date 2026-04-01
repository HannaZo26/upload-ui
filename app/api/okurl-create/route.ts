export async function POST(req: Request) {
  try {
    const body = await req.json();
    const url = String(body?.url || "").trim();
    const projectId = Number(body?.project_id);
    const slug = String(body?.slug || "").trim();

    if (!url) {
      return Response.json(
        { error: "Missing url" },
        { status: 400 }
      );
    }

    if (!projectId) {
      return Response.json(
        { error: "Missing project_id" },
        { status: 400 }
      );
    }

    const domainId = String(process.env.OKURL_DOMAIN_ID || "").trim();
    const apiKey = String(process.env.OKURL_API_KEY || "").trim();

    if (!domainId) {
      return Response.json(
        { error: "Missing OKURL_DOMAIN_ID in environment variables" },
        { status: 500 }
      );
    }

    if (!apiKey) {
      return Response.json(
        { error: "Missing OKURL_API_KEY in environment variables" },
        { status: 500 }
      );
    }

    const payload: Record<string, string | number> = {
      domain_id: domainId,
      url,
      project_id: projectId,
    };

    if (slug) {
      payload.slug = slug;
    }

    const res = await fetch("https://okurl.io/v1/urls/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const raw = await res.json();

    const candidateShortUrl =
      raw?.short_url ||
      raw?.shortUrl ||
      raw?.data?.short_url ||
      raw?.data?.shortUrl ||
      raw?.data?.short ||
      raw?.data?.url ||
      raw?.url ||
      raw?.link ||
      raw?.data?.link ||
      "";

    if (!res.ok) {
      const code = String(raw?.code || raw?.error || raw?.message || "").toLowerCase();

      if (
        code.includes("slug") &&
        (code.includes("exist") || code.includes("taken") || code.includes("duplicate"))
      ) {
        return Response.json(
          {
            error: "This custom slug already exists. Please try another slug.",
            raw,
          },
          { status: 409 }
        );
      }

      return Response.json(
        {
          error: raw?.code || raw?.message || "OKURL request failed",
          raw,
        },
        { status: res.status }
      );
    }

    if (raw?._res === "err") {
      const code = String(raw?.code || raw?.message || "").toLowerCase();

      if (
        code.includes("slug") &&
        (code.includes("exist") || code.includes("taken") || code.includes("duplicate"))
      ) {
        return Response.json(
          {
            error: "This custom slug already exists. Please try another slug.",
            raw,
          },
          { status: 409 }
        );
      }

      return Response.json(
        {
          error: raw?.code || raw?.message || "OKURL returned an error",
          raw,
        },
        { status: 400 }
      );
    }

    if (!candidateShortUrl) {
      return Response.json(
        {
          error: "OKURL did not return a short URL",
          raw,
        },
        { status: 502 }
      );
    }

    return Response.json({
      success: true,
      short_url: candidateShortUrl,
      data: raw,
    });
  } catch (err: any) {
    return Response.json(
      {
        error: err?.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
