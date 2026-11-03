import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** "First Last" without stray spaces or "null"/"undefined" for missing parts. */
export function userFullName(user?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null) {
  if (!user) return "";
  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.replace(/\s+/g, " ").trim();
  return name || user.email || "";
}
