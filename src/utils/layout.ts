/**
 * Layout calculation utilities
 * 
 * Provides functions for calculating responsive layouts based on terminal width.
 * These utilities help components adapt to different terminal sizes and provide
 * consistent layout breakpoints across the application.
 * 
 * @module utils/layout
 */

import { clampWidth } from "./formatting.js";

/**
 * Layout breakpoint types based on terminal width.
 * 
 * - "wide": >= 100 columns - Full layout with side-by-side columns
 * - "medium": 70-99 columns - Medium layout with adjusted column widths
 * - "compact": < 70 columns - Stacked layout for narrow terminals
 */
export type LayoutBreakpoint = "wide" | "medium" | "compact";

/**
 * Determines the layout breakpoint based on terminal width.
 * 
 * @param width - Terminal width in columns
 * @returns The appropriate layout breakpoint
 * 
 * @example
 * ```ts
 * getLayoutBreakpoint(120)  // "wide"
 * getLayoutBreakpoint(80)   // "medium"
 * getLayoutBreakpoint(50)   // "compact"
 * ```
 */
export function getLayoutBreakpoint(width: number): LayoutBreakpoint {
  if (width >= 100) return "wide";
  if (width >= 70) return "medium";
  return "compact";
}

/**
 * Gets a human-readable label for a layout breakpoint.
 * 
 * @param breakpoint - The layout breakpoint
 * @returns A descriptive label string
 * 
 * @example
 * ```ts
 * getLayoutLabel("wide")    // "Wide layout"
 * getLayoutLabel("medium")  // "Medium layout"
 * getLayoutLabel("compact")  // "Compact layout"
 * ```
 */
export function getLayoutLabel(breakpoint: LayoutBreakpoint): string {
  switch (breakpoint) {
    case "wide":
      return "Wide layout";
    case "medium":
      return "Medium layout";
    case "compact":
      return "Compact layout";
  }
}

/**
 * Column layout configuration for responsive agent list display.
 */
export interface ColumnLayout {
  /** Width for the agent name column */
  nameWidth: number;
  /** Width for the repository column */
  repoWidth: number;
  /** Whether to stack columns vertically (for narrow terminals) */
  stacked: boolean;
}

/**
 * Calculates column layout based on available width and breakpoint.
 * 
 * Column widths are distributed as follows:
 * - Wide (>= 100): 45% name, 35% repo, remainder spacing
 * - Medium (70-99): 60% name, 40% repo
 * - Compact (< 70): Stacked layout (both columns use full width)
 * 
 * @param availableWidth - Available content width in columns
 * @param breakpoint - Layout breakpoint
 * @returns Column layout configuration
 * 
 * @example
 * ```ts
 * calculateColumnLayout(120, "wide")
 * // { nameWidth: 54, repoWidth: 42, stacked: false }
 * 
 * calculateColumnLayout(50, "compact")
 * // { nameWidth: 50, repoWidth: 50, stacked: true }
 * ```
 */
export function calculateColumnLayout(
  availableWidth: number,
  breakpoint: LayoutBreakpoint
): ColumnLayout {
  const width = availableWidth;
  if (breakpoint === "wide") {
    // >= 100 columns: 45% name, 35% repo, remainder spacing
    return {
      nameWidth: Math.floor(width * 0.45),
      repoWidth: Math.floor(width * 0.35),
      stacked: false,
    };
  } else if (breakpoint === "medium") {
    // 70-100: 60% name, 40% repo
    return {
      nameWidth: Math.floor(width * 0.60),
      repoWidth: Math.floor(width * 0.40),
      stacked: false,
    };
  } else {
    // < 70: stack repository and URLs beneath name
    return {
      nameWidth: width,
      repoWidth: width,
      stacked: true,
    };
  }
}

/**
 * Layout metrics for calculating available space in terminal UI.
 */
export interface LayoutMetrics {
  /** Terminal width in columns */
  terminalWidth: number;
  /** Terminal height in rows */
  terminalHeight: number;
  /** Layout breakpoint */
  breakpoint: LayoutBreakpoint;
  /** Available content width (after padding) */
  availableContentWidth: number;
  /** Separator width */
  separatorWidth: number;
  /** Available height for content (after header/footer) */
  availableHeight: number;
  /** Number of agents that fit per view */
  agentsPerView: number;
  /** Main box padding (0 for compact, 2 for others) */
  mainBoxPadding: number;
}

/**
 * Calculates layout metrics based on terminal dimensions.
 * 
 * Takes into account header height (4 lines), footer height (5 lines),
 * and padding to determine how much space is available for content.
 * 
 * @param terminalWidth - Terminal width in columns
 * @param terminalHeight - Terminal height in rows
 * @param chromePadding - Padding for borders and margins (default: 4)
 * @param headerHeight - Header height in lines (default: 4)
 * @param footerHeight - Footer height in lines (default: 5)
 * @returns Complete layout metrics
 * 
 * @example
 * ```ts
 * const metrics = calculateLayoutMetrics(100, 30);
 * // {
 * //   terminalWidth: 100,
 * //   terminalHeight: 30,
 * //   breakpoint: "medium",
 * //   availableContentWidth: 96,
 * //   separatorWidth: 96,
 * //   availableHeight: 21,
 * //   agentsPerView: 7,
 * //   mainBoxPadding: 2
 * // }
 * ```
 */
export function calculateLayoutMetrics(
  terminalWidth: number,
  terminalHeight: number,
  chromePadding: number = 4,
  headerHeight: number = 4,
  footerHeight: number = 5
): LayoutMetrics {
  const breakpoint = getLayoutBreakpoint(terminalWidth);
  const mainBoxPadding = breakpoint === "compact" ? 0 : 2;
  const availableHeight = Math.max(
    5,
    terminalHeight - headerHeight - footerHeight - mainBoxPadding
  );
  const agentsPerView = Math.max(3, Math.floor(availableHeight / 3));
  const availableContentWidth = clampWidth(terminalWidth - chromePadding);
  const separatorWidth = clampWidth(terminalWidth - 4, 20);

  return {
    terminalWidth,
    terminalHeight,
    breakpoint,
    availableContentWidth,
    separatorWidth,
    availableHeight,
    agentsPerView,
    mainBoxPadding,
  };
}

