/**
 * Empty state component for agent list
 * 
 * Displays a message when no agents are found, with different content
 * based on whether a filter is active.
 * 
 * @module components/AgentList/EmptyState
 */

import React from "react";
import { Box, Text } from "ink";
import { getStatusDisplay } from "../../utils/status.js";
import type { AgentStatus } from "../../api/schemas.js";

export interface EmptyStateProps {
  /** Active status filter (null = no filter) */
  statusFilter: AgentStatus | null;
}

/**
 * Component displayed when no agents are found.
 * 
 * Shows different messages based on whether a status filter is active.
 * Provides helpful instructions for creating agents or clearing filters.
 * 
 * @param props - Component props
 * @returns Empty state UI
 * 
 * @example
 * ```tsx
 * <EmptyState statusFilter={null} />
 * <EmptyState statusFilter="RUNNING" />
 * ```
 */
export function EmptyState({ statusFilter }: EmptyStateProps) {
  return (
    <Box padding={1} flexDirection="column">
      <Box marginBottom={1}>
        <Text color="gray">
          {statusFilter
            ? `No agents found with status: ${getStatusDisplay(statusFilter).label}`
            : "No agents found yet"}
        </Text>
      </Box>
      {!statusFilter && (
        <>
          <Box marginBottom={1}>
            <Text color="gray">To create your first cloud agent, run:</Text>
          </Box>
          <Box marginLeft={2}>
            <Text color="cyan">cloud-agent launch --plan plan.md</Text>
          </Box>
        </>
      )}
      {statusFilter && (
        <Box marginTop={1}>
          <Text color="gray">Press 'a' to show all agents</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text color="gray">Press 'q' to go back</Text>
      </Box>
    </Box>
  );
}

