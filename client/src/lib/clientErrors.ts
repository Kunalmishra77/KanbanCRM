// Errors the user saw in the browser: report them, and recover by itself after a new version goes live.

/** Tell the server about an error the user saw (best effort, never throws). */
export function reportClientError(where: string, err: unknown) {
  try {
    const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    fetch("/api/client-error", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ where, message, url: location.pathname + location.search }), keepalive: true }).catch(() => {});
  } catch {}
}

/**
 * A new version of the app renames its page files. A tab opened before the release then fails to load the
 * next page it needs ("Something went wrong", fixed by reloading). Reload once by itself instead.
 */
export function reloadForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem("crm-version-reload") || 0);
    if (Date.now() - last < 60_000) return false; // already tried within the last minute: don't loop
    sessionStorage.setItem("crm-version-reload", String(Date.now()));
  } catch {}
  window.location.reload();
  return true;
}
