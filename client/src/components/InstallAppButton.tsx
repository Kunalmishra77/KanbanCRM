import { useState } from "react";
import { Download, MonitorSmartphone, Share, PlusSquare, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useInstallPrompt } from "@/hooks/use-install-prompt";

interface InstallAppButtonProps {
  /** "icon" is the compact top-bar button, "card" the full-width button used on Settings */
  variant?: "icon" | "card";
}

export function InstallAppButton({ variant = "icon" }: InstallAppButtonProps) {
  const { installed, canPromptInstall, isIOS, install } = useInstallPrompt();
  const [showHelp, setShowHelp] = useState(false);

  // Already running as an installed app
  if (installed) return variant === "card" ? <InstalledNote /> : null;

  const handleClick = async () => {
    if (canPromptInstall) {
      await install();
    } else {
      setShowHelp(true);
    }
  };

  return (
    <>
      {variant === "icon" ? (
        <Button
          variant="outline"
          size="sm"
          onClick={handleClick}
          className="h-9 gap-2 rounded-full border-primary/30 bg-white/60 dark:bg-white/[0.08] text-primary hover:bg-primary/10"
          aria-label="Install AGENTiX app"
          data-testid="button-install-app"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Install app</span>
        </Button>
      ) : (
        <Button onClick={handleClick} className="gap-2" data-testid="button-install-app-card">
          <Download className="h-4 w-4" />
          Install AGENTiX app
        </Button>
      )}

      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MonitorSmartphone className="h-5 w-5 text-primary" />
              Install AGENTiX
            </DialogTitle>
            <DialogDescription>
              Add the CRM to your device for one-tap access in its own window, with no browser bar.
            </DialogDescription>
          </DialogHeader>

          {isIOS ? (
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <Share className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>Open this page in <b>Safari</b> and tap the <b>Share</b> button.</span>
              </li>
              <li className="flex items-start gap-3">
                <PlusSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>Choose <b>Add to Home Screen</b>, then tap <b>Add</b>.</span>
              </li>
            </ol>
          ) : (
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <MoreVertical className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  In <b>Chrome</b> or <b>Edge</b>, open the browser menu (<b>⋮</b>) and choose{" "}
                  <b>Install AGENTiX</b> (or <b>Add to Home screen</b> on Android).
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Download className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  On desktop you can also click the install icon at the right end of the address bar.
                </span>
              </li>
            </ol>
          )}
          <p className="text-xs text-muted-foreground">
            The install option appears only on the live HTTPS site and in browsers that support installing web apps.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}

function InstalledNote() {
  return (
    <p className="text-sm text-muted-foreground" data-testid="text-app-installed">
      AGENTiX is installed on this device.
    </p>
  );
}
