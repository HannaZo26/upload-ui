import { randomUUID } from "node:crypto";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type CloudflareUploadPlanRequestFile = {
  clientId: string;
  name: string;
  size: number;
  type?: string;
  lastModified?: number;
};

export type CloudflareUploadPlanFile = {
  clientId: string;
  fileName: string;
  key: string;
  uploadUrl: string;
  publicUrl: string;
  contentType: string;
  size: number;
  lastModified: number;
};

export type CloudflareUploadSession = {
  sessionId: string;
  objectPrefix: string;
  manifestKey: string;
  files: CloudflareUploadPlanFile[];
};

type CloudflareR2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region: string;
  publicBaseUrl: string;
  signedUrlExpiresInSeconds: number;
};

const MAX_SINGLE_FILE_BYTES = 1024 * 1024 * 1024;
const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 60;

const requiredEnv = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
};

export const getCloudflareR2Config = (): CloudflareR2Config => {
  const signedUrlExpiresInSeconds = Number(
    process.env.CLOUDFLARE_R2_SIGNED_URL_TTL_SECONDS || DEFAULT_SIGNED_URL_TTL_SECONDS
  );

  return {
    accountId: requiredEnv("CLOUDFLARE_R2_ACCOUNT_ID"),
    accessKeyId: requiredEnv("CLOUDFLARE_R2_ACCESS_KEY_ID"),
    secretAccessKey: requiredEnv("CLOUDFLARE_R2_SECRET_ACCESS_KEY"),
    bucket: requiredEnv("CLOUDFLARE_R2_BUCKET"),
    region: process.env.CLOUDFLARE_R2_REGION?.trim() || "auto",
    publicBaseUrl: (process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL || "").trim().replace(/\/+$/, ""),
    signedUrlExpiresInSeconds:
      Number.isFinite(signedUrlExpiresInSeconds) && signedUrlExpiresInSeconds > 60
        ? signedUrlExpiresInSeconds
        : DEFAULT_SIGNED_URL_TTL_SECONDS,
  };
};

export const sanitizeStoragePathSegment = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "unknown";

const splitFileName = (fileName: string) => {
  const trimmed = fileName.trim() || "file";
  const match = trimmed.match(/^(.*?)(\.[^.]+)?$/);
  const baseName = sanitizeStoragePathSegment(match?.[1] || "file");
  const extension = (match?.[2] || "").toLowerCase();
  return {
    baseName,
    extension,
  };
};

const formatDateFolder = (timestamp = Date.now()) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date(timestamp)).replace(/-/g, "");
};

export const getCloudflareR2Client = () => {
  const config = getCloudflareR2Config();

  return new S3Client({
    region: config.region,
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
};

const buildPublicUrl = (baseUrl: string, key: string) => {
  if (!baseUrl) return "";
  const encodedPath = key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${baseUrl}/${encodedPath}`;
};

export const buildUploadSession = async (input: {
  username: string;
  pageName: string;
  files: CloudflareUploadPlanRequestFile[];
}) => {
  const config = getCloudflareR2Config();
  const client = getCloudflareR2Client();
  const timestamp = Date.now();
  const sessionId = randomUUID();
  const objectPrefix = [
    "incoming",
    sanitizeStoragePathSegment(input.pageName),
    formatDateFolder(timestamp),
    `${timestamp}-${sanitizeStoragePathSegment(input.username)}-${sessionId}`,
  ].join("/");
  const manifestKey = `${objectPrefix}/manifest.json`;

  const files = await Promise.all(
    input.files.map(async (file, index) => {
      if (!file.clientId.trim()) {
        throw new Error(`files[${index}].clientId is required.`);
      }
      if (!file.name.trim()) {
        throw new Error(`files[${index}].name is required.`);
      }
      if (!Number.isFinite(file.size) || file.size <= 0) {
        throw new Error(`files[${index}].size must be greater than 0.`);
      }
      if (file.size > MAX_SINGLE_FILE_BYTES) {
        throw new Error(
          `${file.name} is larger than the current 1 GB single-upload limit for this portal.`
        );
      }

      const { baseName, extension } = splitFileName(file.name);
      const contentType = (file.type || "").trim() || "application/octet-stream";
      const key = `${objectPrefix}/${String(index + 1).padStart(2, "0")}-${baseName}${extension}`;
      const uploadUrl = await getSignedUrl(
        client,
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          ContentType: contentType,
          Metadata: {
            clientid: file.clientId,
            originalname: file.name,
          },
        }),
        {
          expiresIn: config.signedUrlExpiresInSeconds,
        }
      );

      return {
        clientId: file.clientId,
        fileName: file.name,
        key,
        uploadUrl,
        publicUrl: buildPublicUrl(config.publicBaseUrl, key),
        contentType,
        size: file.size,
        lastModified: Number(file.lastModified || 0),
      };
    })
  );

  return {
    sessionId,
    objectPrefix,
    manifestKey,
    files,
  } satisfies CloudflareUploadSession;
};

export const uploadJsonToR2 = async (key: string, payload: unknown) => {
  const config = getCloudflareR2Config();
  const client = getCloudflareR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: JSON.stringify(payload, null, 2),
      ContentType: "application/json; charset=utf-8",
    })
  );

  return buildPublicUrl(config.publicBaseUrl, key);
};

export const getR2StorageDescriptor = () => {
  const config = getCloudflareR2Config();
  return {
    provider: "cloudflare-r2",
    bucket: config.bucket,
    region: config.region,
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    publicBaseUrl: config.publicBaseUrl,
  };
};
