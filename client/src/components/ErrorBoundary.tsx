import { Component, type ErrorInfo, type ReactNode } from "react";
import { reportClientError, reloadForNewVersion } from "@/lib/clientErrors";

// A page file that no longer exists after a new version went live
const isNewVersionError = (e: unknown) =>
  /dynamically imported module|Importing a module script failed|error loading dynamically|ChunkLoadError|Loading chunk/i.test(String((e as any)?.message || e));

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error:", error, info.componentStack);
    reportClientError(isNewVersionError(error) ? "new version" : "screen", `${error?.message || error} @ ${(info.componentStack || "").split("\n").filter(Boolean).slice(0, 3).join(" < ")}`);
    if (isNewVersionError(error)) reloadForNewVersion();
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div role="alert" className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-muted-foreground max-w-md">
          The page hit an unexpected error. Your data is safe. Reload to continue.
        </p>
        <button
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
      </div>
    );
  }
}
