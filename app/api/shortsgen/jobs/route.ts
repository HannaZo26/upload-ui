import { NextResponse } from "next/server";

import {
  errorResponse,
  extractContentId,
  normalizeShortsgenStatus,
  pickFirstString,
  shortsgenRequest,
} from "../../_shortsgen";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const sourceUrl = pickFirstString(body?.source_url, body?.sourceUrl, body?.url);
    const contentId = pickFirstString(
      body?.content_id,
      body?.contentId,
      extractContentId(sourceUrl)
    );

    if (!contentId) {
      return NextResponse.json(
        { error: "A valid Gan Jing World content ID or video URL is required." },
        { status: 400 }
      );
    }

    const options =
      body?.options && typeof body.options === "object"
        ? body.options
        : { mode: "aiClipping" };

    const result = await shortsgenRequest("/api/v2/jobs", {
      method: "POST",
      includeJson: true,
      body: JSON.stringify({
        content_id: contentId,
        options: {
          mode: "aiClipping",
          ...options,
        },
      }),
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error:
            pickFirstString(
              result.data?.message,
              result.data?.error,
              result.data?.msg,
              result.data?.detail
            ) || "Failed to submit ShortsGen job.",
          upstream: result.data,
        },
        { status: result.status || 500 }
      );
    }

    const jobId = pickFirstString(
      result.data?.id,
      result.data?.job_id,
      result.data?.jobId,
      result.data?.data?.id,
      result.data?.data?.job_id,
      result.data?.data?.jobId
    );

    return NextResponse.json({
      id: jobId,
      status: normalizeShortsgenStatus(result.data) || "SCHEDULED",
      content_id: contentId,
      source_url: sourceUrl,
      upstream: result.data,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
