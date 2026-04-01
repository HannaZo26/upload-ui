import { NextResponse } from "next/server";

import { errorResponse, okurlPost, pickFirstString } from "../_okurl";

const FALLBACK_DOMAIN_ID = "1";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const domainId = pickFirstString(
      searchParams.get("domain_id"),
      FALLBACK_DOMAIN_ID
    );

    const result = await okurlPost("/utm-templates/list", {
      domain_id: domainId,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error:
            result.data?.msg ||
            result.data?.code ||
            "Failed to load OKURL UTM templates.",
          upstream: result.data,
        },
        { status: result.status || 500 }
      );
    }

    const rawTemplates = Array.isArray(result.data?.templates)
      ? result.data.templates
      : Array.isArray(result.data?.data?.templates)
      ? result.data.data.templates
      : Array.isArray(result.data?.data)
      ? result.data.data
      : [];

    return NextResponse.json({ templates: rawTemplates, upstream: result.data });
  } catch (error) {
    return errorResponse(error);
  }
}
