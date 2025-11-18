/**
 * Agent item component
 *
 * Renders a single agent in the list with support for selection, expansion,
 * and status transitions. Handles both stacked and side-by-side layouts
 * based on terminal width.
 *
 * @module components/AgentList/AgentItem
 */

import React from "react";
import { Box, Text } from "ink";
import type { Agent } from "../../api/schemas.js";
import { truncate, clampWidth, getSeparator } from "../../utils/formatting.js";
import { getStatusDisplay, getRelativeTime } from "../../utils/status.js";
import type { ColumnLayout } from "../../utils/layout.js";

export interface AgentItemProps {
  /** Agent data */
  agent: Agent;
  /** Whether this agent is currently selected */
  isSelected: boolean;
  /** Whether this agent's details are expanded */
  isExpanded: boolean;
  /** Whether browser is opening for this agent */
  isOpening: boolean;
  /** Whether this agent has a status transition */
  hasStatusTransition: boolean;
  /** Column layout configuration */
  columnLayout: ColumnLayout;
  /** Terminal width */
  terminalWidth: number;
  /** Separator width */
  separatorWidth: number;
}

/**
 * Component for rendering a single agent item in the list.
 *
 * Displays:
 * - Agent name with status symbol
 * - Repository URL (compact or full)
 * - Preview URL
 * - PR URL (if available)
 * - Expanded details (when expanded)
 * - Selection indicator
 * - Status transition indicator
 *
 * Adapts layout based on columnLayout.stacked:
 * - Stacked: Name and repo on separate lines (narrow terminals)
 * - Side-by-side: Name and repo on same line (wide terminals)
 *
 * @param props - Component props
 * @returns Agent item UI
 *
 * @example
 * ```tsx
 * <AgentItem
 *   agent={agent}
 *   isSelected={true}
 *   isExpanded={false}
 *   isOpening={false}
 *   hasStatusTransition={false}
 *   columnLayout={{ nameWidth: 50, repoWidth: 40, stacked: false }}
 *   terminalWidth={100}
 *   separatorWidth={96}
 * />
 * ```
 */
