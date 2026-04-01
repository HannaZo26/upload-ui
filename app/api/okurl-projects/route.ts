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

    const result = await okurlPost("/projects/list", {
      domain_id: domainId,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error:
            result.data?.msg ||
            result.data?.code ||
            "Failed to load OKURL projects.",
          upstream: result.data,
        },
        { status: result.status || 500 }
      );
    }

    const rawProjects = Array.isArray(result.data?.projects)
      ? result.data.projects
      : Array.isArray(result.data?.data?.projects)
      ? result.data.data.projects
      : Array.isArray(result.data?.data)
      ? result.data.data
      : [];

    return NextResponse.json({ projects: rawProjects, upstream: result.data });
  } catch (error) {
    return errorResponse(error);
  }
}
