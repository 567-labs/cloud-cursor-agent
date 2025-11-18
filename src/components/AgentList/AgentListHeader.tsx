/**
 * Header component for agent list
 * 
 * Displays the title, agent count, active filters, grouping mode,
 * and loading spinner.
 * 
 * @module components/AgentList/AgentListHeader
 */

import React from "react";
import { Box, Text } from "ink";
import { Spinner } from "../Spinner.js";
import { getSeparator } from "../../utils/formatting.js";
import { getStatusDisplay } from "../../utils/status.js";
import type { AgentStatus } from "../../api/schemas.js";

export interface AgentListHeaderProps {
  /** Number of filtered agents */
  agentCount: number;
  /** Active status filter (null = no filter) */
  statusFilter: AgentStatus | null;
  /** Repository filter string */
  repositoryFilter?: string;
  /** Whether grouping is by repository */
  groupByRepository: boolean;
  /** Whether agents are currently loading */
  loading: boolean;
  /** Separator width */
  separatorWidth: number;
}

/**
 * Header component for the agent list.
 * 
 * Displays:
 * - Title with agent count
 * - Active status filter indicator
 * - Repository filter indicator
 * - Grouping mode indicator
 * - Loading spinner (when refreshing)
 * - Separator line
 * 
 * @param props - Component props
 * @returns Header UI
 * 
 * @example
 * ```tsx
 * <AgentListHeader
 *   agentCount={10}
 *   statusFilter={null}
 *   groupByRepository={false}
 *   loading={false}
 *   separatorWidth={80}
 * />
 * ```
 */
export function AgentListHeader({
  agentCount,
  statusFilter,
  repositoryFilter,
  groupByRepository,
  loading,
  separatorWidth,
}: AgentListHeaderProps) {
  return (
    <>
      <Box marginBottom={1} flexDirection="row" alignItems="center">
        <Text bold>
          Your Cloud Agents
          {agentCount > 0 && (
            <Text color="gray">
              {" "}({agentCount} {agentCount === 1 ? "agent" : "agents"})
            </Text>
          )}
          {statusFilter && (
            <Text color="cyan">
              {" "}• Filter: {getStatusDisplay(statusFilter).label}
            </Text>
          )}
          {repositoryFilter && (
            <Text color="gray"> • {repositoryFilter}</Text>
          )}
          {groupByRepository && (
            <Text color="cyan"> • Grouped by repository</Text>
          )}
        </Text>
        {loading && agentCount > 0 && (
          <Box marginLeft={2}>
            <Spinner text="Refreshing..." />
          </Box>
        )}
      </Box>
      <Box marginBottom={1}>
        <Text color="gray">{getSeparator(separatorWidth)}</Text>
      </Box>
    </>
  );
}

