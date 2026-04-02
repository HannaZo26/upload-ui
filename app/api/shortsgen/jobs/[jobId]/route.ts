import { NextResponse } from "next/server";

import {
  errorResponse,
  normalizeShortsgenProgress,
  normalizeShortsgenStatus,
  pickFirstString,
  shortsgenRequest,
} from "../../../_shortsgen";

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
            ) || "Failed to check ShortsGen job status.",
          upstream: result.data,
        },
        { status: result.status || 500 }
      );
    }

    return NextResponse.json({
      id: jobId,
      status: normalizeShortsgenStatus(result.data) || "UNKNOWN",
      progress: normalizeShortsgenProgress(result.data),
      upstream: result.data,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
