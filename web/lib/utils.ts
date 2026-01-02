import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse a date string in European format (dd/mm/yyyy, dd.mm.yyyy, dd-mm-yyyy)
 * Also handles: yyyy, mm/yyyy, ISO dates
 * Returns { day?, month?, year } or null if unparseable
 */
export function parseEuropeanDate(input: string | null | undefined): { day?: number; month?: number; year: number } | null {
  if (!input) return null;
  const s = input.trim();

  // Just a year: "2024"
  if (/^\d{4}$/.test(s)) {
    return { year: parseInt(s) };
  }

  // Month/year: "01/2024", "01.2024", "01-2024", "1/2024"
  const monthYearMatch = s.match(/^(\d{1,2})[\/.\-](\d{4})$/);
  if (monthYearMatch) {
    const month = parseInt(monthYearMatch[1]);
    const year = parseInt(monthYearMatch[2]);
    if (month >= 1 && month <= 12) {
      return { month, year };
    }
  }

  // Full date: "02/01/2024", "02.01.2024", "02-01-2024" (European: dd/mm/yyyy)
  const fullDateMatch = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  if (fullDateMatch) {
    const day = parseInt(fullDateMatch[1]);
    const month = parseInt(fullDateMatch[2]);
    const year = parseInt(fullDateMatch[3]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return { day, month, year };
    }
  }

  // ISO format: "2024-01-02" (yyyy-mm-dd)
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1]);
    const month = parseInt(isoMatch[2]);
    const day = parseInt(isoMatch[3]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return { day, month, year };
    }
  }

  return null;
}

/**
 * Convert parsed date to Date object
 */
function parsedToDate(parsed: { day?: number; month?: number; year: number }): Date {
  const day = parsed.day || 1;
  const month = (parsed.month || 1) - 1; // JS months are 0-indexed
  return new Date(parsed.year, month, day);
}

/**
 * Smart date parser - handles European formats
 * Use this instead of new Date() for user input
 */
export function parseDate(input: string | null | undefined): Date | null {
  const parsed = parseEuropeanDate(input);
  if (!parsed) return null;
  return parsedToDate(parsed);
}

/**
 * Format date as dd/mm/yyyy (European format)
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? parseDate(date) || new Date(date) : date;
  if (isNaN(d.getTime())) return "";

  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format date with month name: "15 Jan 2024"
 */
export function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? parseDate(date) || new Date(date) : date;
  if (isNaN(d.getTime())) return "";

  const day = d.getDate();
  const month = d.toLocaleDateString("en-GB", { month: "short" });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Format date with full month: "15 January 2024"
 */
export function formatDateLong(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? parseDate(date) || new Date(date) : date;
  if (isNaN(d.getTime())) return "";

  const day = d.getDate();
  const month = d.toLocaleDateString("en-GB", { month: "long" });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Format date with month and year only: "Jan 2024"
 */
export function formatMonthYear(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? parseDate(date) || new Date(date) : date;
  if (isNaN(d.getTime())) return "";

  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

/**
 * Format a flexible date input for display
 * Handles: "2024", "01/2024", "02/01/2024", ISO dates
 * Returns: "2024", "January 2024", "2 January 2024"
 */
export function formatFlexibleDate(input: string | null | undefined): string {
  if (!input) return "";

  const parsed = parseEuropeanDate(input);
  if (!parsed) {
    // Fallback: try native Date parsing
    const d = new Date(input);
    if (!isNaN(d.getTime())) {
      return formatDateLong(d);
    }
    return input; // Return as-is if we can't parse
  }

  // Year only
  if (!parsed.month && !parsed.day) {
    return String(parsed.year);
  }

  // Month and year only
  if (!parsed.day) {
    const d = new Date(parsed.year, (parsed.month || 1) - 1, 1);
    return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  }

  // Full date
  const d = parsedToDate(parsed);
  const day = d.getDate();
  const month = d.toLocaleDateString("en-GB", { month: "long" });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}
