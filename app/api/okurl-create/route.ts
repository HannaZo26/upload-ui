export async function POST(req: Request) {
  try {
    const body = await req.json();

    const apiKey = process.env.OKURL_API_KEY!;
    const domainId = process.env.OKURL_DOMAIN_ID!;

    const res = await fetch("https://okurl.io/v1/links", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url: body.url,
        domain_id: domainId,
        project_id: body.project_id,
        utm_template_id: body.utm_template_id   // ✅關鍵
      })
    });

    const data = await res.json();

    return Response.json({
      short_url:
        data.short_url ||
        data.data?.short_url ||
        data.link ||
        ""
    });

  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
