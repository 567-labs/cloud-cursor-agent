/**
 * Layout utilities for terminal rendering.
 */

/**
 * Calculate a safe width for bordered boxes so they don't crowd the terminal.
 * Returns 0 when the terminal is too narrow to render borders cleanly.
 */
export function getBorderedBoxWidth(width: number): number {
  if (!Number.isFinite(width)) {
    return 0;
  }

  const normalizedWidth = Math.max(0, Math.floor(width));
  const MIN_WIDTH_FOR_BORDER = 28;
  const BORDER_ALLOWANCE = 2; // one character on each side

  if (normalizedWidth <= MIN_WIDTH_FOR_BORDER) {
    return 0;
  }

  return Math.max(MIN_WIDTH_FOR_BORDER - BORDER_ALLOWANCE, normalizedWidth - BORDER_ALLOWANCE);
}
