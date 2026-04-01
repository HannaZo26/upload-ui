import { NextResponse } from "next/server";

import {
  buildShortUrlFromSlug,
  DEFAULT_PATH_PREFIX,
  errorResponse,
  okurlPost,
  pickFirstString,
  SHORT_LINK_DOMAIN,
} from "../_okurl";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const domainId = pickFirstString(body?.domain_id);
    const url = pickFirstString(body?.url);
    const projectId = pickFirstString(body?.project_id);
    const slug = pickFirstString(body?.slug);
    const domain = pickFirstString(body?.domain, body?.short_domain, SHORT_LINK_DOMAIN);
    const pathPrefix = pickFirstString(
      body?.path_prefix,
      body?.pathPrefix,
      DEFAULT_PATH_PREFIX
    );

    if (!domainId) {
      return NextResponse.json(
        { error: "Missing required field: domain_id" },
        { status: 400 }
      );
    }

    if (!url) {
      return NextResponse.json(
        { error: "Missing required field: url" },
        { status: 400 }
      );
    }

    const payload: Record<string, string> = {
      domain_id: domainId,
      url,
    };

    if (projectId) payload.project_id = projectId;
    if (slug) payload.slug = slug;

    const result = await okurlPost("/urls/add", payload);

    if (!result.ok) {
      return NextResponse.json(
        {
          error:
            result.data?.msg ||
            result.data?.code ||
            "Failed to create OKURL short link.",
          upstream: result.data,
        },
        { status: result.status || 500 }
      );
    }

    const returnedId = pickFirstString(
      result.data?.id,
      result.data?.data?.id
    );

    let returnedSlug = pickFirstString(
      result.data?.slug,
      result.data?.data?.slug,
      result.data?.short_code,
      result.data?.data?.short_code
    );

    let detailData: any = null;

    let shortUrl = pickFirstString(
      result.data?.okurl,
      result.data?.data?.okurl,
      result.data?.short_url,
      result.data?.shortUrl,
      result.data?.data?.short_url,
      result.data?.data?.shortUrl,
      returnedSlug
        ? buildShortUrlFromSlug(returnedSlug, domain, pathPrefix)
        : ""
    );

    if ((!shortUrl || !returnedSlug) && returnedId) {
      const detailResult = await okurlPost(`/urls/detail/${returnedId}`, {});
      if (detailResult.ok) {
        detailData = detailResult.data;
        returnedSlug =
          pickFirstString(
            detailData?.slug,
            detailData?.data?.slug,
            detailData?.short_code,
            detailData?.data?.short_code
          ) || returnedSlug;

        shortUrl =
          pickFirstString(
            shortUrl,
            detailData?.okurl,
            detailData?.data?.okurl,
            detailData?.short_url,
            detailData?.shortUrl,
            detailData?.data?.short_url,
            detailData?.data?.shortUrl
          ) ||
          (returnedSlug
            ? buildShortUrlFromSlug(returnedSlug, domain, pathPrefix)
            : "");
      }
    }

    return NextResponse.json({
      ...result.data,
      id: returnedId,
      slug: returnedSlug,
      okurl: shortUrl,
      short_url: shortUrl,
      upstream: result.data,
      detail_upstream: detailData,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
