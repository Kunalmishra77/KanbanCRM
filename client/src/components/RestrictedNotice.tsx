import { Lock } from "lucide-react";

export function RestrictedNotice({ message = "You don't have access to this page." }: { message?: string }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 py-24 text-center text-muted-foreground"
      data-testid="restricted-notice"
    >
      <Lock className="h-8 w-8" aria-hidden="true" />
      <p className="font-medium text-foreground">Access restricted</p>
      <p className="text-sm max-w-sm">{message}</p>
    </div>
  );
}
