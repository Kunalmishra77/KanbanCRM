import { useCallback, useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function detectStandalone() {
  if (typeof window === "undefined") return false;
  // A normal tab is display-mode "browser". Every installed mode (standalone, minimal-ui, fullscreen,
  // window-controls-overlay, tabbed) is something else, so this covers them all.
  const inBrowserTab = window.matchMedia("(display-mode: browser)").matches;
  return (
    !inBrowserTab ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches ||
    (navigator as any).standalone === true
  );
}

function detectIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/.test(ua) || iPadOS;
}

/**
 * Drives the "Install app" button. Chrome/Edge/Android fire `beforeinstallprompt`;
 * iOS Safari has no install API, so callers show Add-to-Home-Screen instructions instead.
 */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(detectStandalone);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return "unavailable" as const;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    return outcome;
  }, [deferred]);

  return {
    installed,
    canPromptInstall: !!deferred,
    isIOS: detectIOS(),
    install,
  };
}
