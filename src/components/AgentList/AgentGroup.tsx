/**
 * Agent group component
 *
 * Renders a group of agents with a header and footer. Supports both
 * status-based and repository-based grouping.
 *
 * @module components/AgentList/AgentGroup
 */

import React from "react";
import { Box, Text } from "ink";
import type { Agent } from "../../api/schemas.js";
import { getSeparator } from "../../utils/formatting.js";
import { getStatusDisplay } from "../../utils/status.js";
import { AgentItem } from "./AgentItem.js";
import type { ColumnLayout } from "../../utils/layout.js";

export interface AgentGroupProps {
  /** Group key (status string or repository URL) */
  groupKey: string;
  /** Agents in this group */
  agents: Agent[];
  /** Whether grouping is by repository */
  groupByRepository: boolean;
  /** Flattened array of all agents (for index calculation) */
  flattenedAgents: Agent[];
  /** Currently selected index */
  selectedIndex: number;
  /** Currently expanded agent ID */
  expandedAgentId: string | null;
  /** Currently opening browser agent ID */
  openingBrowser: string | null;
  /** Set of agent IDs with status transitions */
  statusTransitionAgents: Set<string>;
  /** Column layout configuration */
  columnLayout: ColumnLayout;
  /** Terminal width */
  terminalWidth: number;
  /** Separator width */
  separatorWidth: number;
}

/**
 * Component for rendering a group of agents.
 *
 * Displays:
 * - Group header with title and count
 * - List of agents in the group
 * - Group footer separator
 *
 * Supports two grouping modes:
 * - Status grouping: Shows status symbol and label
 * - Repository grouping: Shows repository URL
 *
 * @param props - Component props
 * @returns Group UI
 *
 * @example
 * ```tsx
 * <AgentGroup
 *   groupKey="RUNNING"
 *   agents={[agent1, agent2]}
 *   groupByRepository={false}
 *   flattenedAgents={allAgents}
 *   selectedIndex={0}
 *   expandedAgentId={null}
 *   openingBrowser={null}
 *   statusTransitionAgents={new Set()}
 *   columnLayout={layout}
 *   terminalWidth={100}
 *   separatorWidth={96}
 * />
 * ```
 */
export function AgentGroup({
  groupKey,
  agents,
  groupByRepository,
  flattenedAgents,
  selectedIndex,
  expandedAgentId,
  openingBrowser,
  statusTransitionAgents,
  columnLayout,
  terminalWidth,
  separatorWidth,
}: AgentGroupProps) {
  if (agents.length === 0) return null;

  let sectionTitle: string;
  let titleColor: string;

  if (groupByRepository) {
    sectionTitle = `${groupKey} (${agents.length})`;
    titleColor = "cyan";
  } else {
    const statusDisplay = getStatusDisplay(groupKey as any);
    sectionTitle = `${statusDisplay.symbol} ${statusDisplay.label} (${agents.length})`;
    titleColor = statusDisplay.color;
  }

  const titleLength = sectionTitle.length;
  const separatorLength = Math.max(
    1,
    separatorWidth - titleLength - 5 // Account for "┌─ " and " ┐"
  );

  return (
    <Box marginBottom={1} flexDirection="column">
      {/* Section header */}
      <Box marginBottom={0}>
        <Text color="gray">┌─ </Text>
        <Text color={titleColor} bold>
          {sectionTitle}
        </Text>
        <Text color="gray"> {getSeparator(separatorLength)}┐</Text>
      </Box>

      {/* Agents in this group */}
      {agents.map((agent) => {
        const globalIndex = flattenedAgents.indexOf(agent);
        const isSelected = globalIndex === selectedIndex;
        const isExpanded = expandedAgentId === agent.id;
        const isOpening = openingBrowser === agent.id;
        const hasStatusTransition = statusTransitionAgents.has(agent.id);

        return (
          <AgentItem
            key={agent.id}
            agent={agent}
            isSelected={isSelected}
            isExpanded={isExpanded}
            isOpening={isOpening}
            hasStatusTransition={hasStatusTransition}
            columnLayout={columnLayout}
            terminalWidth={terminalWidth}
            separatorWidth={separatorWidth}
          />
        );
      })}

      {/* Section footer */}
      <Box marginTop={0}>
        <Text color="gray">
          └{getSeparator(Math.max(3, separatorWidth - 2))}┘
        </Text>
      </Box>
    </Box>
  );
}
