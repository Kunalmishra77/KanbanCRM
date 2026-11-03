import { randomUUID } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * File storage on Supabase Storage (S3-compatible). Files live in four private buckets and are
 * never public: the app serves them through the authenticated /api/files route, which checks the
 * user's role and then redirects to a short-lived signed URL.
 *
 * Object path inside a bucket: <uuid>__<original-name>
 */
export const UPLOAD_BUCKETS = ["invoices", "documents", "proposals", "attachments"] as const;
export type UploadBucket = (typeof UPLOAD_BUCKETS)[number];

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const SIGNED_URL_SECONDS = 60;

export function isUploadBucket(value: unknown): value is UploadBucket {
  return typeof value === "string" && (UPLOAD_BUCKETS as readonly string[]).includes(value);
}

// <uuid>__<safe original name>
const STORED_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}__[A-Za-z0-9._ -]{1,120}$/;

export function isValidStoredName(name: string) {
  return STORED_NAME.test(name);
}

function safeName(name: string) {
  return name.replace(/[^A-Za-z0-9._ -]/g, "_").replace(/\.{2,}/g, ".").slice(0, 120) || "file";
}

/** Original file name for a stored object (the part after the uuid). */
export function originalNameOf(storedName: string) {
  const idx = storedName.indexOf("__");
  return idx === -1 ? storedName : storedName.slice(idx + 2);
}

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for file storage");
  }
  // The service-role key bypasses RLS: it must only ever be used here, on the server
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

let bucketsReady: Promise<void> | null = null;

/** Creates the private buckets if they don't exist yet. Runs once per process. */
export function ensureBuckets(): Promise<void> {
  if (!bucketsReady) {
    bucketsReady = (async () => {
      const supabase = getClient();
      const { data: existing, error } = await supabase.storage.listBuckets();
      if (error) throw error;
      const have = new Set((existing ?? []).map((b) => b.name));
      for (const name of UPLOAD_BUCKETS) {
        if (have.has(name)) continue;
        const { error: createError } = await supabase.storage.createBucket(name, {
          public: false,
          fileSizeLimit: MAX_FILE_BYTES,
        });
        if (createError && !/already exists/i.test(createError.message)) throw createError;
      }
    })().catch((err) => {
      bucketsReady = null; // retry on the next upload
      throw err;
    });
  }
  return bucketsReady;
}

type SaveInput = {
  bucket: UploadBucket;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
};

export async function saveFile({ bucket, fileName, mimeType, buffer }: SaveInput) {
  await ensureBuckets();

  const storedName = `${randomUUID()}__${safeName(fileName)}`;
  const { error } = await getClient().storage.from(bucket).upload(storedName, buffer, {
    contentType: mimeType || "application/octet-stream",
    upsert: false,
  });
  if (error) throw error;

  return {
    // Stable app URL stored in the database; independent of where the bytes live
    publicUrl: `/api/files/${bucket}/${encodeURIComponent(storedName)}`,
    fileName,
    storageProvider: "supabase" as const,
  };
}

/** Short-lived download link for a stored object, or null if it doesn't exist. */
export async function createDownloadUrl(bucket: UploadBucket, storedName: string, asAttachment: boolean) {
  const { data, error } = await getClient()
    .storage.from(bucket)
    .createSignedUrl(storedName, SIGNED_URL_SECONDS, asAttachment ? { download: originalNameOf(storedName) } : undefined);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/**
 * Deletes the stored objects behind app file URLs (/api/files/<bucket>/<name>).
 * Best effort: a failure is logged, never thrown, so deleting a record can't be blocked by storage.
 */
export async function removeStoredFiles(urls: Array<string | null | undefined>) {
  const byBucket = new Map<UploadBucket, string[]>();
  for (const url of urls) {
    const m = /^\/api\/files\/([a-z]+)\/([^/?#]+)$/.exec(url ?? "");
    if (!m || !isUploadBucket(m[1])) continue;
    const name = decodeURIComponent(m[2]);
    if (!isValidStoredName(name)) continue;
    byBucket.set(m[1], [...(byBucket.get(m[1]) ?? []), name]);
  }
  for (const [bucket, names] of Array.from(byBucket)) {
    const { error } = await getClient().storage.from(bucket).remove(names);
    if (error) console.error(`Could not remove stored files from ${bucket}:`, error.message);
  }
}
