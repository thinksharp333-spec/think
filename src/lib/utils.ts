import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeSubject(subject: string | null | undefined): string {
  if (!subject) return "Other";
  
  const trimmed = subject.trim();
  const lower = trimmed.toLowerCase();
  
  // Specific mappings
  if (lower.startsWith("animal stor")) return "Animal Stories";
  if (lower.startsWith("biograph")) return "Biographies";
  if (lower === "poem" || lower === "poems") return "Poems";
  if (lower === "others" || lower === "other") return "Other";
  if (lower === "story" || lower === "stories" || lower === "stories 1" || lower === "stories (1)") return "Stories";
  if (lower === "stem") return "STEM";
  if (lower === "thinksharp books") return "ThinkSharp Books";
  
  // Default: Title Case
  return trimmed.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
