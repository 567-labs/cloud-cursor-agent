/**
 * Footer component for agent list
 * 
 * Displays pagination information, layout info, and keyboard hints.
 * 
 * @module components/AgentList/AgentListFooter
 */

import React from "react";
import { Box, Text } from "ink";
import { getLayoutLabel } from "../../utils/layout.js";
import type { LayoutBreakpoint } from "../../utils/layout.js";

export interface AgentListFooterProps {
  /** Total number of filtered agents */
  agentCount: number;
  /** Starting index of current page (1-based) */
  paginationStart: number;
  /** Ending index of current page (1-based) */
  paginationEnd: number;
  /** Whether previous page is available */
  hasPreviousPage: boolean;
  /** Whether next page is available */
  hasNextPage: boolean;
  /** Current layout breakpoint */
  layoutBreakpoint: LayoutBreakpoint;
  /** Whether to open PR URL (vs Agent URL) */
  openPrUrl: boolean;
}

/**
 * Footer component for the agent list.
 * 
 * Displays:
 * - Pagination range (e.g., "Showing 1-10 of 25 agents")
 * - Layout information (e.g., "Wide layout")
 * - Keyboard shortcuts hints
 * 
 * @param props - Component props
 * @returns Footer UI
 * 
 * @example
 * ```tsx
 * <AgentListFooter
 *   agentCount={25}
 *   paginationStart={1}
 *   paginationEnd={10}
 *   hasPreviousPage={false}
 *   hasNextPage={true}
 *   layoutBreakpoint="wide"
 *   openPrUrl={true}
 * />
 * ```
 */
export function AgentListFooter({
  agentCount,
  paginationStart,
  paginationEnd,
  hasPreviousPage,
  hasNextPage,
  layoutBreakpoint,
  openPrUrl,
}: AgentListFooterProps) {
  const paginationHintParts: string[] = [];
  if (hasPreviousPage) {
    paginationHintParts.push("← Prev");
  }
  if (hasNextPage) {
    paginationHintParts.push("→ Next");
  }
  
  const footerHintParts = [
    ...paginationHintParts,
    "↑↓/jk Navigate",
    "Enter Expand/Status",
    `Enter twice Open ${openPrUrl ? "PR" : "Agent"}`,
    "q Back",
    "r Refresh",
    "Filters 1-5/a",
    "g Group",
    "t PR/Agent",
  ];
  const footerHintText = footerHintParts.join(" • ");

  return (
    <Box marginTop={2} flexDirection="column">
      <Box marginBottom={1}>
        <Text color="gray" dimColor>
          {agentCount > 0
            ? `Showing ${paginationStart}-${paginationEnd} of ${agentCount} ${
                agentCount === 1 ? "agent" : "agents"
              } • ${getLayoutLabel(layoutBreakpoint)}`
            : `No agents • ${getLayoutLabel(layoutBreakpoint)}`}
        </Text>
      </Box>
      <Box>
        <Text color="gray" dimColor>
          {footerHintText}
        </Text>
      </Box>
    </Box>
  );
}

