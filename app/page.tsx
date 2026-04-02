"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type DemoUser = {
  password: string;
  folders: string[];
  pages: string[];
};

type CurrentUser = {
  username: string;
};

type UtmBuilderFields = {
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;
  sourcePlatform: string;
};

type UtmTemplateOption = {
  key: string;
  label: string;
  fields: UtmBuilderFields;
};

type OkurlProjectOption = {
  id: number;
  name: string;
  domainId?: string;
  utmTemplateId?: string;
  utmTemplates: UtmTemplateOption[];
};

type OkurlDomainOption = {
  id: string;
  domain: string;
  pathPrefix: string;
};

type ShortsClipOption = {
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

type ShortsGenerationMode = "aiClipping" | "manualSelected";

const SHORT_LINK_DOMAIN = "gjw.us";
const TXT_BOX_COUNT = 5;
const SHORTSGEN_POLL_INTERVAL_MS = 6000;
const SHORTSGEN_MAX_POLL_ATTEMPTS = 40;
const SHORTS_RANGE_PRESETS = [
  { label: "Full video", start: "", end: "" },
  { label: "First 3 min", start: "00:00", end: "03:00" },
  { label: "First 5 min", start: "00:00", end: "05:00" },
  { label: "05:00 - 10:00", start: "05:00", end: "10:00" },
];
const WORKFLOW_STEPS = [
  "Choose page and folder destination",
  "Generate the OKURL short link",
  "Generate and review shorts",
  "Write and prepare the TXT files",
  "Upload the mp4 and matching txt",
  "Review the summary and start automation",
];

const EMPTY_UTM_FIELDS: UtmBuilderFields = {
  source: "",
  medium: "",
  campaign: "",
  term: "",
  content: "",
  sourcePlatform: "",
};

const pickFirstString = (...values: unknown[]) => {
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

const buildCampaignSlug = (projectName: string) => {
  const normalized = projectName
    .replace(/^creators[_\s-]*/i, "")
    .replace(/[_\s-]+(en|zh|cn)$/i, "")
    .replace(/[^a-zA-Z0-9]+/g, "");

  return normalized.toLowerCase();
};

const buildDefaultUtmFields = (projectName: string): UtmBuilderFields => ({
  source: "mkg",
  medium: "video",
  campaign: buildCampaignSlug(projectName),
  term: "news",
  content: "reels",
  sourcePlatform: "fb",
});

const parseUtmQueryString = (value: string): Partial<UtmBuilderFields> => {
  const trimmed = value.trim();
  if (!trimmed) return {};

  let params = new URLSearchParams();

  try {
    if (trimmed.includes("://")) {
      params = new URL(trimmed).searchParams;
    } else {
      const normalized = trimmed.startsWith("?")
        ? trimmed.slice(1)
        : trimmed.includes("?")
        ? trimmed.split("?").slice(1).join("?")
        : trimmed;
      params = new URLSearchParams(normalized);
    }
  } catch {
    const normalized = trimmed.startsWith("?")
      ? trimmed.slice(1)
      : trimmed.includes("?")
      ? trimmed.split("?").slice(1).join("?")
      : trimmed;
    params = new URLSearchParams(normalized);
  }

  return {
    source: pickFirstString(params.get("utm_source")),
    medium: pickFirstString(params.get("utm_medium")),
    campaign: pickFirstString(params.get("utm_campaign")),
    term: pickFirstString(params.get("utm_term")),
    content: pickFirstString(params.get("utm_content")),
    sourcePlatform: pickFirstString(params.get("utm_source_platform")),
  };
};

const normalizeUtmFields = (
  projectName: string,
  partial?: Partial<UtmBuilderFields>
): UtmBuilderFields => {
  const fallback = buildDefaultUtmFields(projectName);

  return {
    source: pickFirstString(partial?.source, fallback.source),
    medium: pickFirstString(partial?.medium, fallback.medium),
    campaign: pickFirstString(partial?.campaign, fallback.campaign),
    term: pickFirstString(partial?.term, fallback.term),
    content: pickFirstString(partial?.content, fallback.content),
    sourcePlatform: pickFirstString(
      partial?.sourcePlatform,
      fallback.sourcePlatform
    ),
  };
};

const readTemplateFieldsFromObject = (
  projectName: string,
  value: Record<string, any>
): UtmBuilderFields => {
  const fromQuery = parseUtmQueryString(
    pickFirstString(
      value?.utm_template,
      value?.utmTemplate,
      value?.template,
      value?.query,
      value?.url
    )
  );

  return normalizeUtmFields(projectName, {
    source: pickFirstString(
      value?.utm_source,
      value?.utmSource,
      value?.source,
      value?.fields?.utm_source,
      value?.fields?.utmSource,
      value?.fields?.source
    ),
    medium: pickFirstString(
      value?.utm_medium,
      value?.utmMedium,
      value?.medium,
      value?.fields?.utm_medium,
      value?.fields?.utmMedium,
      value?.fields?.medium
    ),
    campaign: pickFirstString(
      value?.utm_campaign,
      value?.utmCampaign,
      value?.campaign,
      value?.fields?.utm_campaign,
      value?.fields?.utmCampaign,
      value?.fields?.campaign
    ),
    term: pickFirstString(
      value?.utm_term,
      value?.utmTerm,
      value?.term,
      value?.fields?.utm_term,
      value?.fields?.utmTerm,
      value?.fields?.term
    ),
    content: pickFirstString(
      value?.utm_content,
      value?.utmContent,
      value?.content,
      value?.fields?.utm_content,
      value?.fields?.utmContent,
      value?.fields?.content
    ),
    sourcePlatform: pickFirstString(
      value?.utm_source_platform,
      value?.utmSourcePlatform,
      value?.source_platform,
      value?.sourcePlatform,
      value?.platform,
      value?.fields?.utm_source_platform,
      value?.fields?.utmSourcePlatform,
      value?.fields?.source_platform,
      value?.fields?.sourcePlatform,
      value?.fields?.platform
    ),
    ...fromQuery,
  });
};

const normalizeTemplateOption = (
  projectName: string,
  rawTemplate: any,
  index: number
): UtmTemplateOption => {
  const label =
    pickFirstString(
      rawTemplate?.label,
      rawTemplate?.name,
      rawTemplate?.title,
      rawTemplate?.template_name,
      rawTemplate?.templateName
    ) || `Template ${index + 1}`;

  if (typeof rawTemplate === "string") {
    return {
      key: `${label}-${index}`,
      label,
      fields: normalizeUtmFields(projectName, parseUtmQueryString(rawTemplate)),
    };
  }

  return {
    key: `${label}-${index}`,
    label,
    fields: readTemplateFieldsFromObject(projectName, rawTemplate || {}),
  };
};

const extractUtmTemplates = (
  projectName: string,
  rawProject: any
): UtmTemplateOption[] => {
  const rawTemplates =
    rawProject?.utm_templates ||
    rawProject?.utmTemplates ||
    rawProject?.utm_builder?.templates ||
    rawProject?.utmBuilder?.templates ||
    rawProject?.templates ||
    null;

  if (Array.isArray(rawTemplates) && rawTemplates.length) {
    return rawTemplates.map((template, index) =>
      normalizeTemplateOption(projectName, template, index)
    );
  }

  const directTemplateValue =
    rawProject?.utm_builder ||
    rawProject?.utmBuilder ||
    rawProject?.utm_template ||
    rawProject?.utmTemplate ||
    rawProject?.utm_template_url ||
    rawProject?.utmTemplateUrl ||
    rawProject?.default_template ||
    rawProject?.defaultTemplate ||
    null;

  if (directTemplateValue) {
    return [
      normalizeTemplateOption(projectName, directTemplateValue, 0),
    ];
  }

  return [
    {
      key: "default-0",
      label: "Default Template",
      fields: buildDefaultUtmFields(projectName),
    },
  ];
};

const buildUtmQueryString = (fields: UtmBuilderFields) => {
  const params = new URLSearchParams();

  if (fields.source.trim()) params.set("utm_source", fields.source.trim());
  if (fields.medium.trim()) params.set("utm_medium", fields.medium.trim());
  if (fields.campaign.trim()) params.set("utm_campaign", fields.campaign.trim());
  if (fields.term.trim()) params.set("utm_term", fields.term.trim());
  if (fields.content.trim()) params.set("utm_content", fields.content.trim());
  if (fields.sourcePlatform.trim()) {
    params.set("utm_source_platform", fields.sourcePlatform.trim());
  }

  const query = params.toString();
  return query ? `?${query}` : "";
};

const buildUrlWithUtm = (baseUrl: string, fields: UtmBuilderFields) => {
  const trimmed = baseUrl.trim();
  if (!trimmed) return "";

  const params = new URLSearchParams();

  if (fields.source.trim()) params.set("utm_source", fields.source.trim());
  if (fields.medium.trim()) params.set("utm_medium", fields.medium.trim());
  if (fields.campaign.trim()) params.set("utm_campaign", fields.campaign.trim());
  if (fields.term.trim()) params.set("utm_term", fields.term.trim());
  if (fields.content.trim()) params.set("utm_content", fields.content.trim());
  if (fields.sourcePlatform.trim()) {
    params.set("utm_source_platform", fields.sourcePlatform.trim());
  }

  if (!params.toString()) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    params.forEach((value, key) => {
      url.searchParams.set(key, value);
    });
    return url.toString();
  } catch {
    return `${trimmed}${trimmed.includes("?") ? "&" : "?"}${params.toString()}`;
  }
};

const normalizeShortUrlToDomain = (value: string, domain: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed);
    parsed.protocol = "https:";
    parsed.host = domain;
    return parsed.toString();
  } catch {
    const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return `https://${domain}${normalizedPath}`;
  }
};

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const readResponseData = async (response: Response) => {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text };
  }
};

const buildSequentialFileName = (index: number, extension: "mp4" | "txt") => {
  return `video${index + 1}.${extension}`;
};

