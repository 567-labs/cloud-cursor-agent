/**
 * Conversation component
 * Displays conversation history for an agent in interactive mode
 */

import React, { useEffect, useState, useMemo, useCallback } from "react";
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
  const [isFollowupMode, setIsFollowupMode] = useState(false);
  const [followupText, setFollowupText] = useState("");
  const [sendingFollowup, setSendingFollowup] = useState(false);

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

  // Memoize messages rendering to prevent flickering when typing follow-up
  const renderedMessages = useMemo(() => {
    if (!conversation || conversation.messages.length === 0) {
      return (
        <Box marginTop={1}>
          <Text color="gray">No messages yet.</Text>
        </Box>
      );
    }

    return (
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
            {/* Display images if present */}
            {message.images && message.images.length > 0 && (
              <Box marginTop={1} flexDirection="column">
                {message.images.map((image, idx) => (
                  <Box key={idx} marginBottom={1}>
                    <Text color="cyan" dimColor>
                      [Image {idx + 1}: {image.dimension.width}x
                      {image.dimension.height}]
                    </Text>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        ))}
      </Box>
    );
  }, [conversation, availableHeight]);

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

  const handleSendFollowup = useCallback(
    async (text: string) => {
      if (!agent) return;

      // Validate agent can receive follow-ups
      if (
        agent.status === "FINISHED" ||
        agent.status === "FAILED" ||
        agent.status === "CANCELLED"
      ) {
        setError(
          `Cannot send follow-up to agent that is ${agent.status.toLowerCase()}`
        );
        setIsFollowupMode(false);
        setFollowupText("");
        return;
      }

      try {
        setSendingFollowup(true);
        await apiClient.addFollowup(agentId, { text });
        setFollowupText("");
        setIsFollowupMode(false);

        // Refresh conversation and agent status
        setLoading(true);
        const [updatedConversation, updatedAgent] = await Promise.all([
          apiClient.getAgentConversation(agentId),
          apiClient.getAgentStatus(agentId),
        ]);
        setConversation(updatedConversation);
        setAgent(updatedAgent);
        setLoading(false);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to send follow-up"
        );
        setIsFollowupMode(false);
        setFollowupText("");
        setSendingFollowup(false);
      }
    },
    [agent, agentId, apiClient]
  );

  useInput((input, key) => {
    if (isFollowupMode) {
      // Follow-up input mode
      if (key.escape || (key.ctrl && input === "c")) {
        // Cancel follow-up
        setIsFollowupMode(false);
        setFollowupText("");
      } else if (key.return) {
        // Send follow-up
        if (followupText.trim() && !sendingFollowup) {
          handleSendFollowup(followupText.trim());
        }
      } else if (key.delete || key.backspace) {
        // Delete character
        setFollowupText((prev) => prev.slice(0, -1));
      } else if (!key.ctrl && !key.meta && input.length === 1) {
        // Add character
        setFollowupText((prev) => prev + input);
      }
    } else {
      // Normal mode
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
      } else if (input === "f" || input === "F") {
        // Enter follow-up mode (only if agent is RUNNING or CREATING)
        if (
          agent &&
          (agent.status === "RUNNING" || agent.status === "CREATING")
        ) {
          setIsFollowupMode(true);
          setFollowupText("");
        }
      }
    }
  });

  const statusDisplay = agent
    ? getStatusDisplay(agent.status)
    : { symbol: "?", label: "Unknown", color: "gray" as const };

  // Memoize messages rendering to prevent flickering when typing follow-up

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

      {/* Messages - memoized to prevent flickering */}
      {renderedMessages}

      {/* Follow-up input mode */}
      {isFollowupMode && (
        <Box marginTop={1} flexDirection="column">
          <Box marginBottom={1}>
            <Text color="gray">{"─".repeat(separatorWidth)}</Text>
          </Box>
          <Box marginBottom={1}>
            <Text color="green" bold>
              Follow-up:{" "}
            </Text>
            <Text>{followupText}</Text>
            <Text color="gray" dimColor>
              {sendingFollowup ? " (Sending...)" : "_"}
            </Text>
          </Box>
          <Box marginTop={0}>
            <Text color="gray" dimColor>
              Enter to send • Esc to cancel
            </Text>
          </Box>
        </Box>
      )}

      {/* Footer hints */}
      {!isFollowupMode && (
        <Box marginTop={1}>
          <Text color="gray" dimColor>
            Press 'q' to go back • 'r' to refresh
            {agent &&
              (agent.status === "RUNNING" || agent.status === "CREATING") &&
              " • 'f' to send follow-up"}
          </Text>
        </Box>
      )}
    </Box>
  );
}
