/**
 * Text formatting utilities
 * 
 * Provides functions for formatting and truncating text in terminal UIs.
 * These utilities are useful for displaying content within constrained widths
 * and ensuring consistent formatting across components.
 * 
 * @module utils/formatting
 */

/**
 * Truncates a string to a maximum length, appending "..." if truncated.
 * 
 * If the string is shorter than maxLength, it is returned unchanged.
 * If maxLength is 0 or negative, the original string is returned.
 * 
 * @param str - The string to truncate
 * @param maxLength - Maximum length of the resulting string (including "...")
 * @returns The truncated string with "..." appended if needed
 * 
 * @example
 * ```ts
 * truncate("Hello World", 8)  // "Hello..."
 * truncate("Hi", 8)           // "Hi"
 * truncate("Hello World", 0)  // "Hello World"
 * ```
 */
export function truncate(str: string, maxLength: number): string {
  if (maxLength <= 0) return str;
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, Math.max(0, maxLength - 3)) + "...";
}

/**
 * Clamps a width value to a minimum value.
 * 
 * Useful for ensuring UI elements have a minimum usable width,
 * preventing layout issues with very small terminal sizes.
 * 
 * @param width - The width value to clamp
 * @param min - Minimum allowed width (default: 8)
 * @returns The clamped width value
 * 
 * @example
 * ```ts
 * clampWidth(5, 8)   // 8
 * clampWidth(10, 8)  // 10
 * clampWidth(3)      // 8 (uses default min)
 * ```
 */
export function clampWidth(width: number, min: number = 8): number {
  return Math.max(min, width);
}

/**
 * Generates a separator string of a specified width.
 * 
 * Creates a horizontal separator line using the "─" character.
 * Useful for creating visual dividers in terminal UIs.
 * 
 * @param width - Desired width of the separator
 * @param minLength - Minimum length of the separator (default: 5)
 * @returns A string of "─" characters
 * 
 * @example
 * ```ts
 * getSeparator(10)      // "──────────"
 * getSeparator(3, 5)     // "─────" (uses minLength)
 * ```
 */
export function getSeparator(width: number, minLength: number = 5): string {
  return "─".repeat(Math.max(minLength, width));
}

/**
 * Normalizes a repository URL for consistent comparison and display.
 * 
 * Removes protocol prefixes, .git suffix, trailing slashes, and converts
 * to lowercase. This ensures that URLs like "https://github.com/user/repo.git"
 * and "github.com/user/repo" are treated as equivalent.
 * 
 * @param url - The repository URL to normalize
 * @returns The normalized URL string (empty string if input is falsy)
 * 
 * @example
 * ```ts
 * normalizeRepositoryUrl("https://github.com/user/repo.git")
 * // "github.com/user/repo"
 * 
 * normalizeRepositoryUrl("http://github.com/user/repo/")
 * // "github.com/user/repo"
 * ```
 */
export function normalizeRepositoryUrl(url: string): string {
  if (!url) return "";
  return url
    .replace(/^https?:\/\//, "") // Remove http:// or https:// prefix
    .replace(/\.git$/, "")
    .replace(/\/$/, "") // Remove trailing slash
    .toLowerCase()
    .trim();
}

