"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

type CurrentUser = {
  username: string;
  folders: string[];
  pages: string[];
  isDemo?: boolean;
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

type UploadableFile = File & {
  originalTitle?: string;
};

type ShortsGenerationMode = "aiClipping" | "manualSelected";

type SavedShortsHistoryEntry = {
  workspaceId: string;
  jobId: string;
  sourceUrl: string;
  mode: ShortsGenerationMode;
  rangeStart: string;
  rangeEnd: string;
  status: string;
  progress: number | null;
  clips: ShortsClipOption[];
  selectedShortIds: string[];
  uploadedClipIds: string[];
  createdAt: number;
  updatedAt: number;
  successMessage: string;
  errorMessage: string;
};


type ShortLinkHistoryEntry = {
  originalUrl: string;
  shortUrl: string;
  projectName: string;
  createdAt: number;
};

type ShortsWorkspaceState = {
  workspaceId: string;
  title: string;
  isCollapsed: boolean;
  sourceUrl: string;
  mode: ShortsGenerationMode;
  rangeStart: string;
  rangeEnd: string;
  clips: ShortsClipOption[];
  selectedShortIds: string[];
  uploadedClipIds: string[];
  generatingShorts: boolean;
  downloadingShorts: boolean;
  addingShortsToUploads: boolean;
  shortsAddedToUploads: boolean;
  successMessage: string;
  errorMessage: string;
  copiedClipActionKey: string;
  txtDescriptions: string[];
  addingTxtsToUploads: boolean;
  txtsAddedToUploads: boolean;
  jobId: string;
  jobStatus: string;
  jobProgress: number | null;
};

const SHORT_LINK_DOMAIN = "gjw.us";
const TXT_BOX_COUNT = 5;
const SHORTSGEN_MAX_POLL_ATTEMPTS = 120;
const SHORTSGEN_FULL_VIDEO_MAX_POLL_ATTEMPTS = 360;
const SHORTSGEN_RESULTS_RETRY_DELAY_MS = 2000;
const SHORTSGEN_RESULTS_MAX_RETRIES = 14;
const SHORTSGEN_CREATE_MAX_RETRIES = 4;
const SHORTSGEN_FAILED_STATUS_GRACE_POLLS = 6;
const SHORTSGEN_STATUS_FETCH_MAX_RETRIES = 3;
const SHORTSGEN_FAILED_CONFIRMATION_CHECKS = 2;
const SHORTSGEN_FAILED_CONFIRMATION_DELAY_MS = 4000;
const SHORTS_RANGE_PRESETS = [
  { label: "Full video", start: "", end: "" },
  { label: "First 2 min", start: "00:00", end: "02:00" },
  { label: "First 3 min", start: "00:00", end: "03:00" },
  { label: "First 5 min", start: "00:00", end: "05:00" },
  { label: "First 8 min", start: "00:00", end: "08:00" },
  { label: "First 10 min", start: "00:00", end: "10:00" },
];
const SHORTS_WORKSPACE_CONFIG = [
  { workspaceId: "workspace-1", title: "Workspace 1" },
  { workspaceId: "workspace-2", title: "Workspace 2" },
  { workspaceId: "workspace-3", title: "Workspace 3" },
];
const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1080;
const WORKFLOW_STEPS = [
  "Choose social platform destinations",
  "Generate the short link",
  "Generate shorts, TXT, and review",
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

const buildUrlWithUtm = (
  baseUrl: string,
  fields: UtmBuilderFields,
  signUpWallEnabled = false
) => {
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
  if (signUpWallEnabled) {
    params.set("softsignup", "on");
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

const SESSION_STORAGE_KEY = "ucreator-console-session";
const LANGUAGE_STORAGE_KEY = "ucreator-console-lang";
const SHORTS_HISTORY_PER_WORKSPACE = 3;
const buildShortsHistoryStorageKey = (username: string) =>
  `ucreator-console-shorts-history:${username}`;
const buildShortLinkHistoryStorageKey = (username: string) =>
  `ucreator-console-shortlink-history:${username}`;

const isBrowser = () => typeof window !== "undefined";

const readStoredJson = <T,>(key: string, fallback: T): T => {
  if (!isBrowser()) return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeStoredJson = (key: string, value: unknown) => {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage failures
  }
};

const removeStoredJson = (key: string) => {
  if (!isBrowser()) return;

  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore storage failures
  }
};

const upsertShortsHistoryEntry = (
  entries: SavedShortsHistoryEntry[],
  nextEntry: SavedShortsHistoryEntry
) => {
  const filtered = entries.filter((item) => item.jobId !== nextEntry.jobId);
  const sorted = [nextEntry, ...filtered].sort((a, b) => b.updatedAt - a.updatedAt);
  const next: SavedShortsHistoryEntry[] = [];
  const counts = new Map<string, number>();

  for (const entry of sorted) {
    const workspaceKey = entry.workspaceId || SHORTS_WORKSPACE_CONFIG[0].workspaceId;
    const count = counts.get(workspaceKey) || 0;
    if (count >= SHORTS_HISTORY_PER_WORKSPACE) continue;
    counts.set(workspaceKey, count + 1);
    next.push(entry);
  }

  return next;
};

const getPollDelayMs = (attempt: number) => {
  if (attempt < 10) return 4000;
  if (attempt < 30) return 6000;
  return 10000;
};

const isRetryableShortsMessage = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes("still processing") ||
    normalized.includes("upstream") ||
    normalized.includes("temporar") ||
    normalized.includes("timeout") ||
    normalized.includes("timed out") ||
    normalized.includes("network") ||
    normalized.includes("fetch failed") ||
    normalized.includes("empty") ||
    normalized.includes("no clips") ||
    normalized.includes("again later") ||
    normalized.includes("try again") ||
    normalized.includes("please wait")
  );
};

const isSoftFailedShortsStatus = (status: string, message: string) => {
  if (status !== "FAILED") return false;
  return !message || isRetryableShortsMessage(message);
};

const formatHistoryTimestamp = (timestamp: number) => {
  if (!timestamp) return "";

  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return "";
  }
};

const getHistoryStatusStyle = (status?: string): React.CSSProperties => {
  const normalized = (status || "").trim().toUpperCase();

  if (normalized === "COMPLETED") {
    return { color: "#15803d", fontWeight: 700 };
  }

  if (normalized === "FAILED") {
    return { color: "#dc2626", fontWeight: 700 };
  }

  if (normalized === "IN_PROGRESS" || normalized === "SCHEDULED") {
    return { color: "#b45309", fontWeight: 700 };
  }

  return { color: "#64748b", fontWeight: 700 };
};

const isTerminalShortsStatus = (status: string) => {
  const normalized = status.trim().toUpperCase();
  return normalized === "COMPLETED" || normalized === "FAILED";
};

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

const getSequentialIndexFromName = (
  fileName: string,
  extension: "mp4" | "txt"
) => {
  const match = fileName.match(new RegExp(`^video(\\d+)\\.${extension}$`, "i"));
  return match ? Number(match[1]) : null;
};

const appendGeneratedFiles = (
  existingFiles: UploadableFile[],
  incomingFiles: UploadableFile[],
  extension: "mp4" | "txt"
) => {
  const highestIndex = existingFiles.reduce((max, file) => {
    const currentIndex = getSequentialIndexFromName(file.name, extension);
    return currentIndex && currentIndex > max ? currentIndex : max;
  }, 0);

  const renamedFiles = incomingFiles.map((file, index) => {
    const nextIndex = highestIndex + index;
    const renamedFile = new File([file], buildSequentialFileName(nextIndex, extension), {
      type: file.type,
      lastModified: file.lastModified || Date.now(),
    }) as UploadableFile;

    if (file.originalTitle) {
      renamedFile.originalTitle = file.originalTitle;
    }

    return renamedFile;
  });

  return [...existingFiles, ...renamedFiles];
};

