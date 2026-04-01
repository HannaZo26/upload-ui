export async function GET() {
  try {
    const res = await fetch("https://okurl.io/v1/projects/list", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OKURL_API_KEY}`,
      },
      body: JSON.stringify({
        domain_id: process.env.OKURL_DOMAIN_ID,
      }),
    });

    const data = await res.json();

    return Response.json(data);
  } catch (err: any) {
    return Response.json(
      { error: err.message || "Failed to fetch projects" },
      { status: 500 }
    );
  }
}
