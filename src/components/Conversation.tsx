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

/**
 * Extract PR number from GitHub PR URL
 * e.g., "https://github.com/owner/repo/pull/123" -> "123"
 */
function extractPrNumber(prUrl: string): string | null {
  const match = prUrl.match(/\/pull\/(\d+)/);
  return match ? match[1] : null;
}

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

  const chromeLineEstimate = useMemo(() => {
    let lines = 11; // title, separators, id, review, follow-up instructions, status
    if (agent?.target.branchName) {
      lines += 1;
    }
    if (agent?.target.prUrl) {
      lines += 2; // PR line + checkout hint
    }
    lines += isFollowupMode ? 4 : 2; // follow-up input or footer hints
    return lines;
  }, [agent, isFollowupMode]);

  const availableHeight = useMemo(
    () => Math.max(5, terminalHeight - chromeLineEstimate),
    [terminalHeight, chromeLineEstimate]
  );

  const averageMessageLines = 4;
  const maxVisibleMessages = Math.max(
    1,
    Math.floor(availableHeight / averageMessageLines)
  );

  const visibleMessages = useMemo(() => {
    if (!conversation || conversation.messages.length === 0) {
      return [];
    }
    return conversation.messages.slice(-maxVisibleMessages);
  }, [conversation, maxVisibleMessages]);

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
      <Box flexDirection="column">
        {visibleMessages.map((message) => (
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
        {conversation.messages.length > visibleMessages.length && (
          <Box marginTop={0} marginBottom={1}>
            <Text color="gray" dimColor>
              Showing last {visibleMessages.length} of{" "}
              {conversation.messages.length} messages
            </Text>
          </Box>
        )}
      </Box>
    );
  }, [conversation, visibleMessages]);

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
        // Enter follow-up mode
        if (agent) {
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
    <Box
      flexDirection="column"
      paddingX={1}
      paddingY={0}
      width={terminalWidth}
      height={terminalHeight}
    >
      <Box marginBottom={0}>
        <Text bold>Conversation</Text>
      </Box>
      <Box marginBottom={0}>
        <Text color="gray">{"─".repeat(separatorWidth)}</Text>
      </Box>

      {/* Agent Status */}
      <Box flexDirection="column" marginBottom={0}>
        <Text>
          <Text color="gray" dimColor>
            Agent ID:{" "}
          </Text>
          <Text>{agent.id}</Text>
        </Text>
        <Text color="gray" dimColor>
          Review: cloud-agent conversation {agent.id}
        </Text>
        <Text color="gray" dimColor>
          Follow-up: cloud-agent followup {agent.id} --messages "your message"
        </Text>
        <Text>
          <Text color="gray" dimColor>
            Status:{" "}
          </Text>
          <Text color={statusDisplay.color}>
            {statusDisplay.symbol} {statusDisplay.label}
          </Text>
        </Text>
        {agent.target.branchName && (
          <Text>
            <Text color="gray" dimColor>
              Branch:{" "}
            </Text>
            <Text color="cyan">{agent.target.branchName}</Text>
          </Text>
        )}
        {agent.target.prUrl && (
          <>
            <Text>
              <Text color="gray" dimColor>
                Pull Request:{" "}
              </Text>
              <Text color="cyan">{agent.target.prUrl}</Text>
            </Text>
            <Text color="gray" dimColor>
              Run: gh pr checkout{" "}
              {extractPrNumber(agent.target.prUrl) || "PR_NUMBER"}
            </Text>
          </>
        )}
      </Box>

      <Box marginBottom={0}>
        <Text color="gray">{"─".repeat(separatorWidth)}</Text>
      </Box>

      {/* Messages - memoized to prevent flickering */}
      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        {renderedMessages}
      </Box>

      {/* Follow-up input mode */}
      {isFollowupMode ? (
        <Box marginTop={0} flexDirection="column">
          <Text color="gray">{"─".repeat(separatorWidth)}</Text>
          <Box marginTop={0}>
            <Text color="green" bold>
              Follow-up:{" "}
            </Text>
            <Text>{followupText}</Text>
            <Text color="gray" dimColor>
              {sendingFollowup ? " (Sending...)" : "_"}
            </Text>
          </Box>
          <Text color="gray" dimColor>
            Enter to send • Esc to cancel
          </Text>
        </Box>
      ) : (
        <Box marginTop={0}>
          <Text color="gray" dimColor>
            Press 'q' to go back • 'r' to refresh • 'f' to send follow-up
          </Text>
        </Box>
      )}
    </Box>
  );
}
