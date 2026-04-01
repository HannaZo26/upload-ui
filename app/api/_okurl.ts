import { NextResponse } from "next/server";

const OKURL_API_BASE = "https://okurl.io/v1";

export const SHORT_LINK_DOMAIN = "gjw.us";
export const DEFAULT_PATH_PREFIX = "s";

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

export const getOkurlHeaders = () => {
  const apiKey = process.env.OKURL_API_KEY;

  if (!apiKey) {
    throw new Error("OKURL_API_KEY is not configured on the server.");
  }

  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
};

export const okurlPost = async (path: string, payload: Record<string, unknown>) => {
  const response = await fetch(`${OKURL_API_BASE}${path}`, {
    method: "POST",
    headers: getOkurlHeaders(),
    body: JSON.stringify(payload),
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
    ok: response.ok && data?._res !== "err",
    status: response.status,
    data,
  };
};

export const buildShortUrlFromSlug = (
  slug: string,
  domain = SHORT_LINK_DOMAIN,
  pathPrefix = DEFAULT_PATH_PREFIX
) => {
  const safeSlug = slug.trim().replace(/^\/+/, "");
  const safePrefix = pathPrefix.trim().replace(/^\/+|\/+$/g, "");

  if (!safeSlug) return "";
  if (!safePrefix) return `https://${domain}/${safeSlug}`;
  return `https://${domain}/${safePrefix}/${safeSlug}`;
};

export const errorResponse = (error: unknown, status = 500) => {
  const message =
    error instanceof Error ? error.message : "Unexpected OKURL proxy error.";

  return NextResponse.json({ error: message }, { status });
};
