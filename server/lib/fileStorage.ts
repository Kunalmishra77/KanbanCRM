import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

/**
 * Local file storage. Uploaded files live inside the project, under
 *   <STORAGE_DIR>/uploads/<bucket>/<uuid>__<original-name>
 * STORAGE_DIR defaults to ./storage. In Docker/Coolify, mount a persistent volume on that
 * directory (e.g. /app/storage) or the files are lost when the container is rebuilt.
 */
export const UPLOAD_BUCKETS = ["invoices", "documents", "proposals", "attachments"] as const;
export type UploadBucket = (typeof UPLOAD_BUCKETS)[number];

export function isUploadBucket(value: unknown): value is UploadBucket {
  return typeof value === "string" && (UPLOAD_BUCKETS as readonly string[]).includes(value);
}

export function getStorageRoot() {
  return path.resolve(process.env.STORAGE_DIR || path.join(process.cwd(), "storage"));
}

function bucketDir(bucket: UploadBucket) {
  return path.join(getStorageRoot(), "uploads", bucket);
}

// <uuid>__<safe original name>
const STORED_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}__[A-Za-z0-9._ -]{1,120}$/;

function safeName(name: string) {
  return name.replace(/[^A-Za-z0-9._ -]/g, "_").replace(/\.{2,}/g, ".").slice(0, 120) || "file";
}

type SaveInput = {
  bucket: UploadBucket;
  fileName: string;
  buffer: Buffer;
};

export async function saveFile({ bucket, fileName, buffer }: SaveInput) {
  const dir = bucketDir(bucket);
  await fs.promises.mkdir(dir, { recursive: true });

  const storedName = `${randomUUID()}__${safeName(fileName)}`;
  // wx: never overwrite an existing file
  await fs.promises.writeFile(path.join(dir, storedName), buffer, { flag: "wx" });

  return {
    publicUrl: `/api/files/${bucket}/${encodeURIComponent(storedName)}`,
    fileName,
    storageProvider: "local" as const,
  };
}

/** Resolves a stored file to an absolute path, or null if the request is malformed or the file is missing. */
export function resolveStoredFile(bucket: string, storedName: string): string | null {
  if (!isUploadBucket(bucket) || !STORED_NAME.test(storedName)) return null;

  const dir = bucketDir(bucket);
  const full = path.resolve(dir, storedName);
  // Defence in depth on top of the filename allowlist
  if (path.dirname(full) !== dir) return null;
  return fs.existsSync(full) ? full : null;
}

/** Original file name for a stored file (the part after the uuid). */
export function originalNameOf(storedName: string) {
  const idx = storedName.indexOf("__");
  return idx === -1 ? storedName : storedName.slice(idx + 2);
}
