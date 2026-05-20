import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getFirstName(full?: string | null): string {
  if (!full) return "Médico";
  const parts = full.trim().split(/\s+/);
  return parts[0] ?? "Médico";
}

export function formatPublicId(id?: string | null): string {
  if (!id) return "#----";
  return `#${id}`;
}