export function AgentItem({
  agent,
  isSelected,
  isExpanded,
  isOpening,
  hasStatusTransition,
  columnLayout,
  terminalWidth,
  separatorWidth,
}: AgentItemProps) {
  // Extract org/repo from full URL for compact display
  const compactRepo = agent.source.repository
    .replace(/^https?:\/\/(www\.)?github\.com\//, "")
    .replace(/\.git$/, "");

  // Use responsive column widths
  const nameMaxWidth = clampWidth(columnLayout.nameWidth);
  const repoMaxWidth = clampWidth(columnLayout.repoWidth);

  // URL truncation: allow wrapping below 60 columns, otherwise truncate
  const urlMaxWidth =
    terminalWidth >= 60 ? clampWidth(terminalWidth - 15) : undefined; // undefined allows wrapping

  // Status display
  const statusDisplay = getStatusDisplay(agent.status);
  const transitionIndicator = hasStatusTransition ? " ⚡" : "";

  const agentContent = (
    <Box flexDirection="column">
      {/* Main agent row */}
      {columnLayout.stacked ? (
        // Stacked layout for narrow terminals
        <Box flexDirection="column">
          <Box>
            <Text color={isSelected ? "cyan" : statusDisplay.color}>
              {statusDisplay.symbol}
              {transitionIndicator}{" "}
              {isExpanded ? agent.name : truncate(agent.name, nameMaxWidth)}
            </Text>
          </Box>
          <Box marginTop={0}>
            <Text color={isSelected ? "cyan" : undefined}>
              {isExpanded
                ? agent.source.repository
                : truncate(compactRepo, repoMaxWidth)}
            </Text>
          </Box>
        </Box>
      ) : (
        // Side-by-side layout for wider terminals
        <Box flexDirection="row">
          <Box>
            <Text color={isSelected ? "cyan" : statusDisplay.color}>
              {statusDisplay.symbol}
              {transitionIndicator}{" "}
              {isExpanded ? agent.name : truncate(agent.name, nameMaxWidth)}
            </Text>
          </Box>
          <Box marginLeft={2}>
            <Text color={isSelected ? "cyan" : undefined}>
              {isExpanded
                ? agent.source.repository
                : truncate(compactRepo, repoMaxWidth)}
            </Text>
          </Box>
        </Box>
      )}

      {/* Preview URL */}
      <Box
        marginLeft={columnLayout.stacked ? 0 : 3}
        marginTop={columnLayout.stacked ? 0 : 0}
      >
        <Text color="cyan" dimColor>
          Preview:{" "}
          {urlMaxWidth
            ? truncate(agent.target.url, urlMaxWidth)
            : agent.target.url}
        </Text>
      </Box>

      {/* PR URL if available */}
      {agent.target.prUrl && (
        <Box marginLeft={columnLayout.stacked ? 0 : 3} marginTop={0}>
          <Text color="cyan" dimColor>
            PR:{" "}
            {urlMaxWidth
              ? truncate(agent.target.prUrl, clampWidth(terminalWidth - 8))
              : agent.target.prUrl}
          </Text>
        </Box>
      )}

      {/* Expanded details */}
      {isExpanded && (
        <Box
          marginLeft={columnLayout.stacked ? 0 : 2}
          marginTop={1}
          flexDirection="column"
        >
          <Box marginTop={0} marginBottom={1}>
            <Text color="gray">
              {getSeparator(Math.max(20, separatorWidth - 8))}
            </Text>
          </Box>
          <Box marginTop={0} flexDirection="column">
            <Box marginBottom={1}>
              <Text>
                <Text color="gray" dimColor>
                  Agent ID:{" "}
                </Text>
                <Text>{agent.id}</Text>
              </Text>
            </Box>
            <Box marginBottom={1}>
              <Text>
                <Text color="gray" dimColor>
                  Name:{" "}
                </Text>
                <Text bold>{agent.name}</Text>
              </Text>
            </Box>
            <Box marginBottom={1}>
              <Text>
                <Text color="gray" dimColor>
                  Status:{" "}
                </Text>
                <Text color={statusDisplay.color}>
                  {statusDisplay.symbol} {statusDisplay.label}
                </Text>
              </Text>
            </Box>
            <Box marginBottom={1}>
              <Text>
                <Text color="gray" dimColor>
                  Repository:{" "}
                </Text>
                <Text>{agent.source.repository}</Text>
              </Text>
            </Box>
            {agent.source.ref && (
              <Box marginBottom={1}>
                <Text>
                  <Text color="gray" dimColor>
                    Ref:{" "}
                  </Text>
                  <Text>{agent.source.ref}</Text>
                </Text>
              </Box>
            )}
            {agent.target.branchName && (
              <Box marginBottom={1}>
                <Text>
                  <Text color="gray" dimColor>
                    Branch:{" "}
                  </Text>
                  <Text>{agent.target.branchName}</Text>
                </Text>
              </Box>
            )}
            <Box marginBottom={1}>
              <Text>
                <Text color="gray" dimColor>
                  Preview URL:{" "}
                </Text>
                <Text color="cyan">{agent.target.url}</Text>
              </Text>
            </Box>
            {agent.target.prUrl && (
              <Box marginBottom={1}>
                <Text>
                  <Text color="gray" dimColor>
                    Pull Request:{" "}
                  </Text>
                  <Text color="cyan">{agent.target.prUrl}</Text>
                </Text>
              </Box>
            )}
            {agent.summary && (
              <Box marginTop={1} marginBottom={1} flexDirection="column">
                <Box marginBottom={0}>
                  <Text color="gray" dimColor>
                    Summary:
                  </Text>
                </Box>
                <Box marginTop={0}>
                  <Text>{agent.summary}</Text>
                </Box>
              </Box>
            )}
            <Box marginTop={1} marginBottom={0}>
              <Text>
                <Text color="gray" dimColor>
                  Created:{" "}
                </Text>
                <Text>{getRelativeTime(agent.createdAt)}</Text>
              </Text>
            </Box>
          </Box>
          {isOpening && (
            <Box marginTop={1}>
              <Text color="cyan">Opening in browser...</Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );

  const indicatorSymbol = isSelected ? ">" : " ";
  const indicatorColor = isSelected ? "cyan" : "gray";
  const indicatorBox = (
    <Box marginRight={1}>
      <Text color={indicatorColor}>{indicatorSymbol}</Text>
    </Box>
  );

  return (
    <Box key={agent.id} marginTop={0} marginBottom={0}>
      <Box
        flexDirection="row"
        alignItems="flex-start"
        marginLeft={columnLayout.stacked ? 0 : 2}
      >
        {indicatorBox}
        <Box flexDirection="column" paddingY={isExpanded ? 1 : 0}>
          {agentContent}
        </Box>
      </Box>
    </Box>
  );
}
