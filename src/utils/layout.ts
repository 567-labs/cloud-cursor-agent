export type LayoutBreakpoint = "wide" | "medium" | "compact";

export type ColumnLayout = {
  nameWidth: number;
  repoWidth: number;
  stacked: boolean;
};

/**
 * Clamp a width to a minimum value.
 *
 * @param width - Width to clamp.
 * @param min - Minimum allowed width.
 * @returns Clamped width.
 */
export function clampWidth(width: number, min: number = 8): number {
  return Math.max(min, width);
}

/**
 * Generate a separator string sized to the desired width.
 *
 * @param width - Desired separator width.
 * @param minLength - Minimum separator length.
 * @returns Separator string.
 */
export function getSeparator(width: number, minLength: number = 5): string {
  return "─".repeat(Math.max(minLength, width));
}

/**
 * Determine the layout breakpoint for the given terminal width.
 *
 * @param width - Terminal width in columns.
 * @returns Layout breakpoint.
 */
export function getLayoutBreakpoint(width: number): LayoutBreakpoint {
  if (width >= 100) return "wide";
  if (width >= 70) return "medium";
  return "compact";
}

/**
 * Get a human-readable label for the supplied breakpoint.
 *
 * @param breakpoint - Layout breakpoint.
 * @returns Breakpoint label.
 */
export function getLayoutLabel(breakpoint: LayoutBreakpoint): string {
  switch (breakpoint) {
    case "wide":
      return "Wide layout";
    case "medium":
      return "Medium layout";
    case "compact":
      return "Compact layout";
    default:
      return "Compact layout";
  }
}

/**
 * Calculate available vertical space for content.
 *
 * @param terminalHeight - Current terminal height.
 * @param headerHeight - Reserved header rows.
 * @param footerHeight - Reserved footer rows.
 * @param paddingHeight - Additional padding rows.
 * @param minHeight - Minimum allowed content height.
 * @returns Available height.
 */
export function calculateAvailableHeight(
  terminalHeight: number,
  headerHeight: number,
  footerHeight: number,
  paddingHeight: number,
  minHeight: number = 5,
): number {
  return Math.max(
    minHeight,
    terminalHeight - headerHeight - footerHeight - paddingHeight,
  );
}

/**
 * Calculate responsive column widths for agent rows.
 *
 * @param width - Available content width.
 * @param breakpoint - Current layout breakpoint.
 * @returns Column configuration.
 */
export function calculateColumnLayout(
  width: number,
  breakpoint: LayoutBreakpoint,
): ColumnLayout {
  if (breakpoint === "wide") {
    return {
      nameWidth: Math.floor(width * 0.45),
      repoWidth: Math.floor(width * 0.35),
      stacked: false,
    };
  }

  if (breakpoint === "medium") {
    return {
      nameWidth: Math.floor(width * 0.6),
      repoWidth: Math.floor(width * 0.4),
      stacked: false,
    };
  }

  return {
    nameWidth: width,
    repoWidth: width,
    stacked: true,
  };
}

