import { NextResponse } from "next/server";

const SHORTSGEN_API_BASE = "https://shortsgen.ganjingworld.com";

export type NormalizedShortsClip = {
  id: string;
  title: string;
  description: string;
  duration: string;
  angle: string;
  downloadUrl: string;
  thumbnailUrl: string;
  qualityLabel: string;
  qualityScore: number | null;
  rank: number;
};

export const pickFirstString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return "";
};

export const pickFirstNumber = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
};

export const getShortsgenHeaders = (includeJson = false) => {
  const apiKey = process.env.SHORTSGEN_API_KEY;

  if (!apiKey) {
    throw new Error("SHORTSGEN_API_KEY is not configured on the server.");
  }

  return {
    "X-API-Key": apiKey,
    ...(includeJson ? { "Content-Type": "application/json" } : {}),
  };
};

export const shortsgenRequest = async (
  path: string,
  init?: RequestInit & { includeJson?: boolean }
) => {
  const response = await fetch(`${SHORTSGEN_API_BASE}${path}`, {
    ...init,
    headers: {
      ...getShortsgenHeaders(Boolean(init?.includeJson)),
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  const text = await response.text();
  let data: any = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
};

export const extractContentId = (value: string) => {
  const trimmed = value.trim();

  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  } catch {
    return trimmed.replace(/^\/+|\/+$/g, "");
  }
};

const hasShortsgenResultPayload = (data: any) => {
  const resultArrays = [
    data?.result?.shorts,
    data?.data?.result?.shorts,
    data?.result?.results,
    data?.data?.result?.results,
    data?.results,
    data?.data?.results,
    data?.clips,
    data?.data?.clips,
    data?.items,
    data?.data?.items,
    data?.result?.items,
    data?.data?.result?.items,
    data?.result?.data,
    data?.data?.result?.data,
    data?.output,
    data?.data?.output,
  ].some((value) => Array.isArray(value) && value.length > 0);

  const directUrl = pickFirstString(
    data?.shorts_url,
    data?.shortsUrl,
    data?.short_url,
    data?.url,
    data?.download_url,
    data?.downloadUrl,
    data?.data?.shorts_url,
    data?.data?.shortsUrl,
    data?.data?.short_url,
    data?.data?.url,
    data?.data?.download_url,
    data?.data?.downloadUrl
  );

  return resultArrays || Boolean(directUrl);
};

const normalizeStatusToken = (value: string) =>
  value.trim().replace(/[\s-]+/g, "_").replace(/_+/g, "_").toUpperCase();

const getShortsgenStatusCandidates = (data: any) => [
  { value: data?.data?.job_status, source: "job" as const },
  { value: data?.data?.jobStatus, source: "job" as const },
  { value: data?.data?.task_status, source: "job" as const },
  { value: data?.data?.taskStatus, source: "job" as const },
  { value: data?.data?.state, source: "job" as const },
  { value: data?.data?.status, source: "job" as const },
  { value: data?.result?.job_status, source: "job" as const },
  { value: data?.result?.jobStatus, source: "job" as const },
  { value: data?.result?.task_status, source: "job" as const },
  { value: data?.result?.taskStatus, source: "job" as const },
  { value: data?.result?.state, source: "job" as const },
  { value: data?.result?.status, source: "job" as const },
  { value: data?.job?.status, source: "job" as const },
  { value: data?.job?.state, source: "job" as const },
  { value: data?.progress?.status, source: "job" as const },
  { value: data?.progress?.state, source: "job" as const },
  { value: data?.job_status, source: "job" as const },
  { value: data?.jobStatus, source: "job" as const },
  { value: data?.task_status, source: "job" as const },
  { value: data?.taskStatus, source: "job" as const },
  { value: data?.state, source: "job" as const },
  { value: data?.status, source: "transport" as const },
];

const mapShortsgenStatus = (
  rawStatus: string,
  source: "job" | "transport",
  progress: number | null,
  hasResults: boolean
) => {
  const normalized = normalizeStatusToken(rawStatus);

  if (
    [
      "QUEUED",
      "QUEUE",
      "PENDING",
      "WAITING",
      "SCHEDULED",
      "CREATED",
      "SUBMITTED",
    ].includes(normalized)
  ) {
    return "SCHEDULED";
  }

  if (
    [
      "IN_PROGRESS",
      "INPROGRESS",
      "PROCESSING",
      "RUNNING",
      "STARTED",
      "STARTING",
      "GENERATING",
      "WORKING",
    ].includes(normalized)
  ) {
    return "IN_PROGRESS";
  }

  if (normalized === "READY_TO_REFRESH") {
    return normalized;
  }

  if (
    [
      "FAILED",
      "FAIL",
      "FAILURE",
      "ERROR",
      "CANCELLED",
      "CANCELED",
      "ABORTED",
      "REJECTED",
      "TIMED_OUT",
      "TIMEOUT",
    ].includes(normalized)
  ) {
    return "FAILED";
  }

  if (
    [
      "COMPLETED",
      "COMPLETE",
      "DONE",
      "FINISHED",
      "READY",
    ].includes(normalized)
  ) {
    return "COMPLETED";
  }

  if (["SUCCEEDED", "SUCCEED", "SUCCESS", "OK", "PASSED", "PASS"].includes(normalized)) {
    if (source === "job" || hasResults || progress === 100) {
      return "COMPLETED";
    }
    return "";
  }

  if (progress === 100 && source === "job") {
    return "COMPLETED";
  }

  return source === "job" ? normalized : "";
};

export const normalizeShortsgenProgress = (data: any) => {
  const rawProgress = pickFirstNumber(
    data?.progress,
    data?.progress_pct,
    data?.progress_percent,
    data?.progressPercentage,
    data?.percentage,
    data?.percent,
    data?.completion,
    data?.completed_percent,
    data?.completedPercent,
    data?.data?.progress,
    data?.data?.progress_pct,
    data?.data?.progress_percent,
    data?.data?.progressPercentage,
    data?.data?.percentage,
    data?.data?.percent,
    data?.data?.completion,
    data?.data?.completed_percent,
    data?.data?.completedPercent,
    data?.result?.progress,
    data?.result?.progress_pct,
    data?.result?.progress_percent,
    data?.result?.progressPercentage,
    data?.result?.percentage,
    data?.result?.percent,
    data?.result?.completion,
    data?.progress?.processPercentage,
    data?.progress?.progress,
    data?.progress?.percentage,
    data?.data?.progress?.processPercentage,
    data?.data?.progress?.progress,
    data?.data?.progress?.percentage
  );

  if (rawProgress !== null) {
    if (rawProgress <= 1) {
      return Math.max(0, Math.min(100, Math.round(rawProgress * 100)));
    }

    return Math.max(0, Math.min(100, Math.round(rawProgress)));
  }

  const taskCollections = [
    data?.progress?.tasks,
    data?.data?.progress?.tasks,
    data?.result?.progress?.tasks,
    data?.tasks,
    data?.data?.tasks,
    data?.result?.tasks,
  ].filter(Array.isArray) as any[][];

  const taskProgress = taskCollections
    .flat()
    .map((task: any) =>
      pickFirstNumber(
        task?.processPercentage,
        task?.progress,
        task?.progress_pct,
        task?.progress_percent,
        task?.percentage,
        task?.percent,
        task?.completion
      )
    )
    .filter((value: number | null): value is number => value !== null);

  if (!taskProgress.length) return null;

  const latestProgress = taskProgress[taskProgress.length - 1];

  if (latestProgress <= 1) {
    return Math.max(0, Math.min(100, Math.round(latestProgress * 100)));
  }

  return Math.max(0, Math.min(100, Math.round(latestProgress)));
};

export const normalizeShortsgenStatus = (data: any) => {
  const progress = normalizeShortsgenProgress(data);
  const hasResults = hasShortsgenResultPayload(data);

  if (hasResults) {
    return "COMPLETED";
  }

  for (const candidate of getShortsgenStatusCandidates(data)) {
    const rawStatus = pickFirstString(candidate.value);
    if (!rawStatus) continue;

    const normalized = mapShortsgenStatus(
      rawStatus,
      candidate.source,
      progress,
      hasResults
    );

    if (normalized) {
      return normalized;
    }
  }

  if (progress === 100) {
    return "COMPLETED";
  }

  return "";
};

const formatSeconds = (totalSeconds: number | null) => {
  if (totalSeconds === null || !Number.isFinite(totalSeconds)) {
    return "Unknown length";
  }

  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;

  if (hours > 0) {
    return [hours, minutes, remainder]
      .map((part) => String(part).padStart(2, "0"))
      .join(":");
  }

  return [minutes, remainder]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
};

const parseTimestampPart = (value: unknown) => {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();

  if (!trimmed) return null;

  const match = trimmed.match(
    /^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:[.,](\d{1,3}))?$/
  );

  if (!match) return null;

  const [, hoursRaw, minutesRaw, secondsRaw] = match;
  const hours = Number(hoursRaw || 0);
  const minutes = Number(minutesRaw || 0);
  const seconds = Number(secondsRaw || 0);

  if (![hours, minutes, seconds].every(Number.isFinite)) {
    return null;
  }

  return {
    label: trimmed.replace(/^00:(\d{2}:\d{2}(?:[.,]\d{1,3})?)$/, "$1"),
    totalSeconds: hours * 3600 + minutes * 60 + seconds,
  };
};

const getTimestampRange = (item: any) => {
  const timestamps = Array.isArray(item?.timestamp)
    ? item.timestamp
    : Array.isArray(item?.timestamps)
    ? item.timestamps
    : null;

  if (!timestamps || timestamps.length < 2) return null;

  const start = parseTimestampPart(timestamps[0]);
  const end = parseTimestampPart(timestamps[1]);

  if (!start || !end || end.totalSeconds < start.totalSeconds) {
    return null;
  }

  return {
    start,
    end,
    label: `[${start.label} - ${end.label}]`,
  };
};

const deriveDuration = (item: any) => {
  const directDuration = pickFirstString(
    item?.duration,
    item?.duration_text,
    item?.duration_label
  );

  if (directDuration) return directDuration;

  const durationSeconds = pickFirstNumber(
    item?.duration_sec,
    item?.duration_seconds,
    item?.durationSecs,
    item?.clip_duration_sec
  );

  if (durationSeconds !== null) {
    return formatSeconds(durationSeconds);
  }

  const startSec = pickFirstNumber(item?.start_sec, item?.start, item?.startSec);
  const endSec = pickFirstNumber(item?.end_sec, item?.end, item?.endSec);

  if (startSec !== null && endSec !== null && endSec >= startSec) {
    return formatSeconds(endSec - startSec);
  }

  const timestampRange = getTimestampRange(item);

  if (timestampRange) {
    return formatSeconds(timestampRange.end.totalSeconds - timestampRange.start.totalSeconds);
  }

  return "Auto clip";
};

const deriveAngle = (item: any) =>
  pickFirstString(
    item?.angle,
    item?.reason,
    item?.hook,
    item?.highlight,
    item?.theme,
    item?.clip_type
  ) ||
  getTimestampRange(item)?.label ||
  "AI-selected highlight";

const deriveDescription = (item: any) =>
  pickFirstString(
    item?.description,
    item?.desc,
    item?.summary,
    item?.caption,
    item?.clip_description,
    item?.clipDescription,
    item?.transcript,
    item?.quote,
    item?.copy,
    item?.text
  );

const deriveQualityScore = (item: any, index: number) => {
  const rawScore = pickFirstNumber(
    item?.quality_score,
    item?.qualityScore,
    item?.overall_score,
    item?.overallScore,
    item?.score,
    item?.confidence,
    item?.rank_score,
    item?.ranking_score
  );

  if (rawScore === null) return Math.max(0, 100 - index * 8);
  if (rawScore <= 1) return Math.round(rawScore * 100);
  return Math.round(rawScore);
};

const deriveQualityLabel = (score: number) => {
  if (score >= 90) return "Best pick";
  if (score >= 78) return "Strong pick";
  if (score >= 65) return "Good option";
  return "Review";
};

const coerceResultsArray = (data: any) => {
  if (Array.isArray(data?.result?.shorts)) return data.result.shorts;
  if (Array.isArray(data?.data?.result?.shorts)) return data.data.result.shorts;
  if (Array.isArray(data?.result?.results)) return data.result.results;
  if (Array.isArray(data?.data?.result?.results)) return data.data.result.results;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data?.results)) return data.data.results;
  if (Array.isArray(data?.clips)) return data.clips;
  if (Array.isArray(data?.data?.clips)) return data.data.clips;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.result?.items)) return data.result.items;
  if (Array.isArray(data?.data?.result?.items)) return data.data.result.items;
  if (Array.isArray(data?.result?.data)) return data.result.data;
  if (Array.isArray(data?.data?.result?.data)) return data.data.result.data;
  if (Array.isArray(data?.output)) return data.output;
  if (Array.isArray(data?.data?.output)) return data.data.output;
  if (Array.isArray(data?.data)) return data.data;

  const directUrl = pickFirstString(
    data?.shorts_url,
    data?.shortsUrl,
    data?.short_url,
    data?.url,
    data?.download_url
  );

  if (directUrl) return [data];

  return [];
};

