import { NextResponse } from "next/server";

import { errorResponse, pickFirstString } from "../../_shortsgen";

export const runtime = "nodejs";

type DownloadItem = {
  fileName: string;
  url: string;
};

const isPrivateHostname = (hostname: string) => {
  const host = hostname.trim().toLowerCase();

  if (!host) return true;
  if (host === "localhost" || host.endsWith(".local")) return true;
  if (host === "127.0.0.1" || host === "::1") return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^169\.254\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;

  return false;
};

const sanitizeDownloadFileName = (value: string, fallback: string) => {
  const trimmed = value.trim().replace(/[\\/:*?"<>|]+/g, "-");
  const collapsed = trimmed.replace(/\s+/g, " ").replace(/^\.+/, "").trim();

  if (!collapsed) return fallback;
  return collapsed;
};

const buildContentDisposition = (fileName: string) => {
  const encoded = encodeURIComponent(fileName);
  return `attachment; filename="${fileName}"; filename*=UTF-8''${encoded}`;
};

const validateTargetUrl = (targetUrl: string) => {
  let parsed: URL;

  try {
    parsed = new URL(targetUrl);
  } catch {
    throw new Error("Invalid download URL.");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Only https download URLs are allowed.");
  }

  if (isPrivateHostname(parsed.hostname)) {
    throw new Error("Private or local hosts are not allowed.");
  }

  return parsed;
};

const normalizeDownloadItems = (body: any): DownloadItem[] => {
  if (Array.isArray(body?.files) && body.files.length) {
    return body.files
      .map((item: any, index: number) => ({
        url: pickFirstString(item?.url),
        fileName: sanitizeDownloadFileName(
          pickFirstString(item?.fileName),
          `video${index + 1}.mp4`
        ),
      }))
      .filter((item: DownloadItem) => item.url);
  }

  const targetUrl = pickFirstString(body?.url);

  if (!targetUrl) {
    return [];
  }

  return [
    {
      url: targetUrl,
      fileName: sanitizeDownloadFileName(
        pickFirstString(body?.fileName),
        "short.mp4"
      ),
    },
  ];
};

const fetchDownloadItem = async (item: DownloadItem) => {
  const parsed = validateTargetUrl(item.url);
  const upstream = await fetch(parsed.toString(), {
    method: "GET",
    cache: "no-store",
  });

  if (!upstream.ok) {
    throw new Error(`Failed to fetch shorts file (${upstream.status}).`);
  }

  const arrayBuffer = await upstream.arrayBuffer();

  return {
    fileName: item.fileName,
    contentType: upstream.headers.get("content-type") || "video/mp4",
    contentLength: upstream.headers.get("content-length"),
    data: Buffer.from(arrayBuffer),
  };
};

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let current = index;

    for (let bit = 0; bit < 8; bit += 1) {
      current =
        (current & 1) !== 0 ? 0xedb88320 ^ (current >>> 1) : current >>> 1;
    }

    table[index] = current >>> 0;
  }

  return table;
})();

const computeCrc32 = (buffer: Buffer) => {
  let crc = 0xffffffff;

  for (let index = 0; index < buffer.length; index += 1) {
    const byte = buffer[index];
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
};

const getDosDateTime = (date = new Date()) => {
  const year = Math.max(date.getFullYear(), 1980);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);

  return {
    dosTime: (hours << 11) | (minutes << 5) | seconds,
    dosDate: ((year - 1980) << 9) | (month << 5) | day,
  };
};

const buildZipArchive = (
  files: Array<{
    data: Buffer;
    fileName: string;
  }>
) => {
  const { dosDate, dosTime } = getDosDateTime();
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  files.forEach((file) => {
    const fileNameBytes = Buffer.from(file.fileName, "utf8");
    const localHeader = Buffer.alloc(30);
    const centralHeader = Buffer.alloc(46);
    const crc32 = computeCrc32(file.data);

    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc32, 14);
    localHeader.writeUInt32LE(file.data.length, 18);
    localHeader.writeUInt32LE(file.data.length, 22);
    localHeader.writeUInt16LE(fileNameBytes.length, 26);
    localHeader.writeUInt16LE(0, 28);

    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc32, 16);
    centralHeader.writeUInt32LE(file.data.length, 20);
    centralHeader.writeUInt32LE(file.data.length, 24);
    centralHeader.writeUInt16LE(fileNameBytes.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    localParts.push(localHeader, fileNameBytes, file.data);
    centralParts.push(centralHeader, fileNameBytes);

    offset += localHeader.length + fileNameBytes.length + file.data.length;
  });

  const centralDirectory = Buffer.concat(centralParts);
  const endOfCentralDirectory = Buffer.alloc(22);

  endOfCentralDirectory.writeUInt32LE(0x06054b50, 0);
  endOfCentralDirectory.writeUInt16LE(0, 4);
  endOfCentralDirectory.writeUInt16LE(0, 6);
  endOfCentralDirectory.writeUInt16LE(files.length, 8);
  endOfCentralDirectory.writeUInt16LE(files.length, 10);
  endOfCentralDirectory.writeUInt32LE(centralDirectory.length, 12);
  endOfCentralDirectory.writeUInt32LE(offset, 16);
  endOfCentralDirectory.writeUInt16LE(0, 20);

  return Buffer.concat([
    ...localParts,
    centralDirectory,
    endOfCentralDirectory,
  ]);
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const items = normalizeDownloadItems(body);

    if (!items.length) {
      return NextResponse.json(
        { error: "Missing required field: url" },
        { status: 400 }
      );
    }

    const archive = Boolean(body?.archive) || items.length > 1;
    const downloads = await Promise.all(items.map((item) => fetchDownloadItem(item)));

    if (!archive && downloads.length === 1) {
      const [download] = downloads;

      return new NextResponse(download.data, {
        status: 200,
        headers: {
          "Content-Type": download.contentType,
          ...(download.contentLength
            ? { "Content-Length": download.contentLength }
            : {}),
          "Content-Disposition": buildContentDisposition(download.fileName),
          "Cache-Control": "no-store",
        },
      });
    }

    const archiveName = sanitizeDownloadFileName(
      pickFirstString(body?.archive_name),
      "selected-shorts.zip"
    );
    const zipBuffer = buildZipArchive(downloads);

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Length": String(zipBuffer.length),
        "Content-Disposition": buildContentDisposition(archiveName),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
