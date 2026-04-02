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

    const result = await shortsgenRequest(
      `/api/v1/job/${encodeURIComponent(jobId)}/results`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

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

    const clips = normalizeShortsgenResults(result.data);

    return NextResponse.json({
      id: jobId,
      clips,
      total: clips.length,
      upstream: result.data,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