export const normalizeShortsgenResults = (data: any): NormalizedShortsClip[] => {
  const clips = coerceResultsArray(data)
    .map((item: any, index: number) => {
      if (typeof item === "string") {
        return {
          id: `clip-${index + 1}`,
          title: `Short clip ${index + 1}`,
          description: "",
          duration: "Auto clip",
          angle: "AI-selected highlight",
          downloadUrl: item,
          thumbnailUrl: "",
          qualityLabel: deriveQualityLabel(Math.max(0, 100 - index * 8)),
          qualityScore: Math.max(0, 100 - index * 8),
          rank: index + 1,
        };
      }

      const downloadUrl = pickFirstString(
        item?.shorts_url,
        item?.shortsUrl,
        item?.short_url,
        item?.url,
        item?.download_url,
        item?.downloadUrl,
        item?.video_url,
        item?.videoUrl,
        item?.media?.url,
        item?.video?.url,
        item?.resource?.url,
        item?.file?.url,
        item?.download?.url,
        item?.output_url,
        item?.outputUrl
      );

      if (!downloadUrl) return null;

      const thumbnailUrl = pickFirstString(
        item?.shorts_thb_url,
        item?.shortsThbUrl,
        item?.thumbnail_url,
        item?.thumbnailUrl,
        item?.thumb_url,
        item?.poster_url,
        item?.posterUrl,
        item?.thumbnail?.url,
        item?.thumb?.url,
        item?.image?.url
      );

      const qualityScore = deriveQualityScore(item, index);

      return {
        id:
          pickFirstString(
            item?.id,
            item?.clip_id,
            item?.clipId,
            item?.short_id,
            item?.shortId
          ) || `clip-${index + 1}`,
        title:
          pickFirstString(
            item?.title,
            item?.headline,
            item?.clip_title,
            item?.clipTitle,
            item?.name
          ) || `Short clip ${index + 1}`,
        description: deriveDescription(item),
        duration: deriveDuration(item),
        angle: deriveAngle(item),
        downloadUrl,
        thumbnailUrl,
        qualityLabel: deriveQualityLabel(qualityScore),
        qualityScore,
        rank: index + 1,
      };
    })
    .filter(Boolean) as NormalizedShortsClip[];

  return clips
    .sort((a, b) => {
      if (b.qualityScore !== a.qualityScore) {
        return (b.qualityScore || 0) - (a.qualityScore || 0);
      }
      return a.rank - b.rank;
    })
    .map((clip, index) => ({
      ...clip,
      rank: index + 1,
    }));
};

export const errorResponse = (error: unknown, status = 500) => {
  const message =
    error instanceof Error ? error.message : "Unexpected ShortsGen proxy error.";

  return NextResponse.json({ error: message }, { status });
};
