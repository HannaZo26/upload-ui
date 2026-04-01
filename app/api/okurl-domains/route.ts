import { NextResponse } from "next/server";

import { errorResponse, okurlPost, pickFirstString } from "../_okurl";

export async function GET() {
  try {
    const result = await okurlPost("/domains/list", {});

    if (!result.ok) {
      return NextResponse.json(
        {
          error:
            result.data?.msg ||
            result.data?.code ||
            "Failed to load OKURL domains.",
          upstream: result.data,
        },
        { status: result.status || 500 }
      );
    }

    const rawDomains = Array.isArray(result.data?.domains)
      ? result.data.domains
      : Array.isArray(result.data?.data?.domains)
      ? result.data.data.domains
      : Array.isArray(result.data?.data)
      ? result.data.data
      : [];

    const domains = rawDomains
      .map((item: any) => ({
        id: pickFirstString(item?.id),
        domain: pickFirstString(
          item?.domain,
          item?.name,
          item?.host,
          item?.new_domain
        ),
        path_prefix: pickFirstString(item?.path_prefix, item?.pathPrefix, "s"),
      }))
      .filter((item: { id: string; domain: string }) => item.id && item.domain);

    return NextResponse.json({ domains, upstream: result.data });
  } catch (error) {
    return errorResponse(error);
  }
}
