import { NextResponse } from "next/server";

import {
  errorResponse,
  normalizeShortsgenResults,
  pickFirstString,
  shortsgenRequest,
} from "../../../../_shortsgen";

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await context.params;

    if (!jobId) {
      return NextResponse.json({ error: "Missing ShortsGen job id." }, { status: 400 });
    }

    const result = await shortsgenRequest(`/api/v1/job/${encodeURIComponent(jobId)}`, {
      method: "GET",
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
            ) || "Failed to get ShortsGen results.",
          upstream: result.data,
        },
        { status: result.status || 500 }
      );
    }

    let clips = normalizeShortsgenResults(result.data);
    let upstream = result.data;
    let source = "job_status";

    if (!clips.length) {
      const fallbackResult = await shortsgenRequest(
        `/api/v1/job/${encodeURIComponent(jobId)}/results`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (fallbackResult.ok) {
        const fallbackClips = normalizeShortsgenResults(fallbackResult.data);

        if (fallbackClips.length) {
          clips = fallbackClips;
          upstream = fallbackResult.data;
          source = "job_results";
        }
      }
    }

    return NextResponse.json({
      id: jobId,
      clips,
      total: clips.length,
      source,
      upstream,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
