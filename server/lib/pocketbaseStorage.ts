const DEFAULT_COLLECTION = "crm_files";

type PocketBaseUploadInput = {
  bucket: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  uploadedBy?: string;
};

type PocketBaseAuth = {
  token: string;
};

function getPocketBaseUrl() {
  const url = process.env.POCKETBASE_URL || process.env.PB_URL;
  if (!url) {
    throw new Error("POCKETBASE_URL is required for file uploads");
  }
  return url.replace(/\/+$/, "");
}

function getCollectionName() {
  return process.env.POCKETBASE_FILES_COLLECTION || DEFAULT_COLLECTION;
}

async function parsePocketBaseResponse(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { message: text };
  }
}

async function pocketBaseFetch(path: string, init: RequestInit = {}) {
  const baseUrl = getPocketBaseUrl();
  return fetch(`${baseUrl}${path}`, init);
}

async function authenticatePocketBase(): Promise<PocketBaseAuth | null> {
  const identity =
    process.env.POCKETBASE_SUPERUSER_EMAIL ||
    process.env.POCKETBASE_ADMIN_EMAIL ||
    process.env.PB_ADMIN_EMAIL;
  const password =
    process.env.POCKETBASE_SUPERUSER_PASSWORD ||
    process.env.POCKETBASE_ADMIN_PASSWORD ||
    process.env.PB_ADMIN_PASSWORD;

  if (!identity || !password) return null;

  const payload = JSON.stringify({ identity, password });
  const authPaths = [
    "/api/collections/_superusers/auth-with-password",
    "/api/admins/auth-with-password",
  ];

  for (const path of authPaths) {
    const response = await pocketBaseFetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });

    if (response.ok) {
      const data = await parsePocketBaseResponse(response);
      return { token: data.token };
    }
  }

  throw new Error("PocketBase admin authentication failed");
}

async function ensureFilesCollection(auth: PocketBaseAuth | null) {
  if (!auth) return;

  const collection = getCollectionName();
  const headers = { Authorization: `Bearer ${auth.token}` };
  const existing = await pocketBaseFetch(`/api/collections/${encodeURIComponent(collection)}`, {
    headers,
  });

  if (existing.ok) return;
  if (existing.status !== 404) {
    const error = await parsePocketBaseResponse(existing);
    throw new Error(error.message || "Failed to inspect PocketBase files collection");
  }

  const response = await pocketBaseFetch("/api/collections", {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: collection,
      type: "base",
      listRule: null,
      viewRule: "",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: "bucket", type: "text", required: true },
        { name: "original_name", type: "text", required: true },
        { name: "mime_type", type: "text", required: false },
        { name: "uploaded_by", type: "text", required: false },
        {
          name: "file",
          type: "file",
          required: true,
          maxSelect: 1,
          maxSize: 50 * 1024 * 1024,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await parsePocketBaseResponse(response);
    throw new Error(error.message || "Failed to create PocketBase files collection");
  }
}

export async function uploadToPocketBase(input: PocketBaseUploadInput) {
  const collection = getCollectionName();
  const auth = await authenticatePocketBase();
  await ensureFilesCollection(auth);

  const form = new FormData();
  form.set("bucket", input.bucket);
  form.set("original_name", input.fileName);
  form.set("mime_type", input.mimeType);
  if (input.uploadedBy) form.set("uploaded_by", input.uploadedBy);
  form.set("file", new Blob([input.buffer], { type: input.mimeType }), input.fileName);

  const response = await pocketBaseFetch(`/api/collections/${encodeURIComponent(collection)}/records`, {
    method: "POST",
    headers: auth ? { Authorization: `Bearer ${auth.token}` } : undefined,
    body: form,
  });

  const data = await parsePocketBaseResponse(response);
  if (!response.ok) {
    throw new Error(data.message || "PocketBase file upload failed");
  }

  const storedFileName = Array.isArray(data.file) ? data.file[0] : data.file;
  if (!storedFileName) {
    throw new Error("PocketBase upload did not return a file name");
  }

  const publicUrl = `${getPocketBaseUrl()}/api/files/${encodeURIComponent(collection)}/${data.id}/${encodeURIComponent(storedFileName)}`;

  return {
    publicUrl,
    fileName: input.fileName,
    storageProvider: "pocketbase",
    recordId: data.id,
  };
}
