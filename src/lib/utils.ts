import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Parseia strings de data (YYYY-MM-DD) como data local, evitando offset UTC
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.substring(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}
