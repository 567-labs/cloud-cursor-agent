/**
 * Agent item details component
 *
 * Responsible for rendering the expanded set of metadata for an individual
 * agent, including repository information, branch details, summary, and
 * creation time. This component is shown when an agent item is expanded to
 * provide a detailed view, and it also handles the "Opening in browser..."
 * indicator for agents currently being opened.
 *
 * @module components/AgentList/AgentItemDetails
 */
import React from "react";
import { Box, Text } from "ink";
import type { Agent } from "../../api/schemas.js";
import type { StatusDisplay } from "../../utils/status.js";
import { getRelativeTime } from "../../utils/status.js";
import { getSeparator } from "../../utils/formatting.js";

export interface AgentItemDetailsProps {
  /** Agent data displayed in the details panel */
  agent: Agent;
  /** Display metadata (symbol, label, color) for the agent's status */
  statusDisplay: StatusDisplay;
  /** Terminal separator width used for the divider */
  separatorWidth: number;
  /** Whether the agent is in the process of opening in the browser */
  isOpening: boolean;
}

/**
 * Render the expanded details for a single agent.
 *
 * Includes:
 * - Agent identifiers (ID, name, refs)
 * - Repository, branch, and URL information
 * - Optional summary content
 * - Relative creation time
 * - Browser opening indicator when applicable
 *
 * @param props - Component props
 * @returns Detailed agent view
 */
export function AgentItemDetails({
  agent,
  statusDisplay,
  separatorWidth,
  isOpening,
}: AgentItemDetailsProps) {
  const separatorLength = Math.max(20, separatorWidth - 8);

  return (
    <Box marginTop={1} flexDirection="column">
      <Box marginTop={0} marginBottom={1}>
        <Text color="gray">{getSeparator(separatorLength)}</Text>
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
  );
}
