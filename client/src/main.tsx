import { createRoot } from "react-dom/client";
import { useEffect } from "react";
import { ThemeProvider, useTheme } from "next-themes";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

// Offline fallback + installability. Skipped in dev so Vite HMR is never intercepted.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => console.warn("Service worker registration failed:", err));
  });
}

// The installed desktop/phone app paints its title bar with <meta name="theme-color">; keep it matching the page
// (and the in-app Light / Dark / System choice) instead of a fixed brand colour.
function ThemeColorSync() {
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    const color = resolvedTheme === "dark" ? "#080c17" : "#f5f5f9";
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", color);
  }, [resolvedTheme]);
  return null;
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <ThemeColorSync />
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </ThemeProvider>
);