const parseTimecodeToSeconds = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  const parts = trimmed.split(":").map((part) => part.trim());

  if (
    !parts.length ||
    parts.length > 3 ||
    parts.some((part) => !/^\d+$/.test(part))
  ) {
    return null;
  }

  const numericParts = parts.map((part) => Number(part));

  if (numericParts.some((part) => !Number.isFinite(part))) {
    return null;
  }

  if (numericParts.length === 3) {
    const [hours, minutes, seconds] = numericParts;
    return hours * 3600 + minutes * 60 + seconds;
  }

  if (numericParts.length === 2) {
    const [minutes, seconds] = numericParts;
    return minutes * 60 + seconds;
  }

  return numericParts[0] ?? null;
};

const formatSecondsAsTimecode = (totalSeconds: number) => {
  const seconds = Math.max(0, Math.floor(totalSeconds));
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

const replaceGeneratedFiles = (
  existingFiles: File[],
  incomingFiles: File[],
  matcher: RegExp
) => {
  const preserved = existingFiles.filter((file) => !matcher.test(file.name));
  return [...preserved, ...incomingFiles];
};

const demoUsers: Record<string, DemoUser> = {
  haiyennt: {
    password: "Hge&geTEg@ge123",
    folders: [
      "tastefulworldzh",
      "feelgoodbeautyzh",
      "worldtravelerszh",
      "culturalwander",
      "gjwmysteries",
      "healthyliving",
      "tastefulworld",
      "feelgoodbeauty",
      "worldtravelers",
      "exclusivevisiondaily",
      "freshpickstoday",
      "dailytalktime",
      "beyondheadlinesdaily",
    ],
    pages: [
      "tastefulworldzh",
      "feelgoodbeautyzh",
      "worldtravelerszh",
      "culturalwander",
      "gjwmysteries",
      "healthyliving",
      "tastefulworld",
      "feelgoodbeauty",
      "worldtravelers",
      "exclusivevisiondaily",
      "freshpickstoday",
      "dailytalktime",
      "beyondheadlinesdaily",
    ],
  },

  hannah: {
    password: "UhgTRg@kg$253",
    folders: [
      "tastefulworldzh",
      "feelgoodbeautyzh",
      "worldtravelerszh",
      "culturalwander",
      "gjwmysteries",
      "healthyliving",
      "tastefulworld",
      "feelgoodbeauty",
      "worldtravelers",
      "exclusivevisiondaily",
      "freshpickstoday",
      "dailytalktime",
      "beyondheadlinesdaily",
      "clearviewdaily",
      "viewscopedaily",
      "dailytrendpulse",
      "horizonupdatesshow",
      "flashbrieftoday",
      "everydayvitalityzh",
      "healthyrhythmdaily",
      "renaradar",
      "renaradarzh",
      "lukeinsights",
      "heresthequestion",
    ],
    pages: [
      "tastefulworldzh",
      "feelgoodbeautyzh",
      "worldtravelerszh",
      "culturalwander",
      "gjwmysteries",
      "healthyliving",
      "tastefulworld",
      "feelgoodbeauty",
      "worldtravelers",
      "exclusivevisiondaily",
      "freshpickstoday",
      "dailytalktime",
      "beyondheadlinesdaily",
      "clearviewdaily",
      "viewscopedaily",
      "dailytrendpulse",
      "horizonupdatesshow",
      "flashbrieftoday",
      "everydayvitalityzh",
      "healthyrhythmdaily",
      "renaradar",
      "renaradarzh",
      "lukeinsights",
      "heresthequestion",
    ],
  },

  karen: {
    password: "jgGTR#kg$93",
    folders: [
      "tastefulworldzh",
      "feelgoodbeautyzh",
      "worldtravelerszh",
      "culturalwander",
      "gjwmysteries",
      "healthyliving",
      "tastefulworld",
      "feelgoodbeauty",
      "worldtravelers",
      "exclusivevisiondaily",
      "freshpickstoday",
      "dailytalktime",
      "beyondheadlinesdaily",
      "clearviewdaily",
      "viewscopedaily",
      "dailytrendpulse",
      "horizonupdatesshow",
      "flashbrieftoday",
      "everydayvitalityzh",
      "healthyrhythmdaily",
      "renaradar",
      "renaradarzh",
      "lukeinsights",
      "heresthequestion",
    ],
    pages: [
      "tastefulworldzh",
      "feelgoodbeautyzh",
      "worldtravelerszh",
      "culturalwander",
      "gjwmysteries",
      "healthyliving",
      "tastefulworld",
      "feelgoodbeauty",
      "worldtravelers",
      "exclusivevisiondaily",
      "freshpickstoday",
      "dailytalktime",
      "beyondheadlinesdaily",
      "clearviewdaily",
      "viewscopedaily",
      "dailytrendpulse",
      "horizonupdatesshow",
      "flashbrieftoday",
      "everydayvitalityzh",
      "healthyrhythmdaily",
      "renaradar",
      "renaradarzh",
      "lukeinsights",
      "heresthequestion",
    ],
  },

  joanne: {
    password: "TygMcK@kf$13",
    folders: [
      "tastefulworldzh",
      "feelgoodbeautyzh",
      "worldtravelerszh",
      "culturalwander",
      "gjwmysteries",
      "healthyliving",
      "tastefulworld",
      "feelgoodbeauty",
      "worldtravelers",
      "exclusivevisiondaily",
      "freshpickstoday",
      "dailytalktime",
      "beyondheadlinesdaily",
      "clearviewdaily",
      "viewscopedaily",
      "dailytrendpulse",
      "horizonupdatesshow",
      "flashbrieftoday",
      "everydayvitalityzh",
      "healthyrhythmdaily",
      "renaradar",
      "renaradarzh",
      "lukeinsights",
      "heresthequestion",
    ],
    pages: [
      "tastefulworldzh",
      "feelgoodbeautyzh",
      "worldtravelerszh",
      "culturalwander",
      "gjwmysteries",
      "healthyliving",
      "tastefulworld",
      "feelgoodbeauty",
      "worldtravelers",
      "exclusivevisiondaily",
      "freshpickstoday",
      "dailytalktime",
      "beyondheadlinesdaily",
      "clearviewdaily",
      "viewscopedaily",
      "dailytrendpulse",
      "horizonupdatesshow",
      "flashbrieftoday",
      "everydayvitalityzh",
      "healthyrhythmdaily",
      "renaradar",
      "renaradarzh",
      "lukeinsights",
      "heresthequestion",
    ],
  },

  ying: {
    password: "HGtYEG$eff@323",
    folders: ["clearviewdaily", "viewscopedaily", "dailytrendpulse"],
    pages: ["clearviewdaily", "viewscopedaily", "dailytrendpulse"],
  },

  ivyzhang: {
    password: "ygeTTge$eff@#24",
    folders: ["everydayvitalityzh", "healthyrhythmdaily"],
    pages: ["everydayvitalityzh", "healthyrhythmdaily"],
  },

  lucywang: {
    password: "GhyTge#rge@87",
    folders: ["horizonupdatesshow", "flashbrieftoday"],
    pages: ["horizonupdatesshow", "flashbrieftoday"],
  },

  demo: {
    password: "123",
    folders: [
      "clearviewdaily",
      "viewscopedaily",
      "dailytrendpulse",
      "flashbrieftoday",
    ],
    pages: [
      "clearviewdaily",
      "viewscopedaily",
      "dailytrendpulse",
      "flashbrieftoday",
    ],
  },
};

export default function Page() {
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authError, setAuthError] = useState("");

  const n8nWebhookUrl =
    "https://n8n.influencerconnectagency.biz/webhook/upload-entry";

  const [folderName, setFolderName] = useState("clearviewdaily");
  const [pageName, setPageName] = useState("clearviewdaily");

  const [txtDescriptions, setTxtDescriptions] = useState<string[]>(
    Array.from({ length: TXT_BOX_COUNT }, () => "")
  );

  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [longUrl, setLongUrl] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [creatingShortUrl, setCreatingShortUrl] = useState(false);
  const [shortUrlError, setShortUrlError] = useState("");
  const [shortUrlSuccess, setShortUrlSuccess] = useState("");
  const [shortsSourceUrl, setShortsSourceUrl] = useState("");
  const [shortsMode, setShortsMode] =
    useState<ShortsGenerationMode>("aiClipping");
  const [shortsRangeStart, setShortsRangeStart] = useState("");
  const [shortsRangeEnd, setShortsRangeEnd] = useState("");
  const [shortsClips, setShortsClips] = useState<ShortsClipOption[]>([]);
  const [selectedShortIds, setSelectedShortIds] = useState<string[]>([]);
  const [generatingShorts, setGeneratingShorts] = useState(false);
  const [addingShortsToUploads, setAddingShortsToUploads] = useState(false);
  const [addingTxtsToUploads, setAddingTxtsToUploads] = useState(false);
  const [shortsSuccess, setShortsSuccess] = useState("");
  const [shortsError, setShortsError] = useState("");
  const [shortsJobId, setShortsJobId] = useState("");
  const [shortsJobStatus, setShortsJobStatus] = useState("");

  const [okurlProjects, setOkurlProjects] = useState<OkurlProjectOption[]>([]);
  const [okurlDomains, setOkurlDomains] = useState<OkurlDomainOption[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedUtmTemplateKey, setSelectedUtmTemplateKey] = useState("");
  const [utmFields, setUtmFields] = useState<UtmBuilderFields>(EMPTY_UTM_FIELDS);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const availableFolders = useMemo(() => {
    if (!currentUser) return [];
    return demoUsers[currentUser.username]?.folders ?? [];
  }, [currentUser]);

  const availablePages = useMemo(() => {
    if (!currentUser) return [];
    return demoUsers[currentUser.username]?.pages ?? [];
  }, [currentUser]);

  const totalSizeMb = useMemo(() => {
    const total = files.reduce((sum, file) => sum + file.size, 0);
    return (total / 1024 / 1024).toFixed(2);
  }, [files]);

  const selectedProject = useMemo(() => {
    return (
      okurlProjects.find((item) => String(item.id) === selectedProjectId) ?? null
    );
  }, [okurlProjects, selectedProjectId]);

  const selectedDomain = useMemo(() => {
    return (
      okurlDomains.find(
        (item) => item.domain.trim().toLowerCase() === SHORT_LINK_DOMAIN
      ) ?? null
    );
  }, [okurlDomains]);

  const selectedProjectTemplates = useMemo(() => {
    return selectedProject?.utmTemplates ?? [];
  }, [selectedProject]);

  const selectedUtmTemplate = useMemo(() => {
    return (
      selectedProjectTemplates.find(
        (item) => item.key === selectedUtmTemplateKey
      ) ?? null
    );
  }, [selectedProjectTemplates, selectedUtmTemplateKey]);

  const utmTemplate = useMemo(() => {
    return buildUtmQueryString(utmFields);
  }, [utmFields]);

  const longUrlWithUtm = useMemo(() => {
    return buildUrlWithUtm(longUrl, utmFields);
  }, [longUrl, utmFields]);

  const combinedTxtNotes = useMemo(() => {
    return txtDescriptions
      .map((value, index) => {
        const trimmed = value.trim();
        if (!trimmed) return "";
        return `video${index + 1}\n${trimmed}`;
      })
      .filter(Boolean)
      .join("\n\n");
  }, [txtDescriptions]);

  const shortsRangeSummary = useMemo(() => {
    const startSec = parseTimecodeToSeconds(shortsRangeStart);
    const endSec = parseTimecodeToSeconds(shortsRangeEnd);

    if (startSec === null && endSec === null) {
      return "Full video";
    }

    if (startSec !== null && endSec !== null && endSec > startSec) {
      return `${formatSecondsAsTimecode(startSec)} - ${formatSecondsAsTimecode(endSec)}`;
    }

    return "Custom range";
  }, [shortsRangeStart, shortsRangeEnd]);

  useEffect(() => {
    const loadDomains = async () => {
      try {
        const res = await fetch("/api/okurl-domains", {
          cache: "no-store",
        });

        const data = await res.json();

        const rawDomains = Array.isArray(data?.domains)
          ? data.domains
          : Array.isArray(data?.data?.domains)
          ? data.data.domains
          : Array.isArray(data?.data)
          ? data.data
          : [];

        const normalized: OkurlDomainOption[] = rawDomains
          .map((item: any) => ({
            id: pickFirstString(item?.id),
            domain: pickFirstString(
              item?.domain,
              item?.name,
              item?.host,
              item?.new_domain
            ),
            pathPrefix: pickFirstString(item?.path_prefix, item?.pathPrefix, "s"),
          }))
          .filter((item) => item.id && item.domain);

        setOkurlDomains(normalized);
      } catch (err) {
        console.error("Failed to load OKURL domains", err);
      }
    };

    loadDomains();
  }, []);

  useEffect(() => {
    if (!selectedDomain?.id) return;

    const loadProjects = async () => {
      try {
        setProjectsLoading(true);
        const domainQuery = selectedDomain?.id
          ? `?domain_id=${encodeURIComponent(selectedDomain.id)}`
          : "";
        const res = await fetch(`/api/okurl-projects${domainQuery}`, {
          cache: "no-store",
        });
        const data = await res.json();
        let templateData: any = null;

        try {
          const templateQuery = selectedDomain?.id
            ? `?domain_id=${encodeURIComponent(selectedDomain.id)}`
            : "";
          const templateRes = await fetch(
            `/api/okurl-utm-templates${templateQuery}`,
            {
              cache: "no-store",
            }
          );

          if (templateRes.ok) {
            templateData = await templateRes.json();
          }
        } catch (templateErr) {
          console.warn("Failed to load OKURL UTM templates", templateErr);
        }

        const rawProjects = Array.isArray(data?.projects)
          ? data.projects
          : Array.isArray(data?.data?.projects)
          ? data.data.projects
          : Array.isArray(data?.data)
          ? data.data
          : [];

        const embeddedTemplates = Array.isArray(data?.templates)
          ? data.templates
          : Array.isArray(data?.data?.templates)
          ? data.data.templates
          : [];

        const fetchedTemplates = Array.isArray(templateData?.templates)
          ? templateData.templates
          : Array.isArray(templateData?.data?.templates)
          ? templateData.data.templates
          : Array.isArray(templateData?.data)
          ? templateData.data
          : [];

        const rawTemplateById = new Map<string, any>();

        [...embeddedTemplates, ...fetchedTemplates].forEach((item: any) => {
          const templateId = pickFirstString(item?.id);
          if (templateId) {
            rawTemplateById.set(templateId, item);
          }
        });

        const normalized: OkurlProjectOption[] = rawProjects
          .map((item: any) => {
            const projectName = String(item?.name || "").trim();
            const utmTemplateId = pickFirstString(
              item?.utm_tpl_id,
              item?.utmTemplateId,
              item?.utm_template_id
            );
            const linkedTemplate =
              (utmTemplateId && rawTemplateById.get(utmTemplateId)) || null;

            return {
              id: Number(item?.id),
              name: projectName,
              domainId: pickFirstString(
                item?.domain_id,
                item?.domainId,
                item?.domain?.id
              ),
              utmTemplateId,
              utmTemplates: linkedTemplate
                ? [normalizeTemplateOption(projectName, linkedTemplate, 0)]
                : extractUtmTemplates(projectName, item),
            };
          })
          .filter((item) => item.id && item.name)
          .sort((a, b) => a.name.localeCompare(b.name));

        setOkurlProjects(normalized);
      } catch (err) {
        console.error("Failed to load OKURL projects", err);
      } finally {
        setProjectsLoading(false);
      }
    };

    loadProjects();
  }, [selectedDomain?.id]);

  useEffect(() => {
    if (!pageName || !okurlProjects.length) return;

    const matched =
      okurlProjects.find(
        (item) => item.name.trim().toLowerCase() === pageName.trim().toLowerCase()
      ) ?? null;

    if (matched) {
      setSelectedProjectId(String(matched.id));
    }
  }, [pageName, okurlProjects]);

  useEffect(() => {
    if (!selectedProject) {
      setSelectedUtmTemplateKey("");
      setUtmFields(EMPTY_UTM_FIELDS);
      return;
    }

    const firstTemplate =
      selectedProject.utmTemplates[0] ?? {
        key: "default-0",
        label: "Default Template",
        fields: buildDefaultUtmFields(selectedProject.name),
      };

    setSelectedUtmTemplateKey(firstTemplate.key);
    setUtmFields(firstTemplate.fields);
  }, [selectedProject]);

  const resetUploadForm = () => {
    setFiles([]);
    setTxtDescriptions(Array.from({ length: TXT_BOX_COUNT }, () => ""));
    setLongUrl("");
    setShortUrl("");
    setCustomSlug("");
    setShortUrlError("");
    setShortUrlSuccess("");
    setShortsSourceUrl("");
    setShortsMode("aiClipping");
    setShortsRangeStart("");
    setShortsRangeEnd("");
    setShortsClips([]);
    setSelectedShortIds([]);
    setShortsSuccess("");
    setShortsError("");
    setShortsJobId("");
    setShortsJobStatus("");
    setAddingShortsToUploads(false);
    setAddingTxtsToUploads(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setSuccess("");
    setError("");

    const username = loginUsername.trim().toLowerCase();
    const user = demoUsers[username];

    if (!user || user.password !== loginPassword) {
      setAuthError("Invalid username or password.");
      return;
    }

    const firstPage = user.pages[0] ?? "";
    const firstFolder =
      user.folders.find(
        (folder) => folder.trim().toLowerCase() === firstPage.trim().toLowerCase()
      ) ??
      user.folders[0] ??
      firstPage;

    setCurrentUser({ username });
    setFolderName(firstFolder);
    setPageName(firstPage);
    setLoginPassword("");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLoginUsername("");
    setLoginPassword("");
    setFiles([]);
    setSuccess("");
    setError("");
    setAuthError("");
    setLongUrl("");
    setShortUrl("");
    setCustomSlug("");
    setTxtDescriptions(Array.from({ length: TXT_BOX_COUNT }, () => ""));
    setShortUrlError("");
    setShortUrlSuccess("");
    setSelectedProjectId("");
    setSelectedUtmTemplateKey("");
    setUtmFields(EMPTY_UTM_FIELDS);
    setShortsSourceUrl("");
    setShortsMode("aiClipping");
    setShortsRangeStart("");
    setShortsRangeEnd("");
    setShortsClips([]);
    setSelectedShortIds([]);
    setShortsSuccess("");
    setShortsError("");
    setShortsJobId("");
    setShortsJobStatus("");
    setAddingShortsToUploads(false);
    setAddingTxtsToUploads(false);
  };

  const addFiles = (incoming: FileList | File[]) => {
    const list = Array.from(incoming);
    setFiles((prev) => {
      const merged = [...prev];
      for (const file of list) {
        const exists = merged.some(
          (f) =>
            f.name === file.name &&
            f.size === file.size &&
            f.lastModified === file.lastModified
        );
        if (!exists) merged.push(file);
      }
      return merged;
    });
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePageChange = (value: string) => {
    setPageName(value);
    const linkedFolder =
      availableFolders.find(
        (folder) => folder.trim().toLowerCase() === value.trim().toLowerCase()
      ) ?? value;
    setFolderName(linkedFolder);
  };

  const handleUtmTemplateChange = (templateKey: string) => {
    setSelectedUtmTemplateKey(templateKey);

    const matchedTemplate =
      selectedProjectTemplates.find((item) => item.key === templateKey) ?? null;

    if (matchedTemplate) {
      setUtmFields(matchedTemplate.fields);
    }
  };

  const updateUtmField = (key: keyof UtmBuilderFields, value: string) => {
    setUtmFields((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const applyShortsRangePreset = (start: string, end: string) => {
    if (!start && !end && shortsMode === "manualSelected") {
      setShortsMode("aiClipping");
    }
    setShortsRangeStart(start);
    setShortsRangeEnd(end);
  };

  const generateShorts = async () => {
    setShortsError("");
    setShortsSuccess("");

    if (!shortsSourceUrl.trim()) {
      setShortsError("Please enter the long-video URL first.");
      return;
    }

    const startSec = parseTimecodeToSeconds(shortsRangeStart);
    const endSec = parseTimecodeToSeconds(shortsRangeEnd);
    const hasRangeInput =
      Boolean(shortsRangeStart.trim()) || Boolean(shortsRangeEnd.trim());

    if (hasRangeInput && (startSec === null || endSec === null)) {
      setShortsError("Please enter a valid start and end time like 00:00 or 05:30.");
      return;
    }

    if (startSec !== null && endSec !== null && endSec <= startSec) {
      setShortsError("The end time must be later than the start time.");
      return;
    }

    if (shortsMode === "manualSelected" && !hasRangeInput) {
      setShortsError("Manual Selection needs a start and end time range.");
      return;
    }

    const shortsOptions =
      shortsMode === "manualSelected"
        ? {
            mode: "manualSelected",
            user_selected: {
              time_ranges: [
                {
                  start_sec: startSec,
                  end_sec: endSec,
                },
              ],
            },
          }
        : hasRangeInput
        ? {
            mode: "aiClipping",
            user_selected: {
              full_length: false,
              time_ranges: [
                {
                  start_sec: startSec,
                  end_sec: endSec,
                },
              ],
            },
          }
        : {
            mode: "aiClipping",
            user_selected: {
              full_length: true,
            },
          };

    try {
      setGeneratingShorts(true);
      setShortsClips([]);
      setSelectedShortIds([]);
      setShortsJobId("");
      setShortsJobStatus("");

      const createRes = await fetch("/api/shortsgen/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_url: shortsSourceUrl.trim(),
          options: shortsOptions,
        }),
      });

      const createData = await readResponseData(createRes);

      if (!createRes.ok) {
        throw new Error(
          createData?.error ||
            createData?.message ||
            "Failed to submit the ShortsGen job."
        );
      }

      const jobId = pickFirstString(createData?.id, createData?.job_id);

      if (!jobId) {
        throw new Error("ShortsGen did not return a job ID.");
      }

      setShortsJobId(jobId);
      setShortsJobStatus("SCHEDULED");
      setShortsSuccess(
        `Shorts job created for ${shortsRangeSummary.toLowerCase()}. Generating clips now...`
      );

      let finalStatus = "";

      for (let attempt = 0; attempt < SHORTSGEN_MAX_POLL_ATTEMPTS; attempt += 1) {
        const statusRes = await fetch(`/api/shortsgen/jobs/${encodeURIComponent(jobId)}`, {
          cache: "no-store",
        });
        const statusData = await readResponseData(statusRes);

        if (!statusRes.ok) {
          throw new Error(
            statusData?.error ||
              statusData?.message ||
              "Failed to check ShortsGen job status."
          );
        }

        finalStatus = pickFirstString(statusData?.status).toUpperCase();
        setShortsJobStatus(finalStatus);

        if (finalStatus === "COMPLETED") {
          break;
        }

        if (finalStatus === "FAILED") {
          throw new Error(
            statusData?.error ||
              statusData?.message ||
              statusData?.upstream?.message ||
              "Shorts generation failed."
          );
        }

        setShortsSuccess(
          `Generating shorts... ${finalStatus || "IN_PROGRESS"}. This usually takes a few minutes.`
        );

        await sleep(SHORTSGEN_POLL_INTERVAL_MS);
      }

      if (finalStatus !== "COMPLETED") {
        throw new Error(
          "Shorts generation is still in progress. Please wait a little longer and try again."
        );
      }

      const resultsRes = await fetch(
        `/api/shortsgen/jobs/${encodeURIComponent(jobId)}/results`,
        {
          cache: "no-store",
        }
      );
      const resultsData = await readResponseData(resultsRes);

      if (!resultsRes.ok) {
        throw new Error(
          resultsData?.error ||
            resultsData?.message ||
            "Failed to load the generated shorts."
        );
      }

      const clips = Array.isArray(resultsData?.clips) ? resultsData.clips : [];

      if (!clips.length) {
        throw new Error("ShortsGen completed, but no clips were returned.");
      }

      setShortsClips(clips);
      setSelectedShortIds(clips.slice(0, Math.min(3, clips.length)).map((clip) => clip.id));
      setShortsSuccess(
        `${clips.length} short(s) are ready. The strongest clips are pre-selected so you can download them or add them to the upload list.`
      );
    } catch (err: any) {
      setShortsError(err?.message || "Failed to prepare the shorts preview.");
    } finally {
      setGeneratingShorts(false);
    }
  };

  const toggleShortSelection = (clipId: string) => {
    setSelectedShortIds((prev) =>
      prev.includes(clipId)
        ? prev.filter((id) => id !== clipId)
        : [...prev, clipId]
    );
  };

  const copyClipText = async (value: string, label: string) => {
    const trimmed = value.trim();

    if (!trimmed) {
      setShortsError(`No ${label.toLowerCase()} is available to copy.`);
      return;
    }

    try {
      await navigator.clipboard.writeText(trimmed);
      setShortsError("");
      setShortsSuccess(`${label} copied. You can paste it into a TXT Description box.`);
    } catch {
      setShortsError(`Failed to copy ${label.toLowerCase()}.`);
    }
  };

  const downloadSelectedShorts = () => {
    setShortsError("");
    setShortsSuccess("");

    if (!selectedShortIds.length) {
      setShortsError("Please select at least one short clip first.");
      return;
    }

    const selectedClips = shortsClips.filter((clip) => selectedShortIds.includes(clip.id));

    selectedClips.forEach((clip, index) => {
      const anchor = document.createElement("a");
      anchor.href = clip.downloadUrl;
      anchor.download = buildSequentialFileName(index, "mp4");
      anchor.target = "_blank";
      anchor.rel = "noreferrer";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    });

    setShortsSuccess(`${selectedClips.length} short(s) download started.`);
  };

  const addSelectedShortsToUploadList = async () => {
    setShortsError("");
    setShortsSuccess("");

    if (!selectedShortIds.length) {
      setShortsError("Please select at least one short clip first.");
      return;
    }

    try {
      setAddingShortsToUploads(true);

      const selectedClips = shortsClips.filter((clip) => selectedShortIds.includes(clip.id));

      const fetchedFiles = await Promise.all(
        selectedClips.map(async (clip, index) => {
          const res = await fetch("/api/shortsgen/download", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: clip.downloadUrl,
            }),
          });

          if (!res.ok) {
            const data = await readResponseData(res);
            throw new Error(
              data?.error ||
                data?.message ||
                `Failed to prepare ${clip.title} for upload.`
            );
          }

          const blob = await res.blob();
          const fileName = buildSequentialFileName(index, "mp4");

          return new File([blob], fileName, {
            type: blob.type || "video/mp4",
            lastModified: Date.now(),
          });
        })
      );

      setFiles((prev) =>
        replaceGeneratedFiles(prev, fetchedFiles, /^video\d+\.mp4$/i)
      );

      setShortsSuccess(
        `${fetchedFiles.length} short(s) added to the upload list below.`
      );
    } catch (err: any) {
      setShortsError(err?.message || "Failed to add selected shorts to the upload list.");
    } finally {
      setAddingShortsToUploads(false);
    }
  };

  const addGeneratedTxtsToUploadList = () => {
    setError("");
    setSuccess("");

    const populatedEntries = txtDescriptions
      .map((value, index) => ({
        fileName: buildSequentialFileName(index, "txt"),
        content: value.trim(),
      }))
      .filter((item) => item.content);

    if (!populatedEntries.length) {
      setError("Please enter TXT content first.");
      return;
    }

    try {
      setAddingTxtsToUploads(true);

      const generatedTxtFiles = populatedEntries.map(
        (entry) =>
          new File(["\uFEFF" + entry.content], entry.fileName, {
            type: "text/plain;charset=utf-8",
            lastModified: Date.now(),
          })
      );

      setFiles((prev) =>
        replaceGeneratedFiles(prev, generatedTxtFiles, /^video\d+\.txt$/i)
      );

      setSuccess(
        `${generatedTxtFiles.length} generated TXT file(s) added to the upload list below.`
      );
    } finally {
      setAddingTxtsToUploads(false);
    }
  };

  const updateTxtDescription = (index: number, value: string) => {
    setTxtDescriptions((prev) =>
      prev.map((item, itemIndex) => (itemIndex === index ? value : item))
    );
  };

  const downloadTxt = () => {
    const populatedEntries = txtDescriptions
      .map((value, index) => ({
        fileName: `video${index + 1}.txt`,
        content: value.trim(),
      }))
      .filter((item) => item.content);

    if (!populatedEntries.length) {
      setError("Please enter TXT content before downloading.");
      setSuccess("");
      return;
    }

    populatedEntries.forEach((entry) => {
      const blob = new Blob(["\uFEFF" + entry.content], {
        type: "text/plain;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = entry.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });

    setSuccess(
      `${populatedEntries.length} UTF-8 TXT file(s) downloaded successfully.`
    );
    setError("");
  };

  const generateShortUrl = async () => {
    setShortUrlError("");
    setShortUrlSuccess("");

    if (!longUrl.trim()) {
      setShortUrlError("Please enter the original URL first.");
      return;
    }

    if (!selectedProjectId) {
      setShortUrlError("Please choose a valid OKURL project.");
      return;
    }

    if (!selectedDomain?.id) {
      setShortUrlError("OKURL domain gjw.us was not found.");
      return;
    }

    try {
      setCreatingShortUrl(true);

      const urlForShortLink = longUrlWithUtm || longUrl.trim();

      const res = await fetch("/api/okurl-create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: urlForShortLink,
          project_id: Number(selectedProjectId),
          domain_id: selectedDomain.id,
          path_prefix: selectedDomain.pathPrefix || "s",
          slug: customSlug.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || data?.message || "Failed to generate short URL.");
      }

      const returnedSlug =
        data?.slug ||
        data?.data?.slug ||
        data?.short_code ||
        data?.data?.short_code ||
        "";

      const generatedShortUrl =
        data?.okurl ||
        data?.data?.okurl ||
        data?.short_url ||
        data?.shortUrl ||
        data?.data?.short_url ||
        data?.data?.shortUrl ||
        data?.data?.short ||
        (returnedSlug
          ? `https://${SHORT_LINK_DOMAIN}/${selectedDomain.pathPrefix || "s"}/${returnedSlug}`
          : "") ||
        "";

      if (!generatedShortUrl) {
        throw new Error(
          data?.error ||
            data?.upstream?.msg ||
            data?.upstream?.code ||
            "Short URL was not returned."
        );
      }

      setShortUrl(normalizeShortUrlToDomain(generatedShortUrl, SHORT_LINK_DOMAIN));
      setShortUrlSuccess("Short URL generated successfully with gjw.us.");
    } catch (err: any) {
      setShortUrlError(err?.message || "Failed to generate short URL.");
    } finally {
      setCreatingShortUrl(false);
    }
  };

  const copyShortUrl = async () => {
    if (!shortUrl.trim()) {
      setShortUrlError("No short URL to copy.");
      return;
    }

    try {
      await navigator.clipboard.writeText(shortUrl);
      setShortUrlSuccess("Short URL copied.");
      setShortUrlError("");
    } catch {
      setShortUrlError("Copy failed.");
    }
  };

  const submitToN8n = async () => {
    setSuccess("");
    setError("");

    if (!currentUser) {
      setError("Please sign in first.");
      return;
    }

    if (!pageName || !folderName) {
      setError("Please choose a page and folder.");
      return;
    }

    if (!files.length) {
      setError("Please upload at least one file.");
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append("username", currentUser.username);
      formData.append("page_name", pageName);
      formData.append("folder_name", folderName);
      formData.append("title", "");
      formData.append("target_url", longUrlWithUtm || longUrl);
      formData.append("notes", combinedTxtNotes);
      formData.append("short_url", shortUrl);
      formData.append("okurl_slug", customSlug);
      formData.append("okurl_domain", SHORT_LINK_DOMAIN);
      formData.append("domain_id", selectedDomain?.id || "");
      formData.append("utm_template", utmTemplate);
      formData.append("utm_source", utmFields.source);
      formData.append("utm_medium", utmFields.medium);
      formData.append("utm_campaign", utmFields.campaign);
      formData.append("utm_term", utmFields.term);
      formData.append("utm_content", utmFields.content);
      formData.append("utm_source_platform", utmFields.sourcePlatform);

      files.forEach((file, idx) => {
        formData.append("file_" + String(idx + 1), file, file.name);
      });

      const res = await fetch(n8nWebhookUrl, {
        method: "POST",
        body: formData,
      });

      const text = await res.text();
      let data: any = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { raw: text };
      }

      if (!res.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Upload failed (" + String(res.status) + ")"
        );
      }

      resetUploadForm();
      setSuccess(
        data?.message || "Automation started successfully. Form has been cleared."
      );
      setError("");
    } catch (err: any) {
      setError(err?.message || "Failed to start automation.");
      setSuccess("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main style={styles.page}>
      <div style={styles.shell}>
        <aside style={styles.sidebar}>
          <div>
            <div style={styles.logoBox}>
              <div style={styles.logoMark}>
                <img src="/icon.svg" alt="Ucreator Console" style={styles.logoIcon} />
              </div>
              <div>
                <div style={styles.logoTitle}>Ucreator Console</div>
              </div>
            </div>

            {currentUser ? (
              <div style={styles.sidebarInfoCard}>
                <div style={styles.sidebarInfoTitle}>Account</div>
                <div style={styles.sidebarInfoName}>{currentUser.username}</div>
                <div style={styles.sidebarInfoMeta}>Signed in and ready to upload</div>
                <button
                  style={{ ...styles.secondaryButton, width: "100%", marginTop: 12 }}
                  onClick={handleLogout}
                >
                  Log out
                </button>
              </div>
            ) : null}
          </div>

          <div style={styles.navCard}>
            <div style={styles.navSectionTitle}>Steps</div>
            <div style={styles.stepsStack}>
              {WORKFLOW_STEPS.map((step, index) => (
                <div key={step} style={styles.stepCard}>
                  <div style={styles.stepBadge}>{index + 1}</div>
                  <div style={styles.stepText}>{step}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <div style={styles.mainArea}>
          <div style={styles.topbar}>
            <div>
              <div style={styles.badge}>Admin Workspace</div>
              <h1 style={styles.title}>Content Upload Dashboard</h1>
            </div>
          </div>

          {!currentUser ? (
            <section style={styles.loginWrap}>
              <div style={styles.panel}>
                <div style={styles.panelTitle}>Sign in</div>
                <div style={styles.panelDesc}>
                  Sign in to access the page folders assigned to your account.
                </div>

                <form onSubmit={handleLogin} style={styles.formGrid}>
                  <div>
                    <label style={styles.label}>Username</label>
                    <input
                      style={styles.input}
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      placeholder="Enter username"
                    />
                  </div>

                  <div>
                    <label style={styles.label}>Password</label>
                    <input
                      type="password"
                      style={styles.input}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter password"
                    />
                  </div>

                  <button type="submit" style={styles.primaryButton}>
                    Sign in
                  </button>
                </form>

                {authError ? <div style={styles.errorBox}>{authError}</div> : null}

                <div style={styles.demoCard}>
                  <div style={styles.demoTitle}>Demo account</div>
                  <div style={styles.demoRow}>
                    <span style={styles.demoKey}>Username</span>
                    <span style={styles.demoValue}>demo</span>
                  </div>
                  <div style={styles.demoRow}>
                    <span style={styles.demoKey}>Password</span>
                    <span style={styles.demoValue}>123</span>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <div style={styles.workspace}>
              <div style={styles.contentColumn}>
                <section style={styles.panel}>
                  <div style={styles.sectionHeader}>
                    <div>
                      <div style={styles.kicker}>Step 1</div>
                      <div style={styles.panelTitle}>Upload settings</div>
                    </div>
                  </div>

                  <div style={styles.panelDesc}>
                    Choose the page destination folder first.
                  </div>

                  <div style={styles.formGridTwo}>
                    <div>
                      <label style={styles.label}>Page Name</label>
                      <select
                        style={styles.select}
                        value={pageName}
                        onChange={(e) => handlePageChange(e.target.value)}
                      >
                        {availablePages.map((page) => (
                          <option key={page} value={page}>
                            {page}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={styles.label}>Folder Name</label>
                      <input
                        style={styles.inputReadonly}
                        value={folderName}
                        readOnly
                        placeholder="Folder will match the selected page name"
                      />
                    </div>
                  </div>
                </section>

                <section style={styles.panel}>
                  <div style={styles.sectionHeader}>
                    <div>
                      <div style={styles.kicker}>Step 2</div>
                      <div style={styles.panelTitle}>OKURL</div>
                    </div>
                  </div>

                  <div style={styles.panelDesc}>
                    Enter the original URL, choose the OKURL project, review the UTM values,
                    then generate the short link.
                  </div>

                  <div style={styles.okurlStepGrid}>
                    <div style={styles.formStack}>
                      <div>
                        <label style={styles.label}>Original URL</label>
                        <input
                          style={styles.input}
                          value={longUrl}
                          onChange={(e) => setLongUrl(e.target.value)}
                          placeholder="Paste the long URL here"
                        />
                      </div>

                      <div>
                        <label style={styles.label}>Project Name</label>
                        <select
                          style={styles.select}
                          value={selectedProjectId}
                          onChange={(e) => setSelectedProjectId(e.target.value)}
                        >
                          <option value="">
                            {projectsLoading ? "Loading projects..." : "Choose project"}
                          </option>
                          {okurlProjects.map((project) => (
                            <option key={project.id} value={String(project.id)}>
                              {project.name}
                            </option>
                          ))}
                        </select>
                        <div style={styles.helperText}>
                          Domain: {selectedDomain?.domain || SHORT_LINK_DOMAIN}
                        </div>
                      </div>

                      <div>
                        <label style={styles.label}>Custom slug (optional)</label>
                        <input
                          style={styles.input}
                          value={customSlug}
                          onChange={(e) => setCustomSlug(e.target.value)}
                          placeholder="custom-slug"
                        />
                      </div>

                      <div style={styles.inlineActions}>
                        <button
                          type="button"
                          style={{
                            ...styles.primaryButton,
                            opacity: creatingShortUrl ? 0.7 : 1,
                            cursor: creatingShortUrl ? "not-allowed" : "pointer",
                          }}
                          onClick={generateShortUrl}
                          disabled={creatingShortUrl}
                        >
                          {creatingShortUrl ? "Generating..." : "Generate Short URL"}
                        </button>
                      </div>

                      <div>
                        <label style={styles.label}>Short URL</label>
                        <div style={styles.shortUrlRow}>
                          <input
                            style={{ ...styles.inputReadonly, flex: 1 }}
                            value={shortUrl}
                            readOnly
                            placeholder="Generated short link"
                          />
                          <button
                            type="button"
                            style={styles.secondaryButton}
                            onClick={copyShortUrl}
                          >
                            Copy
                          </button>
                        </div>
                      </div>

                      {shortUrlSuccess ? (
                        <div style={styles.successBox}>{shortUrlSuccess}</div>
                      ) : null}

                      {shortUrlError ? (
                        <div style={styles.errorBox}>{shortUrlError}</div>
                      ) : null}
                    </div>

                    <div style={styles.utmBuilderCard}>
                      <div style={styles.utmBuilderHeader}>
                        <div style={styles.utmBuilderTitle}>UTM Builder</div>
                        <div style={styles.utmBuilderBadge}>
                          {selectedUtmTemplate?.label || "Auto"}
                        </div>
                      </div>

                      <div style={styles.formStack}>
                        <div>
                          <label style={styles.label}>UTM Template</label>
                          <select
                            style={styles.select}
                            value={selectedUtmTemplateKey}
                            onChange={(e) => handleUtmTemplateChange(e.target.value)}
                          >
                            <option value="">
                              {selectedProject
                                ? "Select UTM template"
                                : "Choose project first"}
                            </option>
                            {selectedProjectTemplates.map((template) => (
                              <option key={template.key} value={template.key}>
                                {template.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div style={styles.formGridTwo}>
                          <div>
                            <label style={styles.label}>Source</label>
                            <input
                              style={styles.input}
                              value={utmFields.source}
                              onChange={(e) => updateUtmField("source", e.target.value)}
                              placeholder="mkg"
                            />
                          </div>

                          <div>
                            <label style={styles.label}>Medium</label>
                            <input
                              style={styles.input}
                              value={utmFields.medium}
                              onChange={(e) => updateUtmField("medium", e.target.value)}
                              placeholder="video"
                            />
                          </div>

                          <div>
                            <label style={styles.label}>Campaign</label>
                            <input
                              style={styles.input}
                              value={utmFields.campaign}
                              onChange={(e) => updateUtmField("campaign", e.target.value)}
                              placeholder="campaign-name"
                            />
                          </div>

                          <div>
                            <label style={styles.label}>Term</label>
                            <input
                              style={styles.input}
                              value={utmFields.term}
                              onChange={(e) => updateUtmField("term", e.target.value)}
                              placeholder="news"
                            />
                          </div>

                          <div>
                            <label style={styles.label}>Content</label>
                            <input
                              style={styles.input}
                              value={utmFields.content}
                              onChange={(e) => updateUtmField("content", e.target.value)}
                              placeholder="reels"
                            />
                          </div>

                          <div>
                            <label style={styles.label}>Source Platform</label>
                            <input
                              style={styles.input}
                              value={utmFields.sourcePlatform}
                              onChange={(e) =>
                                updateUtmField("sourcePlatform", e.target.value)
                              }
                              placeholder="fb"
                            />
                          </div>
                        </div>

                        <div>
                          <label style={styles.label}>URL With UTM</label>
                          <textarea
                            rows={4}
                            style={{ ...styles.textareaLarge, background: "#f3f6fb" }}
                            value={longUrlWithUtm}
                            readOnly
                            placeholder="Paste the original URL above to preview the final tracking URL"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section style={styles.panel}>
                  <div style={styles.sectionHeader}>
                    <div>
                      <div style={styles.kicker}>Step 3</div>
                      <div style={styles.panelTitle}>Shorts generator</div>
                    </div>
                  </div>

                  <div style={styles.panelDesc}>
                    Paste a Gan Jing World long-video URL to generate short clips, review
                    the strongest options, and copy helpful titles or descriptions into
                    your TXT writing below before adding the best shorts into the upload
                    files list. For long videos, limit the time range first so ShortsGen
                    can finish much faster.
                  </div>

                  <div style={styles.shortsPanel}>
                    <div style={styles.formStack}>
                      <div>
                        <label style={styles.label}>Long video URL</label>
                        <input
                          style={styles.input}
                          value={shortsSourceUrl}
                          onChange={(e) => setShortsSourceUrl(e.target.value)}
                          placeholder="Paste the long video URL here"
                        />
                        <div style={styles.helperText}>
                          API:{" "}
                          <a
                            href="https://shortsgen.ganjingworld.com/"
                            target="_blank"
                            rel="noreferrer"
                            style={styles.inlineLink}
                          >
                            shortsgen.ganjingworld.com
                          </a>
                        </div>
                      </div>

                      <div style={styles.formStack}>
                        <div>
                          <label style={styles.label}>Clipping mode</label>
                          <div style={styles.segmentedControl}>
                            <button
                              type="button"
                              style={{
                                ...styles.segmentedButton,
                                ...(shortsMode === "aiClipping"
                                  ? styles.segmentedButtonActive
                                  : null),
                              }}
                              onClick={() => setShortsMode("aiClipping")}
                            >
                              AI Clipping
                            </button>
                            <button
                              type="button"
                              style={{
                                ...styles.segmentedButton,
                                ...(shortsMode === "manualSelected"
                                  ? styles.segmentedButtonActive
                                  : null),
                              }}
                              onClick={() => setShortsMode("manualSelected")}
                            >
                              Manual Selection
                            </button>
                          </div>
                          <div style={styles.helperText}>
                            AI Clipping finds the best clips inside your chosen range.
                            Manual Selection is stricter and only uses the exact range
                            you provide.
                          </div>
                        </div>

                        <div>
                          <label style={styles.label}>Time range</label>
                          <div style={styles.rangeFieldGrid}>
                            <div>
                              <input
                                style={styles.input}
                                value={shortsRangeStart}
                                onChange={(e) => setShortsRangeStart(e.target.value)}
                                placeholder="Start, e.g. 00:00"
                              />
                            </div>
                            <div>
                              <input
                                style={styles.input}
                                value={shortsRangeEnd}
                                onChange={(e) => setShortsRangeEnd(e.target.value)}
                                placeholder="End, e.g. 05:00"
                              />
                            </div>
                          </div>
                          <div style={styles.helperText}>
                            Leave both blank to use the full video in AI Clipping mode.
                            Current range: {shortsRangeSummary}.
                          </div>
                          <div style={styles.presetChipRow}>
                            {SHORTS_RANGE_PRESETS.map((preset) => {
                              const active =
                                shortsRangeStart === preset.start &&
                                shortsRangeEnd === preset.end;

                              return (
                                <button
                                  key={preset.label}
                                  type="button"
                                  style={{
                                    ...styles.presetChip,
                                    ...(active ? styles.presetChipActive : null),
                                  }}
                                  onClick={() =>
                                    applyShortsRangePreset(preset.start, preset.end)
                                  }
                                >
                                  {preset.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div style={styles.inlineActions}>
                        <button
                          type="button"
                          style={{
                            ...styles.primaryButton,
                            opacity: generatingShorts ? 0.7 : 1,
                            cursor: generatingShorts ? "not-allowed" : "pointer",
                          }}
                          onClick={generateShorts}
                          disabled={generatingShorts}
                        >
                          {generatingShorts ? "Generating..." : "Generate shorts"}
                        </button>
                      </div>
                    </div>

                    <div style={styles.shortsPreviewCard}>
                      <div style={styles.shortsPreviewHeader}>
                        <div style={styles.actionTitle}>Preview clips</div>
                        <div style={styles.shortsPreviewPills}>
                          {shortsJobStatus ? (
                            <div style={styles.statusPill}>{shortsJobStatus}</div>
                          ) : null}
                          <div style={styles.selectionPill}>
                            {selectedShortIds.length} selected
                          </div>
                        </div>
                      </div>

                      {shortsJobId ? (
                        <div style={styles.helperText}>Job ID: {shortsJobId}</div>
                      ) : null}

                      {shortsClips.length ? (
                        <div style={styles.shortsClipList}>
                          {shortsClips.map((clip) => {
                            const selected = selectedShortIds.includes(clip.id);

                            return (
                              <label
                                key={clip.id}
                                style={{
                                  ...styles.shortsClipCard,
                                  borderColor: selected ? "#f29a3f" : "#d8e3f5",
                                  background: selected ? "#fff3e6" : "#ffffff",
                                }}
                              >
                                <div style={styles.shortsClipCardHeader}>
                                  <div style={styles.shortClipCheckboxWrap}>
                                    <input
                                      type="checkbox"
                                      checked={selected}
                                      onChange={() => toggleShortSelection(clip.id)}
                                    />
                                  </div>
                                  <div style={styles.shortsQualityPill}>
                                    {clip.qualityLabel}
                                    {clip.qualityScore !== null
                                      ? ` · ${clip.qualityScore}`
                                      : ""}
                                  </div>
                                </div>
                                <div style={styles.shortsClipPreviewWrap}>
                                  <video
                                    style={styles.shortsClipPreview}
                                    controls
                                    preload="metadata"
                                    playsInline
                                    poster={clip.thumbnailUrl || undefined}
                                  >
                                    <source src={clip.downloadUrl} type="video/mp4" />
                                  </video>
                                </div>
                                <div style={styles.shortsClipBody}>
                                  <div style={styles.shortsClipTitle}>{clip.title}</div>
                                  <div style={styles.shortsClipMeta}>
                                    #{clip.rank} · {clip.duration} · {clip.angle}
                                  </div>
                                  <div style={styles.shortsClipTextBlock}>
                                    <div style={styles.shortsClipTextLabel}>Title</div>
                                    <div style={styles.shortsClipSnippet}>{clip.title}</div>
                                    <div style={styles.shortsClipTextLabel}>Description</div>
                                    <div style={styles.shortsClipDescription}>
                                      {clip.description || "No description returned by ShortsGen."}
                                    </div>
                                  </div>
                                  <div style={styles.shortsClipActions}>
                                    <button
                                      type="button"
                                      style={styles.miniActionButton}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        void copyClipText(clip.title, "Title");
                                      }}
                                    >
                                      Copy title
                                    </button>
                                    <button
                                      type="button"
                                      style={styles.miniActionButton}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        void copyClipText(
                                          clip.description || clip.angle,
                                          "Description"
                                        );
                                      }}
                                    >
                                      Copy description
                                    </button>
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={styles.shortsEmptyState}>
                          {generatingShorts
                            ? "ShortsGen is analyzing the long video and preparing clips..."
                            : "Generate shorts to preview clip options, compare quality, and choose the best ones to download."}
                        </div>
                      )}

                      <div style={styles.inlineActions}>
                        <button
                          type="button"
                          style={styles.secondaryButton}
                          onClick={downloadSelectedShorts}
                        >
                          Download selected shorts
                        </button>
                        <button
                          type="button"
                          style={{
                            ...styles.primaryButton,
                            opacity: addingShortsToUploads ? 0.7 : 1,
                            cursor: addingShortsToUploads ? "not-allowed" : "pointer",
                          }}
                          onClick={addSelectedShortsToUploadList}
                          disabled={addingShortsToUploads}
                        >
                          {addingShortsToUploads
                            ? "Adding to upload list..."
                            : "Add Shorts to Upload files"}
                        </button>
                      </div>

                      {shortsSuccess ? (
                        <div style={styles.successBox}>{shortsSuccess}</div>
                      ) : null}

                      {shortsError ? <div style={styles.errorBox}>{shortsError}</div> : null}
                    </div>
                  </div>
                </section>

                <section style={styles.panel}>
                  <div style={styles.sectionHeader}>
                    <div>
                      <div style={styles.kicker}>Step 4</div>
                      <div style={styles.panelTitle}>TXT generator</div>
                    </div>
                  </div>

                  <div style={styles.panelDesc}>
                    After choosing your shorts, write matching TXT content for
                    `video1` to `video5`. Use the ShortsGen titles and descriptions as
                    reference, then add the generated TXT files directly into the upload
                    files list below.
                  </div>

                  {selectedShortIds.length ? (
                    <div style={styles.helperBanner}>
                      {selectedShortIds.length} short(s) selected in Step 3. Fill TXT
                      Description 1 to {selectedShortIds.length} to match `video1` to
                      `video{selectedShortIds.length}` in the same order, and leave the
                      remaining boxes empty if you do not need them.
                    </div>
                  ) : null}

                  <div style={styles.txtGrid}>
                    {txtDescriptions.map((value, index) => (
                      <div key={`txt-${index}`}>
                        <label style={styles.label}>{`TXT Description ${index + 1}`}</label>
                        <textarea
                          rows={3}
                          style={styles.textareaCompact}
                          value={value}
                          onChange={(e) => updateTxtDescription(index, e.target.value)}
                          placeholder={`Write TXT content for video${index + 1}`}
                        />
                      </div>
                    ))}
                  </div>

                  <div style={styles.inlineActions}>
                    <button type="button" style={styles.secondaryButton} onClick={downloadTxt}>
                      Download All TXT
                    </button>
                    <button
                      type="button"
                      style={{
                        ...styles.primaryButton,
                        opacity: addingTxtsToUploads ? 0.7 : 1,
                        cursor: addingTxtsToUploads ? "not-allowed" : "pointer",
                      }}
                      onClick={addGeneratedTxtsToUploadList}
                      disabled={addingTxtsToUploads}
                    >
                      {addingTxtsToUploads
                        ? "Adding TXT..."
                        : "Add TXT to Upload files"}
                    </button>
                  </div>
                </section>

                <section style={styles.panel}>
                  <div style={styles.sectionHeader}>
                    <div>
                      <div style={styles.kicker}>Step 5</div>
                      <div style={styles.panelTitle}>Upload files</div>
                    </div>
                  </div>

                  <div style={styles.panelDesc}>
                    After downloading the TXT file, upload the video and the matching TXT file together.
                  </div>

                  <div
                    style={styles.dropzone}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div style={styles.dropzoneTitle}>Drop files here or click to browse</div>
                    <div style={styles.dropzoneSub}>
                      Recommended: one .mp4 and one matching .txt
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    style={{ display: "none" }}
                    onChange={onFileChange}
                  />

                  <div style={styles.fileSummary}>
                    {files.length} file(s) selected · {totalSizeMb} MB
                  </div>

                  <div style={styles.fileList}>
                    {files.map((file, idx) => (
                      <div key={file.name + "-" + String(idx)} style={styles.fileRow}>
                        <div>
                          <div style={styles.fileName}>{file.name}</div>
                          <div style={styles.fileMeta}>
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        </div>
                        <button
                          type="button"
                          style={styles.secondaryButton}
                          onClick={() => removeFile(idx)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </section>

                <section style={styles.panel}>
                  <div style={styles.sectionHeader}>
                    <div>
                      <div style={styles.kicker}>Step 6</div>
                      <div style={styles.panelTitle}>Start automation</div>
                    </div>
                  </div>

                  <div style={styles.panelDesc}>
                    Review the current summary, then start the automation.
                  </div>

                  <div style={styles.summaryCard}>
                    <div style={styles.actionTitle}>Current summary</div>
                    <div style={styles.summaryRow}>
                      <span>Page</span>
                      <strong>{pageName || "-"}</strong>
                    </div>
                    <div style={styles.summaryRow}>
                      <span>Folder</span>
                      <strong>{folderName || "-"}</strong>
                    </div>
                    <div style={styles.summaryRow}>
                      <span>Project</span>
                      <strong>{selectedProject?.name || "-"}</strong>
                    </div>
                    <div style={styles.summaryRow}>
                      <span>Files</span>
                      <strong>{files.length}</strong>
                    </div>
                    <div style={styles.summaryRow}>
                      <span>Total size</span>
                      <strong>{totalSizeMb} MB</strong>
                    </div>
                    <div style={styles.summaryRow}>
                      <span>Short URL</span>
                      <strong style={styles.summaryBreak}>{shortUrl || "Not set"}</strong>
                    </div>
                  </div>

                  <div style={styles.inlineActions}>
                    <button
                      type="button"
                      style={{
                        ...styles.primaryButton,
                        width: "100%",
                        opacity: submitting ? 0.7 : 1,
                        cursor: submitting ? "not-allowed" : "pointer",
                      }}
                      onClick={submitToN8n}
                      disabled={submitting}
                    >
                      {submitting ? "Starting..." : "Start automation"}
                    </button>
                  </div>

                  {success ? <div style={styles.successBox}>{success}</div> : null}
                  {error ? <div style={styles.errorBox}>{error}</div> : null}
                </section>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, #fff4e8 0%, #eef4ff 42%, #f7faff 100%)",
    color: "#132238",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  shell: {
    display: "grid",
    gridTemplateColumns: "270px minmax(0, 1fr)",
    minHeight: "100vh",
  },
  sidebar: {
    background: "linear-gradient(180deg, #0a1c3d 0%, #14325d 100%)",
    color: "#eef4ff",
    padding: 24,
    borderRight: "1px solid rgba(255,255,255,0.08)",
    display: "grid",
    alignContent: "start",
    gap: 18,
  },
  logoBox: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    marginBottom: 18,
  },
  logoMark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    overflow: "hidden",
    boxShadow: "0 10px 20px rgba(242, 140, 40, 0.24)",
    flexShrink: 0,
  },
  logoIcon: {
    width: "100%",
    height: "100%",
    display: "block",
  },
  logoTitle: {
    fontWeight: 800,
    fontSize: 20,
    letterSpacing: -0.3,
  },
  sidebarInfoCard: {
    background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  sidebarInfoTitle: {
    fontSize: 12,
    color: "#8fa4c7",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    fontWeight: 700,
  },
  sidebarInfoName: {
    fontWeight: 800,
    fontSize: 18,
    color: "#ffffff",
    lineHeight: 1.3,
  },
  sidebarInfoSub: {
    marginTop: 6,
    fontSize: 13,
    color: "#c1d2ef",
    lineHeight: 1.5,
  },
  sidebarInfoMeta: {
    marginTop: 10,
    fontSize: 12,
    color: "#8fa4c7",
    lineHeight: 1.5,
  },
  navCard: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 16,
  },
  navSectionTitle: {
    fontSize: 12,
    color: "#8fa4c7",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
    fontWeight: 700,
  },
  stepsStack: {
    display: "grid",
    gap: 10,
  },
  stepCard: {
    display: "grid",
    gridTemplateColumns: "34px minmax(0, 1fr)",
    gap: 12,
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: 16,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  stepBadge: {
    width: 34,
    height: 34,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    background: "#fff1df",
    color: "#ba680f",
    fontWeight: 800,
    fontSize: 13,
  },
  stepText: {
    color: "#edf4ff",
    fontSize: 13,
    lineHeight: 1.5,
    fontWeight: 600,
  },
  mainArea: {
    padding: 28,
    display: "grid",
    alignContent: "start",
    gap: 22,
  },
  topbar: {
    display: "flex",
    justifyContent: "space-between",
    gap: 20,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  badge: {
    display: "inline-block",
    background: "#fff1df",
    color: "#b86407",
    fontWeight: 700,
    fontSize: 12,
    borderRadius: 999,
    padding: "6px 12px",
    marginBottom: 12,
    border: "1px solid #ffd4a9",
  },
  title: {
    fontSize: 36,
    lineHeight: 1.08,
    margin: 0,
    fontWeight: 800,
    letterSpacing: -0.8,
    color: "#0d2242",
  },
  subtitle: {
    marginTop: 12,
    marginBottom: 0,
    color: "#607086",
    fontSize: 16,
    maxWidth: 760,
    lineHeight: 1.6,
  },
  loginWrap: {
    maxWidth: 620,
  },
  workspace: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: 22,
    alignItems: "start",
  },
  contentColumn: {
    display: "grid",
    gap: 22,
  },
  actionColumn: {
    position: "relative",
  },
  actionStack: {
    position: "sticky",
    top: 18,
    display: "grid",
    gap: 16,
  },
  panel: {
    background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
    border: "1px solid #dce7f7",
    borderRadius: 24,
    padding: 24,
    boxShadow: "0 14px 36px rgba(17, 42, 79, 0.08)",
  },
  actionPanel: {
    background: "#ffffff",
    border: "1px solid #dce7f7",
    borderRadius: 20,
    padding: 20,
    boxShadow: "0 14px 36px rgba(17, 42, 79, 0.08)",
  },
  summaryCard: {
    background: "linear-gradient(180deg, #f8fbff 0%, #fffaf3 100%)",
    border: "1px solid #dde8f7",
    borderRadius: 20,
    padding: 20,
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "center",
    marginBottom: 8,
  },
  kicker: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 64,
    padding: "6px 12px",
    borderRadius: 999,
    background: "#fff2e4",
    border: "1px solid #ffd4ac",
    color: "#c86d12",
    fontSize: 12,
    letterSpacing: 0.4,
    fontWeight: 800,
    marginBottom: 8,
  },
  panelTitle: {
    fontSize: 28,
    fontWeight: 800,
    letterSpacing: -0.4,
    color: "#0d2242",
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: 800,
    marginBottom: 14,
    color: "#0d2242",
  },
  panelDesc: {
    color: "#586a84",
    fontSize: 15,
    lineHeight: 1.6,
    marginBottom: 18,
  },
  formGrid: {
    display: "grid",
    gap: 14,
  },
  formGridTwo: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  },
  formStack: {
    display: "grid",
    gap: 16,
  },
  txtGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(180px, 1fr))",
    gap: 14,
    alignItems: "start",
    overflowX: "auto",
  },
  okurlStepGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 20,
    alignItems: "start",
  },
  utmBuilderCard: {
    display: "grid",
    gap: 16,
    padding: 16,
    borderRadius: 18,
    border: "1px solid #d9e7f7",
    background: "linear-gradient(180deg, #f7fbff 0%, #fffaf3 100%)",
  },
  utmBuilderHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  utmBuilderTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: "#10233f",
  },
  utmBuilderBadge: {
    borderRadius: 999,
    padding: "6px 10px",
    background: "#fff1df",
    color: "#b86407",
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  label: {
    display: "block",
    marginBottom: 8,
    fontWeight: 700,
    fontSize: 14,
    color: "#1d2a3b",
  },
  helperText: {
    marginTop: 8,
    fontSize: 12,
    color: "#587092",
  },
  segmentedControl: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: 6,
    borderRadius: 16,
    background: "#eef4ff",
    border: "1px solid #d8e3f5",
    flexWrap: "wrap",
  },
  segmentedButton: {
    border: "none",
    background: "transparent",
    color: "#5a6f8e",
    borderRadius: 12,
    padding: "10px 14px",
    fontWeight: 800,
    fontSize: 14,
    cursor: "pointer",
  },
  segmentedButtonActive: {
    background: "#ffffff",
    color: "#214a8c",
    boxShadow: "0 8px 18px rgba(33, 74, 140, 0.12)",
  },
  rangeFieldGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 12,
  },
  presetChipRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  presetChip: {
    border: "1px solid #d8e3f5",
    background: "#ffffff",
    color: "#486280",
    borderRadius: 999,
    padding: "8px 12px",
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
  },
  presetChipActive: {
    border: "1px solid #ffcf9f",
    background: "#fff2e4",
    color: "#c86d12",
  },
  helperBanner: {
    marginBottom: 16,
    borderRadius: 14,
    padding: "12px 14px",
    background: "#eef6ff",
    border: "1px solid #cfe0f5",
    color: "#29527a",
    fontSize: 13,
    lineHeight: 1.6,
    fontWeight: 600,
  },
  inlineLink: {
    color: "#d97706",
    textDecoration: "none",
    fontWeight: 700,
  },
  demoCard: {
    marginTop: 18,
    borderRadius: 18,
    border: "1px solid #dce7f7",
    background: "linear-gradient(180deg, #f9fbff 0%, #fffaf3 100%)",
    padding: 16,
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: 800,
    color: "#0d2242",
    marginBottom: 12,
  },
  demoRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "8px 0",
    borderTop: "1px solid #e8eef8",
    fontSize: 14,
  },
  demoKey: {
    color: "#627590",
    fontWeight: 600,
  },
  demoValue: {
    color: "#0d2242",
    fontWeight: 800,
  },
  input: {
    width: "100%",
    borderRadius: 14,
    border: "1px solid #cfdef2",
    padding: "13px 14px",
    fontSize: 15,
    outline: "none",
    background: "#fbfdff",
    boxSizing: "border-box",
  },
  inputReadonly: {
    width: "100%",
    borderRadius: 14,
    border: "1px solid #d9e4f4",
    padding: "13px 14px",
    fontSize: 15,
    outline: "none",
    background: "#f3f7fd",
    color: "#4b5b72",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    borderRadius: 14,
    border: "1px solid #cfdef2",
    padding: "13px 14px",
    fontSize: 15,
    outline: "none",
    background: "#fbfdff",
    boxSizing: "border-box",
  },
  textareaLarge: {
    width: "100%",
    minHeight: 96,
    borderRadius: 14,
    border: "1px solid #cfdef2",
    padding: "13px 14px",
    fontSize: 15,
    outline: "none",
    background: "#fbfdff",
    resize: "vertical",
    boxSizing: "border-box",
  },
  textareaCompact: {
    width: "100%",
    minHeight: 96,
    borderRadius: 14,
    border: "1px solid #cfdef2",
    padding: "13px 14px",
    fontSize: 15,
    outline: "none",
    background: "#fbfdff",
    resize: "vertical",
    boxSizing: "border-box",
  },
  primaryButton: {
    border: "none",
    background: "linear-gradient(180deg, #ff9a3c 0%, #ea7c16 100%)",
    color: "#fff",
    borderRadius: 14,
    padding: "14px 18px",
    fontWeight: 800,
    fontSize: 15,
    cursor: "pointer",
    boxShadow: "0 10px 24px rgba(234, 124, 22, 0.24)",
  },
  secondaryButton: {
    border: "1px solid #ffd3aa",
    background: "#fff5ea",
    color: "#b86407",
    borderRadius: 14,
    padding: "12px 16px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  dropzone: {
    border: "2px dashed #b7d1f0",
    borderRadius: 20,
    padding: "40px 18px",
    textAlign: "center",
    background: "linear-gradient(180deg, #eef6ff 0%, #e8f2ff 100%)",
    cursor: "pointer",
  },
  dropzoneTitle: {
    fontSize: 18,
    fontWeight: 800,
    marginBottom: 10,
  },
  dropzoneSub: {
    color: "#64748b",
    fontSize: 15,
  },
  fileSummary: {
    marginTop: 14,
    color: "#64748b",
    fontSize: 14,
  },
  fileList: {
    display: "grid",
    gap: 12,
    marginTop: 14,
  },
  fileRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    border: "1px solid #dce7f7",
    borderRadius: 16,
    padding: "14px 16px",
    background: "#ffffff",
  },
  fileName: {
    fontWeight: 800,
    fontSize: 16,
    marginBottom: 4,
  },
  fileMeta: {
    color: "#6b7789",
    fontSize: 13,
  },
  inlineActions: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 14,
  },
  shortUrlRow: {
    display: "flex",
    gap: 12,
    alignItems: "center",
  },
  shortsPanel: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 20,
    alignItems: "start",
  },
  shortsPreviewCard: {
    background: "linear-gradient(180deg, #f7fbff 0%, #fffaf3 100%)",
    border: "1px solid #d9e7f7",
    borderRadius: 20,
    padding: 20,
  },
  shortsPreviewHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  shortsPreviewPills: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  statusPill: {
    borderRadius: 999,
    padding: "6px 10px",
    background: "#fff1df",
    color: "#b86407",
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
  selectionPill: {
    borderRadius: 999,
    padding: "6px 10px",
    background: "#e8f0ff",
    color: "#214a8c",
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  shortsClipList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 18,
  },
  shortsClipCard: {
    display: "grid",
    alignContent: "start",
    gap: 12,
    border: "1px solid #d8e3f5",
    borderRadius: 20,
    padding: "14px",
    cursor: "pointer",
    boxShadow: "0 10px 24px rgba(16, 35, 63, 0.06)",
  },
  shortsClipCardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  shortClipCheckboxWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  shortsClipPreviewWrap: {
    display: "flex",
    justifyContent: "center",
  },
  shortsClipPreview: {
    width: "100%",
    maxWidth: 220,
    aspectRatio: "9 / 16",
    height: "auto",
    objectFit: "cover",
    borderRadius: 18,
    border: "1px solid #dce7f7",
    background: "#f3f7fd",
  },
  shortsClipBody: {
    minWidth: 0,
    display: "grid",
    gap: 6,
  },
  shortsClipTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: "#0d2242",
    lineHeight: 1.35,
  },
  shortsQualityPill: {
    borderRadius: 999,
    padding: "6px 10px",
    background: "#fff1df",
    color: "#b86407",
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  shortsClipMeta: {
    fontSize: 13,
    color: "#627590",
    lineHeight: 1.6,
  },
  shortsClipTextBlock: {
    display: "grid",
    gap: 6,
  },
  shortsClipTextLabel: {
    fontSize: 11,
    fontWeight: 800,
    color: "#6a7f9b",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  shortsClipSnippet: {
    fontSize: 14,
    color: "#112645",
    fontWeight: 700,
    lineHeight: 1.5,
  },
  shortsClipDescription: {
    fontSize: 13,
    color: "#54677f",
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
    display: "-webkit-box",
    WebkitLineClamp: 6,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  shortsClipActions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 4,
  },
  miniActionButton: {
    border: "1px solid #d8e3f5",
    background: "#ffffff",
    color: "#214a8c",
    borderRadius: 12,
    padding: "8px 11px",
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
  },
  shortsEmptyState: {
    borderRadius: 16,
    border: "1px dashed #c9d9ef",
    background: "#ffffff",
    padding: "24px 18px",
    color: "#5f7088",
    fontSize: 14,
    lineHeight: 1.6,
  },
  successBox: {
    marginTop: 16,
    borderRadius: 14,
    padding: "13px 14px",
    background: "#ebfbf1",
    color: "#177245",
    border: "1px solid #b8e8ca",
    fontWeight: 600,
  },
  errorBox: {
    marginTop: 16,
    borderRadius: 14,
    padding: "13px 14px",
    background: "#fff1f1",
    color: "#b12d2d",
    border: "1px solid #f1c7c7",
    fontWeight: 600,
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    padding: "10px 0",
    borderBottom: "1px solid #eef3f9",
    fontSize: 14,
  },
  summaryBreak: {
    textAlign: "right",
    wordBreak: "break-all",
  },
};
