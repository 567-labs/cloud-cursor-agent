/**
 * AgentStatus component
 * Displays detailed status of a single agent
 */

import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { CloudAgentsApiClient, ApiError } from "../api/client.js";
import { Spinner } from "./Spinner.js";
import type { Agent } from "../api/schemas.js";
import { getStatusDisplay } from "../utils/status.js";

interface AgentStatusProps {
  apiClient: CloudAgentsApiClient;
  agentId: string;
  onBack: () => void;
}

export function AgentStatus({ apiClient, agentId, onBack }: AgentStatusProps) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStatus() {
      try {
        setLoading(true);
        setError(null);
        const agentData = await apiClient.getAgentStatus(agentId);
        setAgent(agentData);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to load agent status");
        }
      } finally {
        setLoading(false);
      }
    }

    loadStatus();
  }, [agentId]);

  useInput((input, key) => {
    if (input === "q" || key.escape) {
      onBack();
    }
  });

  if (loading) {
    return (
      <Box padding={1}>
        <Spinner text="Loading agent details..." />
      </Box>
    );
  }

  if (error) {
    return (
      <Box padding={1} flexDirection="column">
        <Text color="red">✗ Error: {error}</Text>
        <Box marginTop={1}>
          <Text color="gray">Press 'q' to go back</Text>
        </Box>
      </Box>
    );
  }

  if (!agent) {
    return (
      <Box padding={1} flexDirection="column">
        <Text color="gray">Agent not found</Text>
        <Box marginTop={1}>
          <Text color="gray">Press 'q' to go back</Text>
        </Box>
      </Box>
    );
  }

  const terminalWidth = process.stdout.columns || 80;
  const separatorWidth = terminalWidth - 4; // Account for padding

  return (
    <Box flexDirection="column" padding={1} width={terminalWidth}>
      <Box marginBottom={1}>
        <Text bold>Agent Details</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color="gray">{"─".repeat(separatorWidth)}</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
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
            {(() => {
              const statusDisplay = getStatusDisplay(agent.status);
              return (
                <Text color={statusDisplay.color}>
                  {statusDisplay.symbol} {statusDisplay.label}
                </Text>
              );
            })()}
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
        <Box marginBottom={1}>
          <Text>
            <Text color="gray" dimColor>
              Ref:{" "}
            </Text>
            <Text>{agent.source.ref || "N/A"}</Text>
          </Text>
        </Box>
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
            <Text>{new Date(agent.createdAt).toLocaleString()}</Text>
          </Text>
        </Box>
      </Box>

      <Box marginTop={2}>
        <Text color="gray" dimColor>
          Press 'q' to go back
        </Text>
      </Box>
    </Box>
  );
}