const readDownloadFileName = (contentDisposition: string | null) => {
  if (!contentDisposition) return "";

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const basicMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  return basicMatch?.[1]?.trim() || "";
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

const createInitialShortsWorkspaceState = (
  workspaceId: string,
  title: string
): ShortsWorkspaceState => ({
  workspaceId,
  title,
  isCollapsed: false,
  sourceUrl: "",
  mode: "aiClipping",
  rangeStart: "00:00",
  rangeEnd: "05:00",
  clips: [],
  selectedShortIds: [],
  uploadedClipIds: [],
  generatingShorts: false,
  downloadingShorts: false,
  addingShortsToUploads: false,
  shortsAddedToUploads: false,
  successMessage: "",
  errorMessage: "",
  copiedClipActionKey: "",
  txtDescriptions: Array.from({ length: TXT_BOX_COUNT }, () => ""),
  addingTxtsToUploads: false,
  txtsAddedToUploads: false,
  jobId: "",
  jobStatus: "",
  jobProgress: null,
});

const createInitialShortsWorkspaces = () =>
  SHORTS_WORKSPACE_CONFIG.map((item, index) => ({
    ...createInitialShortsWorkspaceState(item.workspaceId, item.title),
    isCollapsed: index !== 0,
  }));

export default function Page() {
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authError, setAuthError] = useState("");
  const [lang, setLang] = useState<"en" | "zh">(() =>
    readStoredJson<"en" | "zh">(LANGUAGE_STORAGE_KEY, "en")
  );

  const [viewportWidth, setViewportWidth] = useState<number>(1200);

  const n8nWebhookUrl =
    "https://n8n.influencerconnectagency.biz/webhook/upload-entry";

  const [folderName, setFolderName] = useState("");
  const [pageName, setPageName] = useState("");


  const [files, setFiles] = useState<UploadableFile[]>([]);
  const [filePreviewUrls, setFilePreviewUrls] = useState<Record<string, string>>({});
  const [txtPreviewSnippets, setTxtPreviewSnippets] = useState<Record<string, string>>({});
  const [editingTxtIndex, setEditingTxtIndex] = useState<number | null>(null);
  const [editingTxtDraft, setEditingTxtDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [longUrl, setLongUrl] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [signUpWallEnabled, setSignUpWallEnabled] = useState(false);
  const [shortUrl, setShortUrl] = useState("");
  const [creatingShortUrl, setCreatingShortUrl] = useState(false);
  const [shortUrlError, setShortUrlError] = useState("");
  const [shortUrlSuccess, setShortUrlSuccess] = useState("");
  const [shortUrlCopied, setShortUrlCopied] = useState(false);
  const [shortsWorkspaces, setShortsWorkspaces] =
    useState<ShortsWorkspaceState[]>(createInitialShortsWorkspaces());
  const [activeShortsWorkspaceId, setActiveShortsWorkspaceId] =
    useState<string>(SHORTS_WORKSPACE_CONFIG[0]?.workspaceId || "workspace-1");
  const [shortsHistory, setShortsHistory] = useState<SavedShortsHistoryEntry[]>([]);
  const [shortLinkHistory, setShortLinkHistory] = useState<ShortLinkHistoryEntry[]>([]);

  const [okurlProjects, setOkurlProjects] = useState<OkurlProjectOption[]>([]);
  const [okurlDomains, setOkurlDomains] = useState<OkurlDomainOption[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedUtmTemplateKey, setSelectedUtmTemplateKey] = useState("");
  const [utmFields, setUtmFields] = useState<UtmBuilderFields>(EMPTY_UTM_FIELDS);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const availableFolders = useMemo(() => {
    if (!currentUser) return [];
    return currentUser.folders ?? [];
  }, [currentUser]);

  const availablePages = useMemo(() => {
    if (!currentUser) return [];
    return [...(currentUser.pages ?? [])].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
  }, [currentUser]);

  const totalSizeMb = useMemo(() => {
    const total = files.reduce((sum, file) => sum + file.size, 0);
    return (total / 1024 / 1024).toFixed(2);
  }, [files]);

  useEffect(() => {
    const nextUrls: Record<string, string> = {};
    const createdUrls: string[] = [];

    files.forEach((file, index) => {
      if (file.type.startsWith("video/") || /\.mp4$/i.test(file.name)) {
        const key = `${file.name}-${file.size}-${file.lastModified}-${index}`;
        const objectUrl = URL.createObjectURL(file);
        nextUrls[key] = objectUrl;
        createdUrls.push(objectUrl);
      }
    });

    setFilePreviewUrls(nextUrls);

    return () => {
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  useEffect(() => {
    let cancelled = false;

    const readTxtPreviews = async () => {
      const entries = await Promise.all(
        files.map(async (file, index) => {
          if (!(file.type.startsWith("text/") || /\.txt$/i.test(file.name))) {
            return null;
          }

          try {
            const content = await file.text();
            const compact = content.replace(/\s+/g, " ").trim();
            return [
              `${file.name}-${file.size}-${file.lastModified}-${index}`,
              compact.slice(0, 80) || "TXT file",
            ] as const;
          } catch {
            return [
              `${file.name}-${file.size}-${file.lastModified}-${index}`,
              "TXT file",
            ] as const;
          }
        })
      );

      if (cancelled) return;
      setTxtPreviewSnippets(
        Object.fromEntries(entries.filter(Boolean) as Array<[string, string]>)
      );
    };

    void readTxtPreviews();

    return () => {
      cancelled = true;
    };
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
    return buildUrlWithUtm(longUrl, utmFields, signUpWallEnabled);
  }, [longUrl, signUpWallEnabled, utmFields]);

  const combinedTxtNotes = useMemo(() => {
    return shortsWorkspaces
      .flatMap((workspace) => workspace.txtDescriptions)
      .map((value) => value.trim())
      .filter(Boolean)
      .join("\n");
  }, [shortsWorkspaces]);

  const mirroredPlatformName = pageName || "";
  const shortsHistoryStorageKey = currentUser
    ? buildShortsHistoryStorageKey(currentUser.username)
    : "";
  const shortLinkHistoryStorageKey = currentUser
    ? buildShortLinkHistoryStorageKey(currentUser.username)
    : "";

  const workspaceUiStorageKey = currentUser
    ? `ucreator-console-workspace-ui:${currentUser.username}`
    : "";
  const activeShortsWorkspace = useMemo(
    () =>
      shortsWorkspaces.find((item) => item.workspaceId === activeShortsWorkspaceId) ??
      shortsWorkspaces[0] ??
      createInitialShortsWorkspaceState("workspace-1", "Workspace 1"),
    [activeShortsWorkspaceId, shortsWorkspaces]
  );
  const activeShortsMonitorRef = useRef<Record<string, string>>({});
  const tx = useCallback((en: string, zh: string) => (lang === "zh" ? zh : en), [lang]);

  const updateShortsWorkspace = useCallback(
    (
      workspaceId: string,
      updater:
        | Partial<ShortsWorkspaceState>
        | ((workspace: ShortsWorkspaceState) => Partial<ShortsWorkspaceState>)
    ) => {
      setShortsWorkspaces((prev) =>
        prev.map((workspace) => {
          if (workspace.workspaceId !== workspaceId) return workspace;
          const patch = typeof updater === "function" ? updater(workspace) : updater;
          return {
            ...workspace,
            ...patch,
          };
        })
      );
    },
    []
  );

  const replaceShortsWorkspace = useCallback(
    (workspaceId: string, nextWorkspace: ShortsWorkspaceState) => {
      setShortsWorkspaces((prev) =>
        prev.map((workspace) =>
          workspace.workspaceId === workspaceId ? nextWorkspace : workspace
        )
      );
    },
    []
  );

  const persistSessionState = useCallback(
    (user: CurrentUser, nextPageName: string, nextFolderName: string) => {
      writeStoredJson(SESSION_STORAGE_KEY, {
        username: user.username,
        pages: user.pages,
        folders: user.folders,
        isDemo: Boolean(user.isDemo),
        pageName: nextPageName,
        folderName: nextFolderName,
      });
    },
    []
  );

  const persistShortsHistoryEntry = useCallback(
    (entry: SavedShortsHistoryEntry) => {
      if (!currentUser || !shortsHistoryStorageKey) return;

      setShortsHistory((prev) => {
        const next = upsertShortsHistoryEntry(prev, entry);
        writeStoredJson(shortsHistoryStorageKey, next);
        return next;
      });
    },
    [currentUser, shortsHistoryStorageKey]
  );


  const persistShortLinkHistoryEntry = useCallback(
    (entry: ShortLinkHistoryEntry) => {
      if (!currentUser || !shortLinkHistoryStorageKey) return;

      setShortLinkHistory((prev) => {
        const deduped = prev.filter(
          (item) => item.shortUrl !== entry.shortUrl && item.originalUrl !== entry.originalUrl
        );
        const next = [entry, ...deduped]
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 5);
        writeStoredJson(shortLinkHistoryStorageKey, next);
        return next;
      });
    },
    [currentUser, shortLinkHistoryStorageKey]
  );

  const hydrateShortsEntry = useCallback(
    (entry: SavedShortsHistoryEntry) => {
      const workspaceId = entry.workspaceId || SHORTS_WORKSPACE_CONFIG[0].workspaceId;
      const config =
        SHORTS_WORKSPACE_CONFIG.find((item) => item.workspaceId === workspaceId) ||
        SHORTS_WORKSPACE_CONFIG[0];

      updateShortsWorkspace(workspaceId, (workspace) => ({
        title: config.title,
        sourceUrl: entry.sourceUrl || "",
        mode: entry.mode || "aiClipping",
        rangeStart: entry.rangeStart || "00:00",
        rangeEnd: entry.rangeEnd || "05:00",
        jobId: entry.jobId || "",
        jobStatus: entry.status || "",
        jobProgress: typeof entry.progress === "number" ? entry.progress : null,
        clips: Array.isArray(entry.clips) ? entry.clips : [],
        selectedShortIds: Array.isArray(entry.selectedShortIds)
          ? entry.selectedShortIds
          : [],
        uploadedClipIds: Array.isArray(entry.uploadedClipIds)
          ? entry.uploadedClipIds
          : [],
        successMessage: entry.successMessage || "",
        errorMessage: entry.errorMessage || "",
        shortsAddedToUploads: false,
        copiedClipActionKey: "",
        isCollapsed: workspace.isCollapsed,
      }));
      setActiveShortsWorkspaceId(workspaceId);
    },
    [updateShortsWorkspace]
  );

  const getShortsRangeSummary = useCallback((rangeStart: string, rangeEnd: string) => {
    const startSec = parseTimecodeToSeconds(rangeStart);
    const endSec = parseTimecodeToSeconds(rangeEnd);

    if (startSec === null && endSec === null) {
      return "Full video";
    }

    if (startSec !== null && endSec !== null && endSec > startSec) {
      return `${formatSecondsAsTimecode(startSec)} - ${formatSecondsAsTimecode(endSec)}`;
    }

    return "Custom range";
  }, []);
  const loadOkurlDomains = useCallback(async () => {
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
      return normalized;
    } catch (err) {
      console.error("Failed to load OKURL domains", err);
      return [] as OkurlDomainOption[];
    }
  }, []);

  const loadOkurlProjects = useCallback(async () => {
    try {
      setProjectsLoading(true);
      setProjectsError("");

      let fallbackDomains = okurlDomains;
      if (!fallbackDomains.length) {
        fallbackDomains = await loadOkurlDomains();
      }

      const matchedDomain =
        fallbackDomains.find(
          (item) => item.domain.trim().toLowerCase() === SHORT_LINK_DOMAIN
        ) ?? null;

      const domainQuery = matchedDomain?.id
        ? `?domain_id=${encodeURIComponent(matchedDomain.id)}`
        : "";

      let res = await fetch(`/api/okurl-projects${domainQuery}`, {
        cache: "no-store",
      });

      if (!res.ok && domainQuery) {
        res = await fetch(`/api/okurl-projects`, {
          cache: "no-store",
        });
      }

      const data = await res.json();
      let templateData: any = null;

      try {
        const templateQuery = matchedDomain?.id
          ? `?domain_id=${encodeURIComponent(matchedDomain.id)}`
          : "";
        let templateRes = await fetch(
          `/api/okurl-utm-templates${templateQuery}`,
          {
            cache: "no-store",
          }
        );

        if (!templateRes.ok && templateQuery) {
          templateRes = await fetch(`/api/okurl-utm-templates`, {
            cache: "no-store",
          });
        }

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

      if (!normalized.length) {
        setProjectsError("No projects loaded.");
      }
    } catch (err) {
      console.error("Failed to load OKURL projects", err);
      setOkurlProjects([]);
      setProjectsError("Failed to load projects.");
    } finally {
      setProjectsLoading(false);
    }
  }, [loadOkurlDomains, okurlDomains]);

  useEffect(() => {
    loadOkurlDomains();
  }, [loadOkurlDomains]);

  useEffect(() => {
    loadOkurlProjects();
  }, [loadOkurlProjects]);

  useEffect(() => {
    const savedSession = readStoredJson<{
      username?: string;
      pages?: string[];
      folders?: string[];
      isDemo?: boolean;
      pageName?: string;
      folderName?: string;
    } | null>(SESSION_STORAGE_KEY, null);

    if (!savedSession?.username || !savedSession.pages?.length || !savedSession.folders?.length) return;

    const sortedPages = [...savedSession.pages].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
    const restoredPage =
      (savedSession.pageName && savedSession.pages.includes(savedSession.pageName)
        ? savedSession.pageName
        : sortedPages[0]) || "";
    const restoredFolder =
      (savedSession.folderName && savedSession.folders.includes(savedSession.folderName)
        ? savedSession.folderName
        : savedSession.folders.find(
            (folder) =>
              folder.trim().toLowerCase() === restoredPage.trim().toLowerCase()
          )) ||
      savedSession.folders[0] ||
      restoredPage;

    setCurrentUser({
      username: savedSession.username,
      pages: savedSession.pages,
      folders: savedSession.folders,
      isDemo: Boolean(savedSession.isDemo),
    });
    setLoginUsername(savedSession.username);
    setFolderName(restoredFolder);
    setPageName(restoredPage);
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setShortsHistory([]);
      setShortLinkHistory([]);
      setShortsWorkspaces(createInitialShortsWorkspaces());
      return;
    }

    const storedShortLinkHistory = readStoredJson<ShortLinkHistoryEntry[]>(
      buildShortLinkHistoryStorageKey(currentUser.username),
      []
    );
    setShortLinkHistory(storedShortLinkHistory);

    const storedHistory = readStoredJson<SavedShortsHistoryEntry[]>(
      buildShortsHistoryStorageKey(currentUser.username),
      []
    );

    setShortsHistory(storedHistory);
    setShortsWorkspaces(() => {
      const next = createInitialShortsWorkspaces();
      for (const workspace of next) {
        const latestEntry = storedHistory.find(
          (entry) => (entry.workspaceId || SHORTS_WORKSPACE_CONFIG[0].workspaceId) === workspace.workspaceId
        );
        if (latestEntry) {
          Object.assign(workspace, {
            sourceUrl: latestEntry.sourceUrl || "",
            mode: latestEntry.mode || "aiClipping",
            rangeStart: latestEntry.rangeStart || "00:00",
            rangeEnd: latestEntry.rangeEnd || "05:00",
            jobId: latestEntry.jobId || "",
            jobStatus: latestEntry.status || "",
            jobProgress:
              typeof latestEntry.progress === "number" ? latestEntry.progress : null,
            clips: Array.isArray(latestEntry.clips) ? latestEntry.clips : [],
            selectedShortIds: Array.isArray(latestEntry.selectedShortIds)
              ? latestEntry.selectedShortIds
              : [],
            uploadedClipIds: Array.isArray(latestEntry.uploadedClipIds)
              ? latestEntry.uploadedClipIds
              : [],
            successMessage: latestEntry.successMessage || "",
            errorMessage: latestEntry.errorMessage || "",
          });
        }
      }
      return next;
    });

    const latestEntry = storedHistory[0];
    if (latestEntry?.workspaceId) {
      setActiveShortsWorkspaceId(latestEntry.workspaceId);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!workspaceUiStorageKey) return;

    const storedUi = readStoredJson<Array<{ workspaceId: string; isCollapsed: boolean }>>(
      workspaceUiStorageKey,
      []
    );

    if (!storedUi.length) {
      setShortsWorkspaces((prev) =>
        prev.map((workspace, index) => ({
          ...workspace,
          isCollapsed: index !== 0,
        }))
      );
      return;
    }

    setShortsWorkspaces((prev) =>
      prev.map((workspace, index) => {
        const saved = storedUi.find((item) => item.workspaceId === workspace.workspaceId);
        return {
          ...workspace,
          isCollapsed:
            typeof saved?.isCollapsed === "boolean" ? saved.isCollapsed : index !== 0,
        };
      })
    );
  }, [workspaceUiStorageKey]);

  useEffect(() => {
    if (!workspaceUiStorageKey || !shortsWorkspaces.length) return;

    writeStoredJson(
      workspaceUiStorageKey,
      shortsWorkspaces.map((workspace) => ({
        workspaceId: workspace.workspaceId,
        isCollapsed: workspace.isCollapsed,
      }))
    );
  }, [shortsWorkspaces, workspaceUiStorageKey]);

  useEffect(() => {
    if (!currentUser) return;
    persistSessionState(currentUser, pageName, folderName || pageName);
  }, [currentUser, folderName, pageName, persistSessionState]);

  useEffect(() => {
    writeStoredJson(LANGUAGE_STORAGE_KEY, lang);
  }, [lang]);

  useEffect(() => {
    if (!submitting) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [submitting]);

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
    setLongUrl("");
    setShortUrl("");
    setCustomSlug("");
    setSignUpWallEnabled(false);
    setShortUrlError("");
    setShortUrlSuccess("");
    setShortUrlCopied(false);
    setShortsWorkspaces(createInitialShortsWorkspaces());
    setActiveShortsWorkspaceId(SHORTS_WORKSPACE_CONFIG[0]?.workspaceId || "workspace-1");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setSuccess("");
    setError("");

    const username = loginUsername.trim().toLowerCase();
    if (!username || !loginPassword) {
      setAuthError("Please enter your username and password.");
      return;
    }

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password: loginPassword }),
      });
      const data = await readResponseData(res);

      if (!res.ok || !data?.user) {
        setAuthError(data?.error || data?.message || "Invalid username or password.");
        return;
      }

      const userPages = Array.isArray(data.user.pages) ? data.user.pages : [];
      const userFolders = Array.isArray(data.user.folders) ? data.user.folders : [];
      const nextUser: CurrentUser = {
        username,
        pages: userPages,
        folders: userFolders,
        isDemo: Boolean(data.user.isDemo),
      };

      const firstPage = [...userPages].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" })
      )[0] ?? "";
      const firstFolder =
        userFolders.find(
          (folder) => folder.trim().toLowerCase() === firstPage.trim().toLowerCase()
        ) ??
        userFolders[0] ??
        firstPage;
      setCurrentUser(nextUser);
      setFolderName(firstFolder);
      setPageName(firstPage);
      persistSessionState(nextUser, firstPage, firstFolder);
      setSignUpWallEnabled(false);
      setShortUrlCopied(false);
      setShortsWorkspaces(createInitialShortsWorkspaces());
      setActiveShortsWorkspaceId(SHORTS_WORKSPACE_CONFIG[0]?.workspaceId || "workspace-1");
      setLoginPassword("");
    } catch (err: any) {
      setAuthError(err?.message || "Unable to sign in right now.");
    }
  };

  const handleLogout = () => {
    if (currentUser) {
      removeStoredJson(`ucreator-console-workspace-ui:${currentUser.username}`);
    }
    removeStoredJson(SESSION_STORAGE_KEY);
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
    setSignUpWallEnabled(false);
    setShortUrlError("");
    setShortUrlSuccess("");
    setShortUrlCopied(false);
    setSelectedProjectId("");
    setSelectedUtmTemplateKey("");
    setUtmFields(EMPTY_UTM_FIELDS);
    setShortsWorkspaces(createInitialShortsWorkspaces());
    setActiveShortsWorkspaceId(SHORTS_WORKSPACE_CONFIG[0]?.workspaceId || "workspace-1");
    setShortsHistory([]);
    setShortLinkHistory([]);
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

  const editTxtFile = async (index: number) => {
    const targetFile = files[index];
    if (!targetFile) return;

    const isTxtFile =
      targetFile.type.startsWith("text/") || /\.txt$/i.test(targetFile.name);
    if (!isTxtFile) return;

    try {
      const currentContent = await targetFile.text();
      setEditingTxtIndex(index);
      setEditingTxtDraft(currentContent.replace(/^﻿/, ""));
    } catch (err) {
      setError(
        lang === "zh" ? "TXT 文件暫時無法編輯，請稍後再試。" : "Unable to edit this TXT file right now."
      );
      setSuccess("");
    }
  };

  const saveEditedTxtFile = () => {
    if (editingTxtIndex === null) return;
    const targetFile = files[editingTxtIndex];
    if (!targetFile) return;

    const updatedFile = new File(["﻿" + editingTxtDraft], targetFile.name, {
      type: "text/plain;charset=utf-8",
      lastModified: Date.now(),
    }) as UploadableFile;

    if (targetFile.originalTitle) {
      updatedFile.originalTitle = targetFile.originalTitle;
    }

    setFiles((prev) =>
      prev.map((file, fileIndex) => (fileIndex === editingTxtIndex ? updatedFile : file))
    );
    setEditingTxtIndex(null);
    setEditingTxtDraft("");
  };

  const cancelEditedTxtFile = () => {
    setEditingTxtIndex(null);
    setEditingTxtDraft("");
  };

  const handlePageChange = (value: string) => {
    setPageName(value);
    const linkedFolder =
      availableFolders.find(
        (folder) => folder.trim().toLowerCase() === value.trim().toLowerCase()
      ) ?? value;
    setFolderName(linkedFolder);

    if (currentUser) {
      persistSessionState(currentUser, value, linkedFolder);
    }
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

  const applyShortsRangePreset = (workspaceId: string, start: string, end: string) => {
    updateShortsWorkspace(workspaceId, (workspace) => ({
      mode: !start && !end && workspace.mode === "manualSelected" ? "aiClipping" : workspace.mode,
      rangeStart: start,
      rangeEnd: end,
      errorMessage: "",
      successMessage: "",
    }));
    setActiveShortsWorkspaceId(workspaceId);
  };

  const fetchShortsResultsForJob = useCallback(async (jobId: string) => {
    let clips: ShortsClipOption[] = [];
    let lastResultsError = "";

    for (
      let resultsAttempt = 0;
      resultsAttempt < SHORTSGEN_RESULTS_MAX_RETRIES;
      resultsAttempt += 1
    ) {
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

      clips = Array.isArray(resultsData?.clips) ? resultsData.clips : [];

      if (clips.length) {
        return clips;
      }

      lastResultsError =
        resultsData?.error ||
        resultsData?.message ||
        "ShortsGen completed, but no clips were returned.";

      if (resultsAttempt < SHORTSGEN_RESULTS_MAX_RETRIES - 1) {
        await sleep(SHORTSGEN_RESULTS_RETRY_DELAY_MS);
      }
    }

    throw new Error(lastResultsError || "ShortsGen completed, but no clips were returned.");
  }, []);

  const monitorShortsJob = useCallback(
    async ({
      workspaceId,
      jobId,
      sourceUrl,
      mode,
      rangeStart,
      rangeEnd,
      createdAt,
    }: {
      workspaceId: string;
      jobId: string;
      sourceUrl: string;
      mode: ShortsGenerationMode;
      rangeStart: string;
      rangeEnd: string;
      createdAt: number;
    }) => {
      if (!jobId) return;
      if (activeShortsMonitorRef.current[workspaceId] === jobId) return;

      activeShortsMonitorRef.current[workspaceId] = jobId;
      const hasRangeInput = Boolean(rangeStart.trim()) || Boolean(rangeEnd.trim());
      const isFullVideoAiClipping = mode === "aiClipping" && !hasRangeInput;
      const maxPollAttempts = isFullVideoAiClipping
        ? SHORTSGEN_FULL_VIDEO_MAX_POLL_ATTEMPTS
        : SHORTSGEN_MAX_POLL_ATTEMPTS;

      try {
        updateShortsWorkspace(workspaceId, {
          generatingShorts: true,
          errorMessage: "",
        });
        let finalStatus = "";
        let latestProgress: number | null = null;
        let failedStatusGraceCount = 0;

        for (let attempt = 0; attempt < maxPollAttempts; attempt += 1) {
          let statusRes: Response | null = null;
          let statusData: any = null;
          let lastStatusError = "";

          for (let statusAttempt = 0; statusAttempt < SHORTSGEN_STATUS_FETCH_MAX_RETRIES; statusAttempt += 1) {
            try {
              statusRes = await fetch(`/api/shortsgen/jobs/${encodeURIComponent(jobId)}`, {
                cache: "no-store",
              });
              statusData = await readResponseData(statusRes);

              if (statusRes.ok) {
                break;
              }

              lastStatusError =
                statusData?.error ||
                statusData?.message ||
                "Failed to check ShortsGen job status.";
            } catch (statusError: any) {
              lastStatusError = statusError?.message || "Failed to check ShortsGen job status.";
            }

            if (statusAttempt < SHORTSGEN_STATUS_FETCH_MAX_RETRIES - 1) {
              await sleep(1200 * (statusAttempt + 1));
            }
          }

          if (!statusRes || !statusRes.ok) {
            if (isRetryableShortsMessage(lastStatusError) && attempt < maxPollAttempts - 1) {
              await sleep(getPollDelayMs(attempt));
              continue;
            }
            throw new Error(lastStatusError || "Failed to check ShortsGen job status.");
          }

          finalStatus = pickFirstString(statusData?.status).toUpperCase();
          const explicitProgressRaw =
            typeof statusData?.progress === "number" ||
            typeof statusData?.progress === "string"
              ? Number(statusData.progress)
              : null;
          latestProgress =
            explicitProgressRaw !== null && Number.isFinite(explicitProgressRaw)
              ? Math.max(0, Math.min(100, Math.round(explicitProgressRaw)))
              : null;

          updateShortsWorkspace(workspaceId, {
            jobId,
            jobStatus: finalStatus,
            jobProgress: latestProgress,
            generatingShorts: finalStatus !== "COMPLETED" && finalStatus !== "FAILED",
          });

          persistShortsHistoryEntry({
            workspaceId,
            jobId,
            sourceUrl,
            mode,
            rangeStart,
            rangeEnd,
            status: finalStatus || "IN_PROGRESS",
            progress: latestProgress,
            clips: [],
            selectedShortIds: [],
            uploadedClipIds: [],
            createdAt,
            updatedAt: Date.now(),
            successMessage: "",
            errorMessage: "",
          });

          if (finalStatus === "COMPLETED") {
            updateShortsWorkspace(workspaceId, {
              jobProgress: 100,
            });
            break;
          }

          if (finalStatus === "FAILED") {
            const failedMessage =
              statusData?.error ||
              statusData?.message ||
              statusData?.upstream?.message ||
              "";
            const softFailed = isSoftFailedShortsStatus(finalStatus, failedMessage);

            for (let confirmAttempt = 0; confirmAttempt < SHORTSGEN_FAILED_CONFIRMATION_CHECKS; confirmAttempt += 1) {
              await sleep(SHORTSGEN_FAILED_CONFIRMATION_DELAY_MS);
              try {
                const confirmRes = await fetch(`/api/shortsgen/jobs/${encodeURIComponent(jobId)}`, {
                  cache: "no-store",
                });
                const confirmData = await readResponseData(confirmRes);
                if (!confirmRes.ok) {
                  continue;
                }
                const confirmStatus = pickFirstString(confirmData?.status).toUpperCase();
                const confirmProgressRaw =
                  typeof confirmData?.progress === "number" || typeof confirmData?.progress === "string"
                    ? Number(confirmData.progress)
                    : null;
                const confirmProgress =
                  confirmProgressRaw !== null && Number.isFinite(confirmProgressRaw)
                    ? Math.max(0, Math.min(100, Math.round(confirmProgressRaw)))
                    : latestProgress;

                if (confirmStatus === "COMPLETED") {
                  finalStatus = "COMPLETED";
                  latestProgress = 100;
                  updateShortsWorkspace(workspaceId, {
                    jobStatus: "COMPLETED",
                    jobProgress: 100,
                    generatingShorts: false,
                    errorMessage: "",
                  });
                  break;
                }

                if (confirmStatus && confirmStatus !== "FAILED") {
                  finalStatus = confirmStatus;
                  latestProgress = confirmProgress;
                  updateShortsWorkspace(workspaceId, {
                    jobStatus: confirmStatus,
                    jobProgress: confirmProgress,
                    generatingShorts: true,
                    errorMessage: "",
                  });
                  break;
                }
              } catch {
                // ignore and keep confirming
              }
            }

            if (finalStatus === "COMPLETED") {
              break;
            }

            if (finalStatus !== "FAILED") {
              await sleep(getPollDelayMs(attempt));
              continue;
            }

            const allowGracePolling =
              failedStatusGraceCount < SHORTSGEN_FAILED_STATUS_GRACE_POLLS && softFailed;

            if (allowGracePolling) {
              failedStatusGraceCount += 1;
              updateShortsWorkspace(workspaceId, {
                jobStatus: "IN_PROGRESS",
                generatingShorts: true,
                errorMessage: "",
              });
              await sleep(getPollDelayMs(attempt));
              continue;
            }

            throw new Error(failedMessage || "Shorts generation failed.");
          }

          await sleep(getPollDelayMs(attempt));
        }

        if (finalStatus !== "COMPLETED") {
          throw new Error(
            isFullVideoAiClipping
              ? "ShortsGen is still processing this full video on the upstream server. Full-video jobs can take a long time. Please wait a bit longer or use First 2 / 3 / 5 min for faster results."
              : "ShortsGen is still processing this job. Please wait a little longer, then use Reload to continue checking."
          );
        }

        const clips = await fetchShortsResultsForJob(jobId);
        const preselectedIds = clips.slice(0, Math.min(3, clips.length)).map((clip) => clip.id);
        updateShortsWorkspace(workspaceId, {
          clips: clips.slice(0, Math.min(2, clips.length)),
          jobProgress: 100,
          jobStatus: "COMPLETED",
          generatingShorts: false,
          errorMessage: "",
        });
        window.setTimeout(() => {
          updateShortsWorkspace(workspaceId, {
            clips,
            selectedShortIds: preselectedIds,
            successMessage:
              `${clips.length} short(s) are ready. The strongest clips are pre-selected so you can download them or add them to the upload list.`,
          });
        }, 80);

        persistShortsHistoryEntry({
          workspaceId,
          jobId,
          sourceUrl,
          mode,
          rangeStart,
          rangeEnd,
          status: "COMPLETED",
          progress: 100,
          clips,
          selectedShortIds: preselectedIds,
          uploadedClipIds: [],
          createdAt,
          updatedAt: Date.now(),
          successMessage:
            `${clips.length} short(s) are ready. The strongest clips are pre-selected so you can download them or add them to the upload list.`,
          errorMessage: "",
        });
      } catch (err: any) {
        const message = err?.message || "Failed to prepare the shorts preview.";
        updateShortsWorkspace(workspaceId, (workspace) => ({
          generatingShorts: false,
          errorMessage: message,
          successMessage: "",
          jobStatus: workspace.jobStatus || "FAILED",
        }));

        persistShortsHistoryEntry({
          workspaceId,
          jobId,
          sourceUrl,
          mode,
          rangeStart,
          rangeEnd,
          status: "FAILED",
          progress: null,
          clips: [],
          selectedShortIds: [],
          uploadedClipIds: [],
          createdAt,
          updatedAt: Date.now(),
          successMessage: "",
          errorMessage: message,
        });
      } finally {
        if (activeShortsMonitorRef.current[workspaceId] === jobId) {
          delete activeShortsMonitorRef.current[workspaceId];
        }
        updateShortsWorkspace(workspaceId, {
          generatingShorts: false,
        });
      }
    },
    [fetchShortsResultsForJob, persistShortsHistoryEntry, updateShortsWorkspace]
  );

  useEffect(() => {
    if (!currentUser || !shortsHistory.length) return;

    const pendingEntries = shortsHistory.filter(
      (entry) => !isTerminalShortsStatus(entry.status) && entry.jobId
    );

    pendingEntries.forEach((entry) => {
      monitorShortsJob({
        workspaceId: entry.workspaceId || SHORTS_WORKSPACE_CONFIG[0].workspaceId,
        jobId: entry.jobId,
        sourceUrl: entry.sourceUrl,
        mode: entry.mode,
        rangeStart: entry.rangeStart,
        rangeEnd: entry.rangeEnd,
        createdAt: entry.createdAt || Date.now(),
      });
    });
  }, [currentUser, monitorShortsJob, shortsHistory]);

  const restoreShortsHistoryEntry = async (entry: SavedShortsHistoryEntry) => {
    hydrateShortsEntry(entry);

    if (!entry.jobId) return;

    if (String(entry.status || "").toUpperCase() === "COMPLETED") {
      if (Array.isArray(entry.clips) && entry.clips.length) return;

      try {
        const clips = await fetchShortsResultsForJob(entry.jobId);
        const preselectedIds = clips.slice(0, Math.min(3, clips.length)).map((clip) => clip.id);
        updateShortsWorkspace(entry.workspaceId || SHORTS_WORKSPACE_CONFIG[0].workspaceId, {
          clips,
          selectedShortIds: preselectedIds,
          uploadedClipIds: Array.isArray(entry.uploadedClipIds) ? entry.uploadedClipIds : [],
          jobStatus: "COMPLETED",
          jobProgress: 100,
          successMessage: tx(
            `${clips.length} short(s) restored from history.`,
            `已從歷史恢復 ${clips.length} 個 shorts。`
          ),
          errorMessage: "",
        });

        persistShortsHistoryEntry({
          ...entry,
          status: "COMPLETED",
          progress: 100,
          clips,
          selectedShortIds: preselectedIds,
          updatedAt: Date.now(),
        });
      } catch (err: any) {
        updateShortsWorkspace(entry.workspaceId || SHORTS_WORKSPACE_CONFIG[0].workspaceId, {
          errorMessage: err?.message || tx("Failed to restore the clip history.", "恢復 clips 歷史失敗。"),
        });
      }
      return;
    }

    monitorShortsJob({
      workspaceId: entry.workspaceId || SHORTS_WORKSPACE_CONFIG[0].workspaceId,
      jobId: entry.jobId,
      sourceUrl: entry.sourceUrl,
      mode: entry.mode,
      rangeStart: entry.rangeStart,
      rangeEnd: entry.rangeEnd,
      createdAt: entry.createdAt || Date.now(),
    });
  };

  const reloadShortsHistoryEntry = (entry: SavedShortsHistoryEntry) => {
    hydrateShortsEntry(entry);

    if (!entry.jobId) return;

    monitorShortsJob({
      workspaceId: entry.workspaceId || SHORTS_WORKSPACE_CONFIG[0].workspaceId,
      jobId: entry.jobId,
      sourceUrl: entry.sourceUrl,
      mode: entry.mode,
      rangeStart: entry.rangeStart,
      rangeEnd: entry.rangeEnd,
      createdAt: entry.createdAt || Date.now(),
    });
  };

  const generateShorts = async (workspaceId: string) => {
    const workspace = shortsWorkspaces.find((item) => item.workspaceId === workspaceId);
    if (!workspace) return;

    setActiveShortsWorkspaceId(workspaceId);
    updateShortsWorkspace(workspaceId, {
      errorMessage: "",
      successMessage: "",
      uploadedClipIds: [],
      shortsAddedToUploads: false,
    });

    if (!workspace.sourceUrl.trim()) {
      updateShortsWorkspace(workspaceId, {
        errorMessage: "Please enter the long-video URL first.",
      });
      return;
    }

    const startSec = parseTimecodeToSeconds(workspace.rangeStart);
    const endSec = parseTimecodeToSeconds(workspace.rangeEnd);
    const hasRangeInput =
      Boolean(workspace.rangeStart.trim()) || Boolean(workspace.rangeEnd.trim());

    if (hasRangeInput && (startSec === null || endSec === null)) {
      updateShortsWorkspace(workspaceId, {
        errorMessage: "Please enter a valid start and end time like 00:00 or 05:30.",
      });
      return;
    }

    if (startSec !== null && endSec !== null && endSec <= startSec) {
      updateShortsWorkspace(workspaceId, {
        errorMessage: "The end time must be later than the start time.",
      });
      return;
    }

    if (workspace.mode === "manualSelected" && !hasRangeInput) {
      updateShortsWorkspace(workspaceId, {
        errorMessage: "Manual Selection needs a start and end time range.",
      });
      return;
    }

    const shortsOptions =
      workspace.mode === "manualSelected"
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
      updateShortsWorkspace(workspaceId, {
        generatingShorts: true,
        clips: [],
        selectedShortIds: [],
        uploadedClipIds: [],
        jobId: "",
        jobStatus: "",
        jobProgress: null,
        errorMessage: "",
        successMessage: "",
      });

      let createData: any = null;
      let jobId = "";

      for (let createAttempt = 0; createAttempt < SHORTSGEN_CREATE_MAX_RETRIES; createAttempt += 1) {
        const createRes = await fetch("/api/shortsgen/jobs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source_url: workspace.sourceUrl.trim(),
            options: shortsOptions,
          }),
        });

        createData = await readResponseData(createRes);

        if (createRes.ok) {
          jobId = pickFirstString(createData?.id, createData?.job_id);
          if (jobId) {
            break;
          }
        }

        const createMessage =
          createData?.error ||
          createData?.message ||
          "Failed to submit the ShortsGen job.";

        if (createAttempt < SHORTSGEN_CREATE_MAX_RETRIES - 1 && isRetryableShortsMessage(createMessage)) {
          await sleep(1800);
          continue;
        }

        throw new Error(createMessage || "ShortsGen did not return a job ID.");
      }

      if (!jobId) {
        throw new Error("ShortsGen did not return a job ID.");
      }

      const createdAt = Date.now();
      updateShortsWorkspace(workspaceId, {
        jobId,
        jobStatus: "SCHEDULED",
        jobProgress: 0,
      });

      persistShortsHistoryEntry({
        workspaceId,
        jobId,
        sourceUrl: workspace.sourceUrl.trim(),
        mode: workspace.mode,
        rangeStart: workspace.rangeStart,
        rangeEnd: workspace.rangeEnd,
        status: "SCHEDULED",
        progress: 0,
        clips: [],
        selectedShortIds: [],
        uploadedClipIds: [],
        createdAt,
        updatedAt: createdAt,
        successMessage: "",
        errorMessage: "",
      });

      await monitorShortsJob({
        workspaceId,
        jobId,
        sourceUrl: workspace.sourceUrl.trim(),
        mode: workspace.mode,
        rangeStart: workspace.rangeStart,
        rangeEnd: workspace.rangeEnd,
        createdAt,
      });
    } catch (err: any) {
      updateShortsWorkspace(workspaceId, {
        errorMessage: err?.message || "Failed to prepare the shorts preview.",
        generatingShorts: false,
      });
    }
  };

  const toggleShortSelection = (workspaceId: string, clipId: string) => {
    setActiveShortsWorkspaceId(workspaceId);
    updateShortsWorkspace(workspaceId, (workspace) => ({
      selectedShortIds: workspace.selectedShortIds.includes(clipId)
        ? workspace.selectedShortIds.filter((id) => id !== clipId)
        : [...workspace.selectedShortIds, clipId],
    }));
  };

  const copyClipText = async (
    workspaceId: string,
    clipId: string,
    title: string,
    description: string
  ) => {
    const combined = [title.trim(), description.trim()].filter(Boolean).join("\n");

    if (!combined) {
      updateShortsWorkspace(workspaceId, {
        errorMessage: "No title or description is available to copy.",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(combined);
      const actionKey = `${clipId}:combined`;
      updateShortsWorkspace(workspaceId, {
        errorMessage: "",
        copiedClipActionKey: actionKey,
      });
      window.setTimeout(() => {
        updateShortsWorkspace(workspaceId, (workspace) => ({
          copiedClipActionKey:
            workspace.copiedClipActionKey === actionKey ? "" : workspace.copiedClipActionKey,
        }));
      }, 1600);
    } catch {
      updateShortsWorkspace(workspaceId, {
        errorMessage: "Failed to copy title and description.",
      });
    }
  };

  const buildViralClipText = useCallback(
    (clip: ShortsClipOption) => {
      const hasChinese = /[㐀-鿿]/.test(`${clip.title} ${clip.description}`);
      const rawTitle = clip.title.trim() || (hasChinese ? "這段內容值得看完" : "This clip is worth watching");
      const rawDescription = clip.description.trim();
      const normalizeSnippet = (value: string, limit: number) => {
        const compact = value.replace(/\s+/g, " ").trim();
        if (!compact) return "";
        return compact.length > limit ? `${compact.slice(0, limit).trim()}…` : compact;
      };
      const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

      if (hasChinese) {
        const titleCore = normalizeSnippet(rawTitle.replace(/[！!？?]+$/g, ""), 24) || "這段內容的核心重點";
        const descCore = normalizeSnippet(rawDescription, 38);
        const angles = [
          `${titleCore}，這支短片直接把重點講清楚`,
          `想快速弄懂${titleCore}，看這支短片就夠了`,
          `${titleCore}最值得注意的地方，這裡說得很明白`,
          `這支短片把${titleCore}的核心直接講出來了`,
          `關於${titleCore}，這段內容是最容易看懂的一版`,
          `${titleCore}到底在講什麼，這支短片直接進入主題`,
        ];
        const supports = descCore
          ? [
              `最有價值的是，它把「${descCore}」這件事說得很清楚。`,
              `裡面直接抓住「${descCore}」這個關鍵，所以特別值得看。`,
              `它沒有繞圈子，而是直接把「${descCore}」講到重點。`,
            ]
          : [
              "整段節奏很順，開頭就直接進入重點。",
              "內容不空泛，幾句話就把核心交代清楚了。",
              "如果你想快速掌握主題，這支短片很適合先看。",
            ];
        const closers = [
          "看完會更容易抓到整件事的關鍵。",
          "這類內容最怕講不清楚，但這支短片做到了。",
          "難得的是，它不誇張，卻很容易讓人想看下去。",
          "如果你正在找重點版，這支短片會很適合。",
        ];
        const variants = [
          `${pick(angles)}。${pick(supports)}`,
          `${pick(angles)}，${pick(closers)}`,
          `${pick(supports)}${pick(closers)}`,
          `${pick(angles)}。${pick(closers)}`,
        ];
        return pick(variants);
      }

      const titleCore = normalizeSnippet(rawTitle.replace(/[!?]+$/g, ""), 48) || "this topic";
      const descCore = normalizeSnippet(rawDescription, 84);
      const hooks = [
        `${titleCore} is explained here in a way that is actually easy to follow`,
        `This clip gets straight to the main point about ${titleCore}`,
        `If you want the clearest short take on ${titleCore}, start with this clip`,
        `What makes ${titleCore} interesting is exactly what this clip focuses on`,
        `This breakdown of ${titleCore} feels direct, clear, and worth watching through`,
      ];
      const details = descCore
        ? [
            `The best part is how clearly it frames this point: ${descCore}`,
            `It works because it gets right to the core: ${descCore}`,
            `Instead of dragging it out, it explains the key point fast: ${descCore}`,
          ]
        : [
            "It feels clear, direct, and easy to stay with.",
            "It gets to the point quickly without sounding forced.",
            "The pacing is clean, so the point lands fast.",
          ];
      const endings = [
        "It is the kind of clip that makes people stop and keep watching.",
        "If you want the quick version without losing the point, this is a strong one.",
        "This one is easy to click into because the point is clear right away.",
      ];
      const variants = [
        `${pick(hooks)}. ${pick(details)}`,
        `${pick(hooks)}. ${pick(endings)}`,
        `${pick(details)} ${pick(endings)}`,
        `${pick(hooks)} — ${pick(endings)}`,
      ];
      return pick(variants);
    },
    []
  );

  const generateViralClipText = useCallback(
    async (workspaceId: string, clipId: string) => {
      const workspace = shortsWorkspaces.find((item) => item.workspaceId === workspaceId);
      if (!workspace) return;
      const clip = workspace.clips.find((item) => item.id === clipId);
      if (!clip) return;

      const generatedText = buildViralClipText(clip);
      const firstEmptyIndex = workspace.txtDescriptions.findIndex((value) => !value.trim());
      const targetIndex = firstEmptyIndex >= 0 ? firstEmptyIndex : 0;

      updateShortsWorkspace(workspaceId, (currentWorkspace) => ({
        txtDescriptions: currentWorkspace.txtDescriptions.map((value, index) =>
          index === targetIndex ? generatedText : value
        ),
        copiedClipActionKey: `${clipId}:viral`,
        successMessage: tx(
          `Viral copy added to TXT Description ${targetIndex + 1}.`,
          `已將爆款文案加入文本描述 ${targetIndex + 1}。`
        ),
        errorMessage: "",
      }));

      try {
        await navigator.clipboard.writeText(generatedText);
      } catch {
        // no-op
      }

      window.setTimeout(() => {
        updateShortsWorkspace(workspaceId, (currentWorkspace) => ({
          copiedClipActionKey:
            currentWorkspace.copiedClipActionKey === `${clipId}:viral`
              ? ""
              : currentWorkspace.copiedClipActionKey,
        }));
      }, 1800);
    },
    [buildViralClipText, shortsWorkspaces, tx]
  );

  const downloadSelectedShorts = async (workspaceId: string) => {
    const workspace = shortsWorkspaces.find((item) => item.workspaceId === workspaceId);
    if (!workspace) return;

    updateShortsWorkspace(workspaceId, {
      errorMessage: "",
      successMessage: "",
    });

    if (!workspace.selectedShortIds.length) {
      updateShortsWorkspace(workspaceId, {
        errorMessage: "Please select at least one short clip first.",
      });
      return;
    }

    try {
      updateShortsWorkspace(workspaceId, {
        downloadingShorts: true,
      });

      const selectedClips = workspace.clips.filter((clip) =>
        workspace.selectedShortIds.includes(clip.id)
      );
      const archive = selectedClips.length > 1;

      if (!archive && selectedClips[0]?.downloadUrl) {
        const anchor = document.createElement("a");
        anchor.href = selectedClips[0].downloadUrl;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        updateShortsWorkspace(workspaceId, {
          successMessage: "Short download started.",
        });
        return;
      }

      const res = await fetch("/api/shortsgen/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          archive,
          files: selectedClips.map((clip, index) => ({
            url: clip.downloadUrl,
            fileName: buildSequentialFileName(index, "mp4"),
          })),
        }),
      });

      if (!res.ok) {
        const data = await readResponseData(res);
        throw new Error(
          data?.error || data?.message || "Failed to download the selected shorts."
        );
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const fileName =
        readDownloadFileName(res.headers.get("content-disposition")) ||
        (archive ? "selected-shorts.zip" : buildSequentialFileName(0, "mp4"));

      anchor.href = objectUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);

      updateShortsWorkspace(workspaceId, {
        successMessage: archive
          ? `${selectedClips.length} short(s) were bundled into one download.`
          : "Short download started.",
      });
    } catch (err: any) {
      updateShortsWorkspace(workspaceId, {
        errorMessage: err?.message || "Failed to download the selected shorts.",
      });
    } finally {
      updateShortsWorkspace(workspaceId, {
        downloadingShorts: false,
      });
    }
  };

  const clearWorkspaceHistory = useCallback(
    (workspaceId: string) => {
      if (!shortsHistoryStorageKey) return;
      setShortsHistory((prev) => {
        const next = prev.filter((entry) =>
          (entry.workspaceId || SHORTS_WORKSPACE_CONFIG[0].workspaceId) !== workspaceId
        );
        writeStoredJson(shortsHistoryStorageKey, next);
        return next;
      });
    },
    [shortsHistoryStorageKey]
  );

  const finishShortsWorkspace = useCallback(
    (workspaceId: string) => {
      const config =
        SHORTS_WORKSPACE_CONFIG.find((item) => item.workspaceId === workspaceId) ||
        SHORTS_WORKSPACE_CONFIG[0];
      updateShortsWorkspace(workspaceId, (workspace) => ({
        ...createInitialShortsWorkspaceState(workspaceId, config.title),
        isCollapsed: workspace.isCollapsed,
      }));
      if (activeShortsMonitorRef.current[workspaceId]) {
        delete activeShortsMonitorRef.current[workspaceId];
      }
      clearWorkspaceHistory(workspaceId);
    },
    [clearWorkspaceHistory, updateShortsWorkspace]
  );

  const addSelectedShortsToUploadList = async (workspaceId: string) => {
    const workspace = shortsWorkspaces.find((item) => item.workspaceId === workspaceId);
    if (!workspace) return;

    updateShortsWorkspace(workspaceId, {
      errorMessage: "",
      successMessage: "",
      shortsAddedToUploads: false,
    });

    if (!workspace.selectedShortIds.length) {
      updateShortsWorkspace(workspaceId, {
        errorMessage: "Please select at least one short clip first.",
      });
      return;
    }

    try {
      updateShortsWorkspace(workspaceId, {
        addingShortsToUploads: true,
      });

      const selectedClips = workspace.clips.filter((clip) =>
        workspace.selectedShortIds.includes(clip.id)
      );

      const fetchedFiles = await Promise.all(
        selectedClips.map(async (clip, index) => {
          let blob: Blob | null = null;

          try {
            const directRes = await fetch(clip.downloadUrl, {
              cache: "force-cache",
            });
            if (directRes.ok) {
              blob = await directRes.blob();
            }
          } catch {
            blob = null;
          }

          if (!blob) {
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

            blob = await res.blob();
          }
          const fileName = buildSequentialFileName(index, "mp4");
          const generatedFile = new File([blob], fileName, {
            type: blob.type || "video/mp4",
            lastModified: Date.now(),
          }) as UploadableFile;
          generatedFile.originalTitle = clip.title;

          return generatedFile;
        })
      );

      setFiles((prev) => appendGeneratedFiles(prev, fetchedFiles, "mp4"));

      const uploadedIds = [...workspace.selectedShortIds];

      updateShortsWorkspace(workspaceId, (currentWorkspace) => ({
        shortsAddedToUploads: true,
        clips: currentWorkspace.clips,
        selectedShortIds: [],
        uploadedClipIds: Array.from(
          new Set([...currentWorkspace.uploadedClipIds, ...uploadedIds])
        ),
        successMessage: uploadedIds.length
          ? tx(
              `${uploadedIds.length} short(s) moved to Upload files. Preview clips stay here until you start automation or finish the workspace.`,
              `已將 ${uploadedIds.length} 個 shorts 加入 Upload files。預覽 clips 會保留在這裡，直到你點 Start automation 或 Finish。`
            )
          : currentWorkspace.successMessage,
      }));
      window.setTimeout(() => {
        updateShortsWorkspace(workspaceId, {
          shortsAddedToUploads: false,
        });
      }, 1600);

      persistShortsHistoryEntry({
        workspaceId,
        jobId: workspace.jobId,
        sourceUrl: workspace.sourceUrl,
        mode: workspace.mode,
        rangeStart: workspace.rangeStart,
        rangeEnd: workspace.rangeEnd,
        status: workspace.jobStatus,
        progress: workspace.jobProgress,
        clips: workspace.clips,
        selectedShortIds: [],
        uploadedClipIds: Array.from(new Set([...(workspace.uploadedClipIds || []), ...uploadedIds])),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        successMessage: uploadedIds.length
          ? tx(
              `${uploadedIds.length} short(s) moved to Upload files. Preview clips stay here until you start automation or finish the workspace.`,
              `已將 ${uploadedIds.length} 個 shorts 加入 Upload files。預覽 clips 會保留在這裡，直到你點 Start automation 或 Finish。`
            )
          : workspace.successMessage,
        errorMessage: workspace.errorMessage,
      });
    } catch (err: any) {
      updateShortsWorkspace(workspaceId, {
        errorMessage: err?.message || "Failed to add selected shorts to the upload list.",
      });
    } finally {
      updateShortsWorkspace(workspaceId, {
        addingShortsToUploads: false,
      });
    }
  };

  const toggleShortsWorkspaceCollapse = (workspaceId: string) => {
    updateShortsWorkspace(workspaceId, (workspace) => ({
      isCollapsed: !workspace.isCollapsed,
    }));
  };

  const addGeneratedTxtsToUploadList = (workspaceId: string) => {
    setError("");
    setSuccess("");

    const workspace = shortsWorkspaces.find((item) => item.workspaceId === workspaceId);
    if (!workspace) return;

    const populatedEntries = workspace.txtDescriptions
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
      updateShortsWorkspace(workspaceId, {
        addingTxtsToUploads: true,
        txtsAddedToUploads: false,
      });

      const generatedTxtFiles = populatedEntries.map(
        (entry) =>
          new File(["﻿" + entry.content], entry.fileName, {
            type: "text/plain;charset=utf-8",
            lastModified: Date.now(),
          })
      );

      setFiles((prev) => appendGeneratedFiles(prev, generatedTxtFiles, "txt"));

      updateShortsWorkspace(workspaceId, {
        txtDescriptions: Array.from({ length: TXT_BOX_COUNT }, () => ""),
        txtsAddedToUploads: true,
      });
      window.setTimeout(() => {
        updateShortsWorkspace(workspaceId, {
          txtsAddedToUploads: false,
        });
      }, 1600);
    } finally {
      updateShortsWorkspace(workspaceId, {
        addingTxtsToUploads: false,
      });
    }
  };

  const updateTxtDescription = (workspaceId: string, index: number, value: string) => {
    updateShortsWorkspace(workspaceId, (workspace) => ({
      txtDescriptions: workspace.txtDescriptions.map((item, itemIndex) =>
        itemIndex === index ? value : item
      ),
    }));
  };

  const downloadTxt = (workspaceId: string) => {
    const workspace = shortsWorkspaces.find((item) => item.workspaceId === workspaceId);
    if (!workspace) return;

    const populatedEntries = workspace.txtDescriptions
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
      const blob = new Blob(["﻿" + entry.content], {
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

      const normalizedShortUrl = normalizeShortUrlToDomain(generatedShortUrl, SHORT_LINK_DOMAIN);
      setShortUrl(normalizedShortUrl);
      setShortUrlCopied(false);
      setShortUrlSuccess("Short URL generated successfully with gjw.us.");

      persistShortLinkHistoryEntry({
        originalUrl: longUrl.trim(),
        shortUrl: normalizedShortUrl,
        projectName: selectedProject?.name || "",
        createdAt: Date.now(),
      });
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
      setShortUrlError("");
      setShortUrlCopied(true);
      window.setTimeout(() => {
        setShortUrlCopied(false);
      }, 1600);
    } catch {
      setShortUrlError("Copy failed.");
    }
  };

  const clearSubmittedShortsWorkspaces = useCallback(() => {
    setShortsWorkspaces((prev) =>
      prev.map((workspace) => {
        if (!workspace.uploadedClipIds.length) return workspace;
        const config =
          SHORTS_WORKSPACE_CONFIG.find((item) => item.workspaceId === workspace.workspaceId) ||
          SHORTS_WORKSPACE_CONFIG[0];
        return {
          ...createInitialShortsWorkspaceState(workspace.workspaceId, config.title),
          isCollapsed: workspace.isCollapsed,
        };
      })
    );
  }, []);

  const submitToN8n = async () => {
    setSuccess("");
    setError("");

    if (!currentUser) {
      setError("Please sign in first.");
      return;
    }

    if (currentUser.isDemo) {
      setError(
        "The demo account is view-only. Please use a real account to start automation."
      );
      return;
    }

    const effectiveFolderName = folderName || pageName;

    if (!pageName || !effectiveFolderName) {
      setError("Please choose a Facebook Page.");
      return;
    }

    if (!files.length) {
      setError("Please upload at least one file.");
      return;
    }

    try {
      setSubmitting(true);
      setSuccess(
        tx(
          "Starting automation... Please keep this page open until Upload successful appears.",
          "正在開始自動化……請保持此頁面開啟，直到出現上傳成功提示。"
        )
      );

      const formData = new FormData();
      formData.append("username", currentUser.username);
      formData.append("page_name", pageName);
      formData.append("folder_name", effectiveFolderName);
      formData.append("facebook_page", pageName);
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

      setFiles([]);
      setLongUrl("");
      setShortUrl("");
      setCustomSlug("");
      setSignUpWallEnabled(false);
      setShortUrlError("");
      setShortUrlSuccess("");
      setShortUrlCopied(false);
      clearSubmittedShortsWorkspaces();
      setSuccess(
        data?.message ||
          tx(
            "Automation started successfully. Uploaded workspaces have been cleared for the next long-video URL.",
            "自動化已成功啟動。已上傳的工作區已清空，可開始下一個 long-video URL。"
          )
      );
      setError("");
    } catch (err: any) {
      setError(err?.message || "Failed to start automation.");
      setSuccess("");
    } finally {
      setSubmitting(false);
    }
  };

  const isMobile = viewportWidth <= MOBILE_BREAKPOINT;
  const isTablet = viewportWidth <= TABLET_BREAKPOINT;

  const shellStyle = isTablet
    ? { ...styles.shell, gridTemplateColumns: "1fr", minHeight: "auto" }
    : styles.shell;
  const sidebarStyle = isTablet
    ? {
        ...styles.sidebar,
        padding: isMobile ? 16 : 18,
        borderRight: "none",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        gap: isMobile ? 12 : 14,
      }
    : styles.sidebar;
  const navCardStyle = isMobile ? { ...styles.navCard, display: "none" } : styles.navCard;
  const mainAreaStyle = isMobile
    ? { ...styles.mainArea, padding: 14, gap: 16 }
    : isTablet
    ? { ...styles.mainArea, padding: 18, gap: 18 }
    : styles.mainArea;
  const topbarStyle = isMobile
    ? { ...styles.topbar, flexDirection: "column" as const, alignItems: "stretch" }
    : styles.topbar;
  const panelStyle = isMobile
    ? { ...styles.panel, padding: 16, borderRadius: 18 }
    : styles.panel;
  const okurlStepGridStyle = isMobile
    ? { ...styles.okurlStepGrid, gridTemplateColumns: "1fr", gap: 16 }
    : styles.okurlStepGrid;
  const formGridTwoStyle = isMobile
    ? { ...styles.formGridTwo, gridTemplateColumns: "1fr", gap: 12 }
    : styles.formGridTwo;
  const shortUrlRowStyle = isMobile
    ? { ...styles.shortUrlRow, flexDirection: "column" as const, alignItems: "stretch" }
    : styles.shortUrlRow;
  const shortsPanelStyle = isMobile
    ? { ...styles.shortsPanel, gridTemplateColumns: "1fr", gap: 16 }
    : styles.shortsPanel;
  const shortsClipListStyle = isMobile
    ? { ...styles.shortsClipList, gridTemplateColumns: "1fr" }
    : styles.shortsClipList;
  const shortsPreviewCardStyle = isMobile
    ? { ...styles.shortsPreviewCard, padding: 16 }
    : styles.shortsPreviewCard;
  const workspaceTxtSectionStyle = isMobile
    ? { ...styles.workspaceTxtSection, marginTop: 20, paddingTop: 16 }
    : styles.workspaceTxtSection;
  const workspaceTxtTextareaStyle = isMobile
    ? { ...styles.workspaceTxtTextarea, minHeight: 72, fontSize: 14 }
    : styles.workspaceTxtTextarea;
  const primaryButtonStyle = isMobile
    ? { ...styles.primaryButton, width: "100%", justifyContent: "center" }
    : styles.primaryButton;
  const secondaryButtonStyle = isMobile
    ? { ...styles.secondaryButton, width: "100%", justifyContent: "center" }
    : styles.secondaryButton;

  return (
    <main style={styles.page}>
      <div style={shellStyle}>
        <aside style={sidebarStyle}>
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
                  style={{ ...secondaryButtonStyle, width: "100%", marginTop: 12 }}
                  onClick={handleLogout}
                >
                  Log out
                </button>
              </div>
            ) : null}
          </div>

          <div style={navCardStyle}>
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

        <div style={mainAreaStyle}>
          <div style={topbarStyle}>
            <div>
              <h1 style={styles.title}>{tx("Content Upload Dashboard", "內容上傳系統")}</h1>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                style={{
                  ...styles.secondaryButton,
                  ...(lang === "en"
                    ? {
                        borderColor: "#9fd7b5",
                        background: "#eaf8ef",
                        color: "#1f8f4e",
                      }
                    : null),
                }}
                onClick={() => setLang("en")}
              >
                English
              </button>
              <button
                type="button"
                style={{
                  ...styles.secondaryButton,
                  ...(lang === "zh"
                    ? {
                        borderColor: "#9fd7b5",
                        background: "#eaf8ef",
                        color: "#1f8f4e",
                      }
                    : null),
                }}
                onClick={() => setLang("zh")}
              >
                中文
              </button>
            </div>
          </div>

          {!currentUser ? (
            <section style={styles.loginWrap}>
              <div style={styles.panel}>
                <div style={styles.panelTitle}>{tx("Sign in", "登入")}</div>
                <div style={styles.panelDesc}>
                  Sign in to access the page folders assigned to your account.
                </div>

                <form onSubmit={handleLogin} style={styles.formGrid}>
                  <div>
                    <label style={styles.label}>{tx("Username", "用戶名")}</label>
                    <input
                      style={styles.input}
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      placeholder={tx("Enter username", "輸入用戶名")}
                    />
                  </div>

                  <div>
                    <label style={styles.label}>{tx("Password", "密碼")}</label>
                    <input
                      type="password"
                      style={styles.input}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder={tx("Enter password", "輸入密碼")}
                    />
                  </div>

                  <button type="submit" style={styles.primaryButton}>
                    Sign in
                  </button>
                </form>

                {authError ? <div style={styles.errorBox}>{authError}</div> : null}

              </div>
            </section>
          ) : (
            <div style={styles.workspace}>
              <div style={styles.contentColumn}>
                <section style={panelStyle}>
                  <div style={styles.sectionHeader}>
                    <div>
                      <div style={styles.kicker}>Step 1</div>
                      <div style={styles.panelTitle}>{tx("Social platforms", "社交媒體平台")}</div>
                    </div>
                  </div>

                  <div style={styles.panelDesc}>
                    Choose the social platform first.
                  </div>

                  <div style={formGridTwoStyle}>
                    <div>
                      <label style={styles.label}>Facebook Page</label>
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
                      <label style={styles.label}>X Account</label>
                      <input
                        style={styles.inputReadonly}
                        value={mirroredPlatformName || "Choose FB first"}
                        readOnly
                      />
                    </div>

                    <div>
                      <label style={styles.label}>YouTube Account</label>
                      <input
                        style={styles.inputReadonly}
                        value={mirroredPlatformName || "Choose FB first"}
                        readOnly
                      />
                    </div>

                    <div>
                      <label style={styles.label}>TikTok Account</label>
                      <input
                        style={styles.inputReadonly}
                        value={mirroredPlatformName || "Choose FB first"}
                        readOnly
                      />
                    </div>
                  </div>
                </section>

                <section style={panelStyle}>
                  <div style={styles.sectionHeader}>
                    <div>
                      <div style={styles.kicker}>Step 2</div>
                      <div style={styles.panelTitle}>{tx("Short link generator", "短鏈接生成器")}</div>
                    </div>
                  </div>

                  <div style={styles.panelDesc}>
                    {tx(
                      "Paste a Gan Jing World long-video URL, choose the project, review the UTM values, then generate the short link.",
                      "請貼上來自乾淨世界（Gan Jing World）的長視頻鏈接，選擇 project，檢查 UTM 參數後再生成短鏈接。"
                    )}
                  </div>

                  <div style={okurlStepGridStyle}>
                    <div style={styles.formStack}>
                      <div>
                        <label style={styles.label}>{tx("Long-video URL", "長視頻鏈接")}</label>
                        <input
                          style={styles.input}
                          value={longUrl}
                          onChange={(e) => setLongUrl(e.target.value)}
                          placeholder={tx("Paste the Gan Jing World long-video URL here", "請貼上來自乾淨世界的長視頻鏈接")}
                        />
                      </div>

                      <div>
                        <label style={styles.label}>Project</label>
                        <div style={styles.shortUrlRow}>
                          <select
                            style={{ ...styles.select, flex: 1 }}
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
                          <button
                            type="button"
                            style={secondaryButtonStyle}
                            onClick={loadOkurlProjects}
                            disabled={projectsLoading}
                          >
                            Reload
                          </button>
                        </div>
                        <div style={styles.helperText}>
                          Domain: {selectedDomain?.domain || SHORT_LINK_DOMAIN}
                        </div>
                        {projectsError ? (
                          <div style={{ ...styles.helperText, color: "#b5463c" }}>
                            {projectsError}
                          </div>
                        ) : null}
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
                            style={secondaryButtonStyle}
                            onClick={copyShortUrl}
                          >
                            Copy
                          </button>
                          {shortUrlCopied ? (
                            <span style={styles.copiedText}>Copied</span>
                          ) : null}
                        </div>
                      </div>

                      {shortUrlSuccess ? (
                        <div style={styles.successBox}>{shortUrlSuccess}</div>
                      ) : null}

                      {shortUrlError ? (
                        <div style={styles.errorBox}>{shortUrlError}</div>
                      ) : null}

                      <div style={styles.shortLinkHistoryCard}>
                        <div style={styles.actionTitle}>
                          {tx("Recent short links", "最近生成的短鏈接")}
                        </div>
                        {shortLinkHistory.length ? (
                          <div style={styles.shortLinkHistoryList}>
                            {shortLinkHistory.map((item, index) => (
                              <div key={`${item.shortUrl}-${index}`} style={styles.shortLinkHistoryRow}>
                                <div style={{ minWidth: 0 }}>
                                  <div style={styles.shortLinkHistoryProject}>
                                    {item.projectName || tx("Unknown project", "未命名項目")}
                                  </div>
                                  <div style={styles.shortLinkHistoryUrl}>{item.shortUrl}</div>
                                  <div style={styles.shortLinkHistoryOrigin}>
                                    {tx("From long-video URL:", "對應長視頻鏈接：")} {item.originalUrl}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  style={secondaryButtonStyle}
                                  onClick={() => navigator.clipboard.writeText(item.shortUrl)}
                                >
                                  {tx("Copy", "複製")}
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={styles.helperText}>
                            {tx(
                              "Your 5 most recent short links will appear here.",
                              "這裡會顯示最近生成的 5 筆短鏈接。"
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={styles.utmBuilderCard}>
                      <div style={styles.utmBuilderHeader}>
                        <div style={styles.utmBuilderTitle}>UTM Builder</div>
                        <div style={styles.utmBuilderBadge}>
                          {selectedUtmTemplate?.label || "Auto"}
                        </div>
                      </div>

                      <div style={{ ...styles.formStack, gap: 10 }}>
                        <div>
                          <label style={styles.label}>UTM Template</label>
                          <select
                            style={{ ...styles.compactSelect, minHeight: 44, padding: "10px 14px" }}
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

                        <div style={formGridTwoStyle}>
                          <div>
                            <label style={styles.label}>Source</label>
                            <input
                              style={{ ...styles.compactInput, minHeight: 44, padding: "10px 14px" }}
                              value={utmFields.source}
                              onChange={(e) => updateUtmField("source", e.target.value)}
                              placeholder="mkg"
                            />
                          </div>

                          <div>
                            <label style={styles.label}>Medium</label>
                            <input
                              style={{ ...styles.compactInput, minHeight: 44, padding: "10px 14px" }}
                              value={utmFields.medium}
                              onChange={(e) => updateUtmField("medium", e.target.value)}
                              placeholder="video"
                            />
                          </div>

                          <div>
                            <label style={styles.label}>Campaign</label>
                            <input
                              style={{ ...styles.compactInput, minHeight: 44, padding: "10px 14px" }}
                              value={utmFields.campaign}
                              onChange={(e) => updateUtmField("campaign", e.target.value)}
                              placeholder="campaign-name"
                            />
                          </div>

                          <div>
                            <label style={styles.label}>Term</label>
                            <input
                              style={{ ...styles.compactInput, minHeight: 44, padding: "10px 14px" }}
                              value={utmFields.term}
                              onChange={(e) => updateUtmField("term", e.target.value)}
                              placeholder="news"
                            />
                          </div>

                          <div>
                            <label style={styles.label}>Content</label>
                            <input
                              style={{ ...styles.compactInput, minHeight: 44, padding: "10px 14px" }}
                              value={utmFields.content}
                              onChange={(e) => updateUtmField("content", e.target.value)}
                              placeholder="reels"
                            />
                          </div>

                          <div>
                            <label style={styles.label}>Source Platform</label>
                            <input
                              style={{ ...styles.compactInput, minHeight: 44, padding: "10px 14px" }}
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
                            rows={2}
                            style={{
                              ...styles.compactTextarea,
                              minHeight: 44,
                              padding: "10px 14px",
                              background: "#f3f6fb",
                            }}
                            value={longUrlWithUtm}
                            readOnly
                            placeholder="Paste the original URL above to preview the final tracking URL"
                          />
                        </div>

                        <div style={{ ...styles.toggleCard, padding: "12px 16px" }}>
                          <label style={styles.toggleRow}>
                            <input
                              type="checkbox"
                              checked={signUpWallEnabled}
                              onChange={(e) => setSignUpWallEnabled(e.target.checked)}
                            />
                            <span style={styles.toggleLabel}>Sign-up Wall</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section style={panelStyle}>
                  <div style={styles.sectionHeader}>
                    <div>
                      <div style={styles.kicker}>{tx("Step 3", "第 3 步")}</div>
                      <div style={styles.panelTitle}>{tx("Shorts generator", "Shorts 生成器")}</div>
                    </div>
                  </div>

                  <div style={styles.panelDesc}>
                    {tx(
                      "Use up to 3 parallel workspaces for different long-video URLs. Each workspace saves its own in-progress job, can auto-resume after refresh, and can be expanded or collapsed so the page stays manageable.",
                      "最多可同時使用 3 個工作區處理不同的 long-video URL。每個工作區都會保存自己的進行中 job、在刷新後自動恢復，並可展開或收縮，讓頁面保持清晰。"
                    )}
                  </div>

                  <div style={{ display: "grid", gap: 18 }}>
                    {shortsWorkspaces.map((workspace) => {
                      const workspaceHistory = shortsHistory.filter(
                        (entry) =>
                          (entry.workspaceId || SHORTS_WORKSPACE_CONFIG[0].workspaceId) ===
                          workspace.workspaceId
                      );
                      const isActiveWorkspace =
                        activeShortsWorkspaceId === workspace.workspaceId;
                      const selectedCount = workspace.selectedShortIds.length;
                      const rangeSummary = getShortsRangeSummary(
                        workspace.rangeStart,
                        workspace.rangeEnd
                      );

                      return (
                        <div
                          key={workspace.workspaceId}
                          style={{
                            border: isActiveWorkspace
                              ? "1px solid #f0bf84"
                              : "1px solid #dce7f7",
                            borderRadius: 22,
                            background: isActiveWorkspace ? "#fffaf3" : "#f8fbff",
                            padding: 18,
                            display: "grid",
                            gap: 16,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                              alignItems: "center",
                              flexWrap: "wrap",
                            }}
                          >
                            <div>
                              <div style={styles.actionTitle}>{`${tx("Workspace", "工作區")} ${workspace.title.split(" ").pop() || ""}`.trim()}</div>
                              <div style={styles.helperText}>
                                {workspace.sourceUrl
                                  ? `${tx("Current job", "目前任務")}: ${workspace.sourceUrl}`
                                  : tx("No job started yet", "尚未開始任務")}
                              </div>
                            </div>
                            <button
                              type="button"
                              style={secondaryButtonStyle}
                              onClick={() => {
                                setActiveShortsWorkspaceId(workspace.workspaceId);
                                toggleShortsWorkspaceCollapse(workspace.workspaceId);
                              }}
                            >
                              {workspace.isCollapsed ? tx("▸ Expand", "▸ 展開") : tx("▾ Collapse", "▾ 收起")}
                            </button>
                          </div>

                          {!workspace.isCollapsed ? (
                            <>
                              {workspaceHistory.length ? (
                                <div
                                  style={{
                                    display: "grid",
                                    gap: 8,
                                    background: "#ffffff",
                                    border: "1px solid #e3ebf7",
                                    borderRadius: 16,
                                    padding: 12,
                                  }}
                                >
                                  <div style={styles.helperText}>
                                    Recent history for this workspace
                                  </div>
                                  <div style={{ display: "grid", gap: 8 }}>
                                    {workspaceHistory.slice(0, SHORTS_HISTORY_PER_WORKSPACE).map((entry) => (
                                      <div
                                        key={`${workspace.workspaceId}-${entry.jobId}`}
                                        style={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                          gap: 10,
                                          alignItems: "center",
                                          flexWrap: "wrap",
                                        }}
                                      >
                                        <div style={{ minWidth: 0 }}>
                                          <div style={{ fontSize: 13, fontWeight: 700 }}>
                                            {entry.sourceUrl || "Untitled job"}
                                          </div>
                                          <div style={styles.helperText}>
                                            <span style={getHistoryStatusStyle(entry.status)}>{entry.status || "-"}</span>
                                            {" · "}
                                            {formatHistoryTimestamp(entry.updatedAt)}
                                          </div>
                                        </div>
                                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                          <button
                                            type="button"
                                            style={secondaryButtonStyle}
                                            onClick={() => restoreShortsHistoryEntry(entry)}
                                          >
                                            {lang === "zh" ? "恢復任務" : "Restore"}
                                          </button>
                                          <button
                                            type="button"
                                            style={secondaryButtonStyle}
                                            onClick={() => reloadShortsHistoryEntry(entry)}
                                          >
                                            {lang === "zh" ? "刷新狀態" : "Refresh"}
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : null}

                              <div style={shortsPanelStyle}>
                                <div style={styles.formStack}>
                                  <div>
                                    <label style={styles.label}>{tx("Long video URL", "Long video URL")}</label>
                                    <input
                                      style={styles.input}
                                      value={workspace.sourceUrl}
                                      onChange={(e) => {
                                        setActiveShortsWorkspaceId(workspace.workspaceId);
                                        updateShortsWorkspace(workspace.workspaceId, {
                                          sourceUrl: e.target.value,
                                        });
                                      }}
                                      placeholder={tx("Paste the long video URL here", "請貼上 long video URL")}
                                    />
                                  </div>

                                  <div style={styles.formStack}>
                                    <div>
                                      <label style={styles.label}>{tx("Clipping mode", "剪輯模式")}</label>
                                      <div style={styles.segmentedControl}>
                                        <button
                                          type="button"
                                          style={{
                                            ...styles.segmentedButton,
                                            ...(workspace.mode === "aiClipping"
                                              ? styles.segmentedButtonActive
                                              : null),
                                          }}
                                          onClick={() => {
                                            setActiveShortsWorkspaceId(workspace.workspaceId);
                                            updateShortsWorkspace(workspace.workspaceId, {
                                              mode: "aiClipping",
                                            });
                                          }}
                                        >
                                          AI Clipping
                                        </button>
                                        <button
                                          type="button"
                                          style={{
                                            ...styles.segmentedButton,
                                            ...(workspace.mode === "manualSelected"
                                              ? styles.segmentedButtonActive
                                              : null),
                                          }}
                                          onClick={() => {
                                            setActiveShortsWorkspaceId(workspace.workspaceId);
                                            updateShortsWorkspace(workspace.workspaceId, {
                                              mode: "manualSelected",
                                            });
                                          }}
                                        >
                                          Manual Selection
                                        </button>
                                      </div>
                                      <div style={styles.helperText}>
                                        {workspace.mode === "aiClipping"
                                          ? "AI Clipping finds the best shorts inside your chosen range. You can leave the range blank to scan the full video."
                                          : "Manual Selection only analyzes the exact time window you provide. This is best when you already know where the strong section is."}
                                      </div>
                                    </div>

                                    {workspace.mode === "aiClipping" ? (
                                      <div>
                                        <label style={styles.label}>{tx("Time range", "時間範圍")}</label>
                                        <div style={styles.timeframeToolbar}>
                                          <div style={styles.timeframeTitle}>{tx("Select timeframe", "選擇時間區間")}</div>
                                          <button
                                            type="button"
                                            style={styles.timeframeReset}
                                            onClick={() =>
                                              applyShortsRangePreset(workspace.workspaceId, "", "")
                                            }
                                          >
                                            Reset
                                          </button>
                                        </div>
                                        <div style={styles.rangeFieldGrid}>
                                          <div>
                                            <input
                                              style={styles.input}
                                              value={workspace.rangeStart}
                                              onChange={(e) => {
                                                setActiveShortsWorkspaceId(workspace.workspaceId);
                                                updateShortsWorkspace(workspace.workspaceId, {
                                                  rangeStart: e.target.value,
                                                });
                                              }}
                                              placeholder="Start, e.g. 00:00"
                                            />
                                          </div>
                                          <div>
                                            <input
                                              style={styles.input}
                                              value={workspace.rangeEnd}
                                              onChange={(e) => {
                                                setActiveShortsWorkspaceId(workspace.workspaceId);
                                                updateShortsWorkspace(workspace.workspaceId, {
                                                  rangeEnd: e.target.value,
                                                });
                                              }}
                                              placeholder="End, e.g. 05:00"
                                            />
                                          </div>
                                        </div>
                                        <div style={styles.helperText}>
                                          Leave both blank to use the full video in AI Clipping mode.
                                          Current range: {rangeSummary}.
                                        </div>
                                        <div style={styles.helperText}>
                                          Full video on 10+ minute sources can take much longer while
                                          ShortsGen scans the whole video.
                                        </div>
                                        <div style={styles.presetChipRow}>
                                          {SHORTS_RANGE_PRESETS.map((preset) => {
                                            const active =
                                              workspace.rangeStart === preset.start &&
                                              workspace.rangeEnd === preset.end;

                                            return (
                                              <button
                                                key={`${workspace.workspaceId}-${preset.label}`}
                                                type="button"
                                                style={{
                                                  ...styles.presetChip,
                                                  ...(active ? styles.presetChipActive : null),
                                                }}
                                                onClick={() =>
                                                  applyShortsRangePreset(
                                                    workspace.workspaceId,
                                                    preset.start,
                                                    preset.end
                                                  )
                                                }
                                              >
                                                {preset.label}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    ) : (
                                      <div style={styles.manualSelectionCard}>
                                        <div style={styles.manualSelectionHeader}>
                                          <div style={styles.manualSelectionTitle}>Exact clip range</div>
                                          <div style={styles.manualSelectionBadge}>Required</div>
                                        </div>
                                        <div style={styles.rangeFieldGrid}>
                                          <div>
                                            <label style={styles.label}>Start time</label>
                                            <input
                                              style={styles.input}
                                              value={workspace.rangeStart}
                                              onChange={(e) => {
                                                setActiveShortsWorkspaceId(workspace.workspaceId);
                                                updateShortsWorkspace(workspace.workspaceId, {
                                                  rangeStart: e.target.value,
                                                });
                                              }}
                                              placeholder="00:00"
                                            />
                                          </div>
                                          <div>
                                            <label style={styles.label}>End time</label>
                                            <input
                                              style={styles.input}
                                              value={workspace.rangeEnd}
                                              onChange={(e) => {
                                                setActiveShortsWorkspaceId(workspace.workspaceId);
                                                updateShortsWorkspace(workspace.workspaceId, {
                                                  rangeEnd: e.target.value,
                                                });
                                              }}
                                              placeholder="05:00"
                                            />
                                          </div>
                                        </div>
                                        <div style={styles.helperText}>
                                          Manual Selection only uses this exact window. Current range: {rangeSummary}.
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  <div style={styles.inlineActions}>
                                    <button
                                      type="button"
                                      style={{
                                        ...styles.primaryButton,
                                        opacity: workspace.generatingShorts ? 0.7 : 1,
                                        cursor: workspace.generatingShorts ? "not-allowed" : "pointer",
                                      }}
                                      onClick={() => generateShorts(workspace.workspaceId)}
                                      disabled={workspace.generatingShorts}
                                    >
                                      {workspace.generatingShorts ? "Generating..." : "Generate shorts"}
                                    </button>
                                  </div>

                                  <div style={workspaceTxtSectionStyle}>
                                    <div style={styles.workspaceTxtHeaderRow}>
                                      <div>
                                        <div style={styles.actionTitle}>{tx("TXT generator", "文本生成器")}</div>
                                        <div style={styles.helperText}>
                                          {tx(
                                            "Copy or edit title and description here, then add them to Upload files.",
                                            "可在這裡複製或編輯標題與描述，之後再加入上傳文件。"
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div style={styles.workspaceTxtGrid}>
                                      {workspace.txtDescriptions.map((value, index) => (
                                        <div key={`${workspace.workspaceId}-txt-${index}`} style={styles.workspaceTxtCard}>
                                          <label style={styles.label}>{tx("Title and description", "Title and description")}</label>
                                          <textarea
                                            rows={3}
                                            style={workspaceTxtTextareaStyle}
                                            value={value}
                                            onChange={(e) => updateTxtDescription(workspace.workspaceId, index, e.target.value)}
                                            placeholder={tx(
                                              "Paste or edit title and description here",
                                              "在此貼上或編輯標題與描述"
                                            )}
                                          />
                                        </div>
                                      ))}
                                    </div>

                                    <div style={styles.inlineActions}>
                                      <button
                                        type="button"
                                        style={{
                                          ...styles.primaryButton,
                                          opacity: workspace.addingTxtsToUploads ? 0.7 : 1,
                                          cursor: workspace.addingTxtsToUploads ? "not-allowed" : "pointer",
                                        }}
                                        onClick={() => addGeneratedTxtsToUploadList(workspace.workspaceId)}
                                        disabled={workspace.addingTxtsToUploads}
                                      >
                                        {workspace.addingTxtsToUploads
                                          ? tx("Adding TXT...", "正在加入 TXT...")
                                          : tx("Add TXT to Upload files", "加入 TXT 到上傳文件")}
                                      </button>
                                      {workspace.txtsAddedToUploads ? (
                                        <span style={styles.copiedText}>{tx("Added ✓", "已加入 ✓")}</span>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>

                                <div style={shortsPreviewCardStyle}>
                                  <div style={styles.shortsPreviewHeader}>
                                    <div style={styles.actionTitle}>{tx("Preview clips", "預覽 clips")}</div>
                                    <div style={styles.shortsPreviewPills}>
                                      {workspace.jobStatus ? (
                                        <div style={styles.statusPill}>{workspace.jobStatus}</div>
                                      ) : null}
                                      {workspace.jobProgress !== null ? (
                                        <div style={styles.progressPill}>{workspace.jobProgress}%</div>
                                      ) : null}
                                      <div style={styles.selectionPill}>{selectedCount} selected</div>
                                    </div>
                                  </div>

                                  {(workspace.jobStatus === "SCHEDULED" ||
                                    workspace.jobStatus === "IN_PROGRESS" ||
                                    workspace.jobProgress !== null) &&
                                  workspace.jobStatus !== "FAILED" ? (
                                    <div style={styles.progressCard}>
                                      <div style={styles.progressRow}>
                                        <div style={styles.progressLabel}>{tx("Generation progress", "生成進度")}</div>
                                        <div style={styles.progressValue}>
                                          {workspace.jobProgress !== null
                                            ? `${workspace.jobProgress}%`
                                            : tx("Processing", "處理中")}
                                        </div>
                                      </div>
                                      <div style={styles.progressTrack}>
                                        {workspace.jobProgress !== null ? (
                                          <div
                                            style={{
                                              ...styles.progressFill,
                                              width: `${workspace.jobProgress}%`,
                                            }}
                                          />
                                        ) : (
                                          <div style={styles.progressFillIndeterminate} />
                                        )}
                                      </div>
                                    </div>
                                  ) : null}

                                  {workspace.clips.length ? (
                                    <div style={shortsClipListStyle}>
                                      {workspace.clips.map((clip) => {
                                        const selected = workspace.selectedShortIds.includes(clip.id);
                                        const uploaded = workspace.uploadedClipIds.includes(clip.id);

                                        return (
                                          <label
                                            key={`${workspace.workspaceId}-${clip.id}`}
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
                                                  onChange={() =>
                                                    toggleShortSelection(workspace.workspaceId, clip.id)
                                                  }
                                                />
                                              </div>
                                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                                {uploaded ? (
                                                  <div style={styles.progressPill}>{tx("Uploaded", "已上傳")}</div>
                                                ) : null}
                                                <div style={styles.shortsQualityPill}>
                                                  {clip.qualityLabel}
                                                  {clip.qualityScore !== null
                                                    ? ` · ${clip.qualityScore}`
                                                    : ""}
                                                </div>
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
                                              <div style={styles.shortsClipMeta}>
                                                #{clip.rank} · {clip.duration} · {clip.angle}
                                              </div>
                                              <div style={styles.shortsClipTextBlock}>
                                                <div style={styles.shortsClipTextLabel}>{tx("Title", "標題")}</div>
                                                <div style={styles.shortsClipSnippet}>{clip.title}</div>
                                                <div style={styles.shortsClipTextLabel}>{tx("Description", "描述")}</div>
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
                                                    void copyClipText(
                                                      workspace.workspaceId,
                                                      clip.id,
                                                      clip.title,
                                                      clip.description || clip.angle
                                                    );
                                                  }}
                                                >
                                                  {tx("Copy title and description", "複製標題和描述")}
                                                </button>
                                                <button
                                                  type="button"
                                                  style={styles.miniActionButton}
                                                  onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    void generateViralClipText(workspace.workspaceId, clip.id);
                                                  }}
                                                >
                                                  {tx(
                                                    "Generate viral title and description",
                                                    "生成爆款標題和描述"
                                                  )}
                                                </button>
                                                {workspace.copiedClipActionKey === `${clip.id}:combined` ? (
                                                  <span style={styles.copiedText}>{tx("Copied", "已複製")}</span>
                                                ) : null}
                                                {workspace.copiedClipActionKey === `${clip.id}:viral` ? (
                                                  <span style={styles.copiedText}>
                                                    {tx("Viral copy ready", "爆款文案已生成")}
                                                  </span>
                                                ) : null}
                                              </div>
                                            </div>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div style={styles.shortsEmptyState}>
                                      {workspace.generatingShorts
                                        ? "ShortsGen is analyzing the long video and preparing clips..."
                                        : "Generate shorts in this workspace to preview clip options, compare quality, and choose the best ones to download."}
                                    </div>
                                  )}

                                  <div style={styles.inlineActions}>
                                    <button
                                      type="button"
                                      style={{
                                        ...styles.primaryButton,
                                        opacity: workspace.addingShortsToUploads ? 0.7 : 1,
                                        cursor: workspace.addingShortsToUploads ? "not-allowed" : "pointer",
                                      }}
                                      onClick={() => addSelectedShortsToUploadList(workspace.workspaceId)}
                                      disabled={workspace.addingShortsToUploads}
                                    >
                                      {workspace.addingShortsToUploads
                                        ? "Adding to upload list..."
                                        : "Add Shorts to Upload files"}
                                    </button>
                                    {workspace.shortsAddedToUploads ? (
                                      <span style={styles.copiedText}>Added</span>
                                    ) : null}
                                    <button
                                      type="button"
                                      style={{
                                        ...styles.secondaryButton,
                                        opacity: workspace.downloadingShorts ? 0.7 : 1,
                                        cursor: workspace.downloadingShorts ? "not-allowed" : "pointer",
                                      }}
                                      onClick={() => downloadSelectedShorts(workspace.workspaceId)}
                                      disabled={workspace.downloadingShorts}
                                    >
                                      {workspace.downloadingShorts
                                        ? "Preparing download..."
                                        : "Download selected shorts"}
                                    </button>
                                  </div>

                                  {workspace.successMessage ? (
                                    <div style={styles.successBox}>{workspace.successMessage}</div>
                                  ) : null}

                                  {workspace.errorMessage ? (
                                    <div style={styles.errorBox}>{workspace.errorMessage}</div>
                                  ) : null}
                                </div>
                              </div>
                            </>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section style={panelStyle}>
                  <div style={styles.sectionHeader}>
                    <div>
                      <div style={styles.kicker}>{tx("Step 4", "第 4 步")}</div>
                      <div style={styles.panelTitle}>{tx("Upload files", "上傳文件")}</div>
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
                    {files.map((file, idx) => {
                      const previewKey = `${file.name}-${file.size}-${file.lastModified}-${idx}`;
                      const videoPreviewUrl = filePreviewUrls[previewKey];
                      const txtSnippet = txtPreviewSnippets[previewKey];
                      const isVideoFile = Boolean(videoPreviewUrl);
                      const isTxtFile = file.type.startsWith("text/") || /\.txt$/i.test(file.name);

                      return (
                        <div key={file.name + "-" + String(idx)} style={styles.fileRow}>
                          <div style={styles.fileRowMain}>
                            <div style={styles.filePreviewBox}>
                              {isVideoFile ? (
                                <video
                                  src={videoPreviewUrl}
                                  style={styles.filePreviewVideo}
                                  muted
                                  playsInline
                                  preload="metadata"
                                />
                              ) : isTxtFile ? (
                                <div style={styles.filePreviewText}>{txtSnippet || "TXT"}</div>
                              ) : (
                                <div style={styles.filePreviewText}>FILE</div>
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={styles.fileName}>{file.name}</div>
                              <div style={styles.fileMeta}>
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </div>
                              {isVideoFile && file.originalTitle ? (
                                <div style={styles.filePreviewSnippetBelow}>{file.originalTitle}</div>
                              ) : null}
                              {isTxtFile && txtSnippet ? (
                                <div style={styles.filePreviewSnippetBelow}>{txtSnippet}</div>
                              ) : null}
                              {isTxtFile && editingTxtIndex === idx ? (
                                <div style={{ display: "grid", gap: 8, marginTop: 10, maxWidth: 760 }}>
                                  <textarea
                                    rows={5}
                                    style={{ ...styles.compactTextarea, minHeight: 112, width: "100%", maxWidth: 760 }}
                                    value={editingTxtDraft}
                                    onChange={(e) => setEditingTxtDraft(e.target.value)}
                                  />
                                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                    <button
                                      type="button"
                                      style={secondaryButtonStyle}
                                      onClick={cancelEditedTxtFile}
                                    >
                                      {tx("Cancel", "取消")}
                                    </button>
                                    <button
                                      type="button"
                                      style={secondaryButtonStyle}
                                      onClick={saveEditedTxtFile}
                                    >
                                      {tx("Save", "保存")}
                                    </button>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </div>
                          <div style={styles.fileRowActions}>
                            {isTxtFile && editingTxtIndex !== idx ? (
                              <button
                                type="button"
                                style={secondaryButtonStyle}
                                onClick={() => void editTxtFile(idx)}
                              >
                                {tx("Edit", "編輯")}
                              </button>
                            ) : null}
                            <button
                              type="button"
                              style={secondaryButtonStyle}
                              onClick={() => removeFile(idx)}
                            >
                              {tx("Remove", "移除")}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section style={panelStyle}>
                  <div style={styles.sectionHeader}>
                    <div>
                      <div style={styles.kicker}>{tx("Step 5", "第 5 步")}</div>
                      <div style={styles.panelTitle}>{tx("Start automation", "開始自動化")}</div>
                    </div>
                  </div>

                  <div style={styles.panelDesc}>
                    {tx(
                      "Review the current summary, then start the automation. Please keep this page open until you see Upload successful.",
                      "檢查目前摘要後再開始自動化。請不要關閉此頁面，直到看到 Upload successful 才算完成。"
                    )}
                  </div>

                  <div style={styles.summaryCard}>
                    <div style={styles.actionTitle}>Current summary</div>
                    <div style={styles.summaryRow}>
                      <span>Facebook Page</span>
                      <strong>{pageName || "-"}</strong>
                    </div>
                    <div style={styles.summaryRow}>
                      <span>X Account</span>
                      <strong>{mirroredPlatformName || "Choose FB first"}</strong>
                    </div>
                    <div style={styles.summaryRow}>
                      <span>YouTube Account</span>
                      <strong>{mirroredPlatformName || "Choose FB first"}</strong>
                    </div>
                    <div style={styles.summaryRow}>
                      <span>TikTok Account</span>
                      <strong>{mirroredPlatformName || "Choose FB first"}</strong>
                    </div>
                    <div style={styles.summaryRow}>
                      <span>Files</span>
                      <strong>{files.length}</strong>
                    </div>
                    <div style={styles.summaryRow}>
                      <span>Total size</span>
                      <strong>{totalSizeMb} MB</strong>
                    </div>
                  </div>

                  <div style={styles.inlineActions}>
                    <button
                      type="button"
                      style={{
                        ...styles.primaryButton,
                        width: "100%",
                        opacity:
                          submitting || currentUser?.isDemo ? 0.7 : 1,
                        cursor:
                          submitting || currentUser?.isDemo
                            ? "not-allowed"
                            : "pointer",
                      }}
                      onClick={submitToN8n}
                      disabled={submitting || currentUser?.isDemo}
                    >
                      {currentUser?.isDemo
                        ? "Demo account cannot start automation"
                        : submitting
                        ? "Starting..."
                        : "Start automation"}
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
    gap: 12,
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
    gap: 12,
    padding: 14,
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
    marginBottom: 6,
    fontWeight: 700,
    fontSize: 14,
    color: "#1d2a3b",
  },
  helperText: {
    marginTop: 8,
    fontSize: 12,
    color: "#587092",
  },
  copiedText: {
    fontSize: 12,
    fontWeight: 700,
    color: "#177245",
    whiteSpace: "nowrap",
  },
  segmentedControl: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: 6,
    borderRadius: 20,
    background: "#eaf0fa",
    border: "1px solid #d4dff0",
    flexWrap: "wrap",
  },
  segmentedButton: {
    border: "none",
    background: "transparent",
    color: "#5f718d",
    borderRadius: 16,
    padding: "12px 18px",
    fontWeight: 800,
    fontSize: 15,
    cursor: "pointer",
  },
  segmentedButtonActive: {
    background: "#ffffff",
    color: "#2c5df7",
    boxShadow: "0 8px 18px rgba(44, 93, 247, 0.14)",
  },
  timeframeToolbar: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    marginBottom: 10,
  },
  timeframeTitle: {
    fontSize: 14,
    fontWeight: 800,
    color: "#64748b",
  },
  timeframeReset: {
    border: "none",
    background: "transparent",
    color: "#3b82f6",
    fontWeight: 800,
    fontSize: 14,
    cursor: "pointer",
    padding: 0,
  },
  manualSelectionCard: {
    borderRadius: 18,
    border: "1px solid #d8e3f5",
    background: "linear-gradient(180deg, #f9fbff 0%, #f4f8ff 100%)",
    padding: 18,
  },
  manualSelectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  manualSelectionTitle: {
    fontSize: 15,
    fontWeight: 800,
    color: "#18345f",
  },
  manualSelectionBadge: {
    borderRadius: 999,
    padding: "6px 10px",
    background: "#fff1df",
    color: "#b86407",
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
  manualSelectionTip: {
    marginTop: 12,
    borderRadius: 14,
    padding: "12px 14px",
    background: "#ffffff",
    border: "1px dashed #cfe0f5",
    color: "#5b6f8b",
    fontSize: 13,
    lineHeight: 1.6,
    fontWeight: 600,
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
  compactInput: {
    width: "100%",
    borderRadius: 12,
    border: "1px solid #cfdef2",
    padding: "8px 11px",
    fontSize: 14,
    lineHeight: 1.25,
    outline: "none",
    background: "#fbfdff",
    boxSizing: "border-box",
  },
  compactSelect: {
    width: "100%",
    borderRadius: 12,
    border: "1px solid #cfdef2",
    padding: "8px 11px",
    fontSize: 14,
    lineHeight: 1.25,
    outline: "none",
    background: "#fbfdff",
    boxSizing: "border-box",
  },
  compactTextarea: {
    width: "100%",
    minHeight: 52,
    borderRadius: 12,
    border: "1px solid #cfdef2",
    padding: "8px 11px",
    fontSize: 14,
    lineHeight: 1.4,
    outline: "none",
    resize: "vertical" as const,
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
  toggleCard: {
    borderRadius: 14,
    border: "1px solid #d9e7f7",
    background: "#ffffff",
    padding: "10px 12px",
  },
  toggleRow: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
    color: "#10233f",
    fontWeight: 700,
    fontSize: 15,
  },
  toggleLabel: {
    fontWeight: 800,
  },

  workspaceTxtSection: {
    marginTop: 28,
    paddingTop: 20,
    borderTop: "1px dashed #d9e7f7",
  },
  workspaceTxtHeaderRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 18,
  },
  workspaceTxtGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 14,
    width: "100%",
    marginBottom: 16,
  },
  workspaceTxtCard: {
    width: "100%",
  },
  workspaceTxtTextarea: {
    width: "100%",
    minHeight: 84,
    borderRadius: 14,
    border: "1px solid #cfdef2",
    padding: "13px 14px",
    fontSize: 15,
    lineHeight: 1.45,
    outline: "none",
    background: "#fbfdff",
    resize: "vertical" as const,
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
    gap: 12,
    border: "1px solid #dce7f7",
    borderRadius: 14,
    padding: "8px 10px",
    background: "#ffffff",
  },
  fileRowMain: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
    flex: 1,
  },
  filePreviewBox: {
    width: 42,
    height: 56,
    borderRadius: 8,
    overflow: "hidden",
    border: "1px solid #dce7f7",
    background: "#f8fbff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  filePreviewVideo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    background: "#eef4fb",
  },
  filePreviewText: {
    width: "100%",
    height: "100%",
    padding: "4px 5px",
    fontSize: 8,
    lineHeight: 1.2,
    color: "#475569",
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 5,
    WebkitBoxOrient: "vertical",
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
    background: "#f8fbff",
  },
  fileName: {
    fontWeight: 800,
    fontSize: 13,
    marginBottom: 2,
    lineHeight: 1.2,
    wordBreak: "break-word",
  },
  fileMeta: {
    color: "#6b7789",
    fontSize: 11,
  },
  filePreviewSnippetBelow: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 1.45,
    color: "#6b7789",
    wordBreak: "break-word",
    whiteSpace: "normal",
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
  progressPill: {
    borderRadius: 999,
    padding: "6px 10px",
    background: "#eef4ff",
    color: "#2c5df7",
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
  progressCard: {
    marginTop: 12,
    marginBottom: 16,
    borderRadius: 16,
    border: "1px solid #dbe7fb",
    background: "#ffffff",
    padding: "14px 16px",
  },
  progressRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: 800,
    color: "#5e7392",
  },
  progressValue: {
    fontSize: 13,
    fontWeight: 800,
    color: "#2c5df7",
  },
  progressTrack: {
    width: "100%",
    height: 10,
    borderRadius: 999,
    background: "#e6efff",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    background: "linear-gradient(90deg, #4b7cff 0%, #2c5df7 100%)",
    transition: "width 240ms ease",
  },
  progressFillIndeterminate: {
    width: "38%",
    height: "100%",
    borderRadius: 999,
    background: "linear-gradient(90deg, #4b7cff 0%, #2c5df7 100%)",
    boxShadow: "0 0 24px rgba(44, 93, 247, 0.25)",
  },
  shortsClipList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(205px, 1fr))",
    gap: 16,
  },
  shortsClipCard: {
    display: "grid",
    alignContent: "start",
    gap: 10,
    border: "1px solid #d8e3f5",
    borderRadius: 20,
    padding: "12px",
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
    maxWidth: 196,
    aspectRatio: "9 / 16",
    height: "auto",
    objectFit: "cover",
    borderRadius: 16,
    border: "1px solid #dce7f7",
    background: "#f3f7fd",
  },
  shortsClipBody: {
    minWidth: 0,
    display: "grid",
    gap: 6,
  },
  shortsClipTitle: {
    fontSize: 15,
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
    fontSize: 12,
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
    alignItems: "stretch",
  },
  miniActionButton: {
    border: "1px solid #d8e3f5",
    background: "#ffffff",
    color: "#214a8c",
    borderRadius: 12,
    padding: "10px 12px",
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
    minHeight: 42,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1.3,
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

  shortLinkHistoryCard: {
    marginTop: 8,
    borderRadius: 16,
    border: "1px solid #dce7f7",
    background: "#ffffff",
    padding: 14,
    display: "grid",
    gap: 10,
  },
  shortLinkHistoryList: {
    display: "grid",
    gap: 10,
  },
  shortLinkHistoryRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    padding: "10px 12px",
    border: "1px solid #e6eef9",
    borderRadius: 14,
    background: "#f8fbff",
  },
  shortLinkHistoryProject: {
    fontSize: 12,
    fontWeight: 800,
    color: "#5f7088",
    marginBottom: 4,
  },
  shortLinkHistoryUrl: {
    fontSize: 13,
    fontWeight: 800,
    color: "#0d2242",
    lineHeight: 1.5,
    wordBreak: "break-all",
    marginBottom: 4,
  },
  shortLinkHistoryOrigin: {
    fontSize: 12,
    color: "#607086",
    lineHeight: 1.5,
    wordBreak: "break-all",
  },
};
