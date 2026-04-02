import { NextResponse } from "next/server";

import {
  errorResponse,
  NormalizedShortsClip,
  normalizeShortsgenResults,
  pickFirstString,
  shortsgenRequest,
} from "../../../../_shortsgen";

const mergeClipLists = (...lists: NormalizedShortsClip[][]) => {
  const merged: NormalizedShortsClip[] = [];
  const seen = new Set<string>();

  lists.flat().forEach((clip) => {
    const key = `${clip.downloadUrl}::${clip.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(clip);
  });

  return merged
    .sort((a, b) => {
      if ((b.qualityScore || 0) !== (a.qualityScore || 0)) {
        return (b.qualityScore || 0) - (a.qualityScore || 0);
      }
      return a.rank - b.rank;
    })
    .map((clip, index) => ({
      ...clip,
      rank: index + 1,
    }));
};

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
      const mergedClips = mergeClipLists(fallbackClips, clips);

      if (mergedClips.length) {
        clips = mergedClips;
        upstream = {
          job_status: result.data,
          job_results: fallbackResult.data,
        };
        source =
          mergedClips.length > fallbackClips.length &&
          mergedClips.length > normalizeShortsgenResults(result.data).length
            ? "merged"
            : fallbackClips.length >= normalizeShortsgenResults(result.data).length
            ? "job_results"
            : "job_status";
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
