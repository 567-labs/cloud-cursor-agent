/**
 * Conversation component
 * Displays conversation history for an agent in interactive mode
 */

import React, { useEffect, useState, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import { CloudAgentsApiClient, ApiError } from "../api/client.js";
import { Spinner } from "./Spinner.js";
import { useTerminalDimensions } from "../hooks/useTerminalDimensions.js";
import { clampWidth } from "../utils/formatting.js";
import type { AgentConversation, Agent } from "../api/schemas.js";
import { getStatusDisplay } from "../utils/status.js";

interface ConversationProps {
  apiClient: CloudAgentsApiClient;
  agentId: string;
  onBack: () => void;
}

export function Conversation({
  apiClient,
  agentId,
  onBack,
}: ConversationProps) {
  const { terminalWidth, terminalHeight } = useTerminalDimensions();
  const [conversation, setConversation] = useState<AgentConversation | null>(
    null
  );
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate separator width accounting for padding
  const separatorWidth = useMemo(
    () => clampWidth(terminalWidth - 4, 20),
    [terminalWidth]
  );

  // Calculate available height for messages
  const availableHeight = useMemo(
    () => Math.max(5, terminalHeight - 8),
    [terminalHeight]
  );

  useEffect(() => {
    async function loadConversation() {
      try {
        setLoading(true);
        setError(null);
        const [conversationData, agentData] = await Promise.all([
          apiClient.getAgentConversation(agentId),
          apiClient.getAgentStatus(agentId),
        ]);
        setConversation(conversationData);
        setAgent(agentData);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to load conversation");
        }
      } finally {
        setLoading(false);
      }
    }

    loadConversation();
  }, [agentId, apiClient]);

  useInput((input, key) => {
    if (input === "q" || key.escape) {
      onBack();
    } else if (input === "r") {
      // Refresh conversation
      setLoading(true);
      apiClient
        .getAgentConversation(agentId)
        .then((data) => {
          setConversation(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to refresh conversation"
          );
          setLoading(false);
        });
    }
  });

  if (loading) {
    return (
      <Box padding={1} width={terminalWidth}>
        <Spinner text="Loading conversation..." />
      </Box>
    );
  }

  if (error) {
    return (
      <Box padding={1} flexDirection="column" width={terminalWidth}>
        <Text color="red">✗ Error: {error}</Text>
        <Box marginTop={1}>
          <Text color="gray">Press 'q' to go back or 'r' to retry</Text>
        </Box>
      </Box>
    );
  }

  if (!conversation || !agent) {
    return (
      <Box padding={1} flexDirection="column" width={terminalWidth}>
        <Text color="gray">Conversation not found</Text>
        <Box marginTop={1}>
          <Text color="gray">Press 'q' to go back</Text>
        </Box>
      </Box>
    );
  }

  const statusDisplay = getStatusDisplay(agent.status);

  return (
    <Box flexDirection="column" padding={1} width={terminalWidth}>
      <Box marginBottom={1}>
        <Text bold>Conversation</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color="gray">{"─".repeat(separatorWidth)}</Text>
      </Box>

      {/* Agent Status */}
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
            Status:{" "}
          </Text>
          <Text color={statusDisplay.color}>
            {statusDisplay.symbol} {statusDisplay.label}
          </Text>
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="gray">{"─".repeat(separatorWidth)}</Text>
      </Box>

      {/* Messages */}
      {conversation.messages.length === 0 ? (
        <Box marginTop={1}>
          <Text color="gray">No messages yet.</Text>
        </Box>
      ) : (
        <Box flexDirection="column" height={availableHeight} overflow="hidden">
          {conversation.messages.map((message) => (
            <Box key={message.id} marginBottom={1} flexDirection="column">
              <Box marginBottom={0}>
                <Text
                  bold
                  color={message.type === "user_message" ? "green" : "blue"}
                >
                  {message.type === "user_message" ? "You" : "Agent"}:
                </Text>
              </Box>
              <Box marginTop={0}>
                <Text>{message.text}</Text>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="gray" dimColor>
          Press 'q' to go back • 'r' to refresh
        </Text>
      </Box>
    </Box>
  );
}
