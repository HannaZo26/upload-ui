"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type DemoUser = {
  password: string;
  displayName: string;
  folders: string[];
  pages: string[];
};

type CurrentUser = {
  username: string;
  displayName: string;
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

const SHORT_LINK_DOMAIN = "gjw.us";

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

const demoUsers: Record<string, DemoUser> = {
  haiyennt: {
    password: "Hge&geTEg@ge123",
    displayName: "Haiyen",
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
    displayName: "Hannah",
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

  gjwmarketing: {
    password: "jgGTR#kg$93",
    displayName: "GJW Marketing",
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
    displayName: "Ying",
    folders: ["clearviewdaily", "viewscopedaily", "dailytrendpulse"],
    pages: ["clearviewdaily", "viewscopedaily", "dailytrendpulse"],
  },

  ivyzhang: {
    password: "ygeTTge$eff@#24",
    displayName: "Ivy Zhang",
    folders: ["everydayvitalityzh", "healthyrhythmdaily"],
    pages: ["everydayvitalityzh", "healthyrhythmdaily"],
  },

  lucywang: {
    password: "GhyTge#rge@87",
    displayName: "Lucy Wang",
    folders: ["horizonupdatesshow", "flashbrieftoday"],
    pages: ["horizonupdatesshow", "flashbrieftoday"],
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

  const [txtDescription, setTxtDescription] = useState("");

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
    setTxtDescription("");
    setLongUrl("");
    setShortUrl("");
    setCustomSlug("");
    setShortUrlError("");
    setShortUrlSuccess("");

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

    const firstFolder = user.folders[0] ?? "";
    const firstPage = user.pages[0] ?? "";

    setCurrentUser({
      username,
      displayName: user.displayName,
    });
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
    setTxtDescription("");
    setShortUrlError("");
    setShortUrlSuccess("");
    setSelectedProjectId("");
    setSelectedUtmTemplateKey("");
    setUtmFields(EMPTY_UTM_FIELDS);
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

  const downloadTxt = () => {
    if (!txtDescription.trim()) {
      setError("Please enter TXT content before downloading.");
      setSuccess("");
      return;
    }

    const blob = new Blob(["\uFEFF" + txtDescription.trim()], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");

    const fileName =
      pageName + "_" + yyyy + mm + dd + "_" + hh + mi + ss + ".txt";

    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    setSuccess("UTF-8 TXT downloaded successfully.");
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
      formData.append("notes", txtDescription);
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
        data?.message || "Submitted to n8n successfully. Form has been cleared."
      );
      setError("");
    } catch (err: any) {
      setError(err?.message || "Submit failed.");
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
              <div style={styles.logoDot} />
              <div>
                <div style={styles.logoTitle}>Upload Console</div>
                <div style={styles.logoSub}>Drive + OKURL + n8n</div>
              </div>
            </div>

            {currentUser ? (
              <>
                <div style={styles.sidebarInfoCard}>
                  <div style={styles.sidebarInfoTitle}>Operator</div>
                  <div style={styles.sidebarInfoName}>{currentUser.displayName}</div>
                  <div style={styles.sidebarInfoSub}>
                    Username: {currentUser.username}
                  </div>
                </div>

                <div style={styles.sidebarInfoCard}>
                  <div style={styles.sidebarInfoTitle}>Signed in</div>
                  <div style={styles.sidebarInfoName}>
                    {currentUser.displayName} ({currentUser.username})
                  </div>
                  <button
                    style={{ ...styles.secondaryButton, width: "100%", marginTop: 12 }}
                    onClick={handleLogout}
                  >
                    Log out
                  </button>
                </div>
              </>
            ) : null}
          </div>

          <div style={styles.navCard}>
            <div style={styles.navSectionTitle}>Workflow</div>
            <div style={styles.navItemActive}>Upload workspace</div>
            <div style={styles.navItem}>TXT generator</div>
            <div style={styles.navItem}>Short link tools</div>
          </div>

          <div style={styles.navCard}>
            <div style={styles.navSectionTitle}>Current flow</div>
            <ul style={styles.miniList}>
              <li>Choose page and folder destination</li>
              <li>Generate the OKURL short link</li>
              <li>Write and download the TXT file</li>
              <li>Upload the mp4 and matching txt</li>
              <li>Review the summary and submit to n8n</li>
            </ul>
          </div>
        </aside>

        <div style={styles.mainArea}>
          <div style={styles.topbar}>
            <div>
              <div style={styles.badge}>Admin Workspace</div>
              <h1 style={styles.title}>Content Upload Dashboard</h1>
              <p style={styles.subtitle}>
                Enter the original URL, choose the OKURL project, generate a short link,
                then prepare TXT content and upload the video with the matching TXT file.
              </p>
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
                      <label style={styles.label}>Google Drive Folder</label>
                      <select
                        style={styles.select}
                        value={folderName}
                        onChange={(e) => setFolderName(e.target.value)}
                      >
                        {availableFolders.map((folder) => (
                          <option key={folder} value={folder}>
                            {folder}
                          </option>
                        ))}
                      </select>
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
                      <div style={styles.panelTitle}>TXT generator</div>
                    </div>
                  </div>

                  <div style={styles.panelDesc}>
                    Write the TXT content, then download it before uploading.
                  </div>

                  <div style={styles.formStack}>
                    <div>
                      <label style={styles.label}>TXT Description</label>
                      <textarea
                        rows={3}
                        style={styles.textareaLarge}
                        value={txtDescription}
                        onChange={(e) => setTxtDescription(e.target.value)}
                        placeholder="Write the TXT content here"
                      />
                    </div>
                  </div>

                  <div style={styles.inlineActions}>
                    <button type="button" style={styles.secondaryButton} onClick={downloadTxt}>
                      Download UTF-8 TXT
                    </button>
                  </div>
                </section>

                <section style={styles.panel}>
                  <div style={styles.sectionHeader}>
                    <div>
                      <div style={styles.kicker}>Step 4</div>
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
                      <div style={styles.kicker}>Step 5</div>
                      <div style={styles.panelTitle}>n8n Submission</div>
                    </div>
                  </div>

                  <div style={styles.panelDesc}>
                    Review the current summary, then submit everything to n8n.
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
                      {submitting ? "Submitting..." : "Submit to n8n"}
                    </button>
                  </div>

                  {success ? <div style={styles.successBox}>{success}</div> : null}
                  {error ? <div style={styles.errorBox}>{error}</div> : null}
                </section>
              </div>

              <aside style={styles.actionColumn}>
                <div style={styles.actionStack}>
                  <section style={styles.actionPanel}>
                    <div style={styles.actionTitle}>Notes</div>
                    <ul style={styles.miniList}>
                      <li>Step 1: Choose page and folder destination</li>
                      <li>Step 2: Generate the OKURL short link</li>
                      <li>Step 3: Write and download the TXT file</li>
                      <li>Step 4: Upload the mp4 and matching txt</li>
                      <li>Step 5: Review the summary and submit to n8n</li>
                    </ul>
                  </section>
                </div>
              </aside>
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
    background: "#f4f7fb",
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
    background: "#0f1b2d",
    color: "#eef4ff",
    padding: 24,
    borderRight: "1px solid rgba(255,255,255,0.06)",
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
  logoDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    background: "#7da2ff",
    boxShadow: "0 0 0 6px rgba(125,162,255,0.18)",
  },
  logoTitle: {
    fontWeight: 800,
    fontSize: 18,
  },
  logoSub: {
    fontSize: 12,
    color: "#94a7c6",
    marginTop: 2,
  },
  sidebarInfoCard: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
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
  navCard: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.06)",
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
  navItem: {
    padding: "10px 12px",
    borderRadius: 12,
    color: "#dbe6fb",
    fontSize: 14,
  },
  navItemActive: {
    padding: "10px 12px",
    borderRadius: 12,
    background: "#1d3358",
    color: "#ffffff",
    fontWeight: 700,
    fontSize: 14,
  },
  miniList: {
    margin: 0,
    paddingLeft: 18,
    color: "inherit",
    lineHeight: 1.7,
    fontSize: 13,
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
    background: "#e8efff",
    color: "#3b5ccc",
    fontWeight: 700,
    fontSize: 12,
    borderRadius: 999,
    padding: "6px 12px",
    marginBottom: 12,
  },
  title: {
    fontSize: 36,
    lineHeight: 1.08,
    margin: 0,
    fontWeight: 800,
    letterSpacing: -0.8,
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
    gridTemplateColumns: "minmax(0, 1.6fr) 360px",
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
    background: "#ffffff",
    border: "1px solid #e6ebf3",
    borderRadius: 24,
    padding: 24,
    boxShadow: "0 8px 28px rgba(24, 39, 75, 0.05)",
  },
  actionPanel: {
    background: "#ffffff",
    border: "1px solid #e6ebf3",
    borderRadius: 20,
    padding: 20,
    boxShadow: "0 8px 28px rgba(24, 39, 75, 0.05)",
  },
  summaryCard: {
    background: "#fbfcfe",
    border: "1px solid #e6ebf3",
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
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#7a8aa2",
    fontWeight: 700,
    marginBottom: 6,
  },
  panelTitle: {
    fontSize: 28,
    fontWeight: 800,
    letterSpacing: -0.4,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: 800,
    marginBottom: 14,
  },
  panelDesc: {
    color: "#64748b",
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
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  formStack: {
    display: "grid",
    gap: 16,
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
    border: "1px solid #d9e1ee",
    background: "#fbfcfe",
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
    background: "#e8efff",
    color: "#3b5ccc",
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
    color: "#607086",
  },
  input: {
    width: "100%",
    borderRadius: 14,
    border: "1px solid #d9e1ee",
    padding: "13px 14px",
    fontSize: 15,
    outline: "none",
    background: "#fbfcfe",
    boxSizing: "border-box",
  },
  inputReadonly: {
    width: "100%",
    borderRadius: 14,
    border: "1px solid #d9e1ee",
    padding: "13px 14px",
    fontSize: 15,
    outline: "none",
    background: "#f3f6fb",
    color: "#4b5b72",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    borderRadius: 14,
    border: "1px solid #d9e1ee",
    padding: "13px 14px",
    fontSize: 15,
    outline: "none",
    background: "#fbfcfe",
    boxSizing: "border-box",
  },
  textareaLarge: {
    width: "100%",
    minHeight: 96,
    borderRadius: 14,
    border: "1px solid #d9e1ee",
    padding: "13px 14px",
    fontSize: 15,
    outline: "none",
    background: "#fbfcfe",
    resize: "vertical",
    boxSizing: "border-box",
  },
  primaryButton: {
    border: "none",
    background: "#10233f",
    color: "#fff",
    borderRadius: 14,
    padding: "14px 18px",
    fontWeight: 800,
    fontSize: 15,
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid #d7dfec",
    background: "#ffffff",
    color: "#1c2a3d",
    borderRadius: 14,
    padding: "12px 16px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  dropzone: {
    border: "2px dashed #cfd8e8",
    borderRadius: 20,
    padding: "40px 18px",
    textAlign: "center",
    background: "#f9fbff",
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
    border: "1px solid #e6ebf3",
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
