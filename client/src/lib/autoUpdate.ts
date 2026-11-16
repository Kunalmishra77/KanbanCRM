// Keeps every open tab and installed app on the newest version.
//
// A tab or installed app left open for days kept running old code after a release (on 16 Nov someone was
// still on a version from before 14 Nov and kept hitting bugs that were already fixed). Every 5 minutes,
// and when the tab comes back to the front, we ask the server which main script the live app uses; when
// it differs from ours, a new version is out and the tab reloads itself, but never while someone is typing.

const CHECK_EVERY_MS = 5 * 60_000;

function loadedScript(): string | null {
  const el = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/"]');
  return el ? el.src.split("/").pop() || null : null;
}

async function liveScript(): Promise<string | null> {
  const res = await fetch(`/?version-check=${Date.now()}`, { cache: "no-store", credentials: "same-origin" });
  if (!res.ok) return null;
  const m = (await res.text()).match(/\/assets\/(index-[^"'\s>]+\.js)/);
  return m ? m[1] : null;
}

function someoneIsTyping(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && !["button", "checkbox", "radio", "range", "submit"].includes((el as HTMLInputElement).type));
}

let reloading = false;
function reloadWhenIdle() {
  if (reloading) return;
  if (!document.hidden && someoneIsTyping()) {
    setTimeout(reloadWhenIdle, 30_000); // try again once they stop typing
    return;
  }
  reloading = true;
  window.location.reload();
}

async function check() {
  try {
    const mine = loadedScript();
    if (!mine) return; // dev server or unusual page: nothing to compare
    const live = await liveScript();
    if (live && live !== mine) reloadWhenIdle();
  } catch {
    // offline or server restarting: try again next time
  }
}

export function startAutoUpdate() {
  if (!import.meta.env.PROD) return;
  setInterval(check, CHECK_EVERY_MS);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) void check();
  });
}
