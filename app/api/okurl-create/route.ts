export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url, project_id, slug } = body ?? {};

    if (!url || !project_id) {
      return Response.json(
        { error: "Missing url or project_id" },
        { status: 400 }
      );
    }

    const payload: Record<string, string | number> = {
      url,
      project_id,
      domain_id: process.env.OKURL_DOMAIN_ID || "",
    };

    if (slug) {
      payload.slug = slug;
    }

    const res = await fetch("https://okurl.io/v1/urls/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OKURL_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      return Response.json(
        { error: data?.code || data?.message || "OKURL request failed", raw: data },
        { status: res.status }
      );
    }

    return Response.json(data);
  } catch (err: any) {
    return Response.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
