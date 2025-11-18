/**
 * Conversation command - View agent conversation/logs
 */

import React from "react";
import { Box, render } from "ink";
import { ApiError } from "../api/client.js";
import type { CommandContext } from "../cli/types.js";
import { validateAgentId } from "../utils/validation.js";
import { AgentList } from "../components/AgentList.js";
import { Conversation } from "../components/Conversation.js";
import { detectRepoAndRef } from "../utils/git.js";
import type { Agent, AgentConversation } from "../api/schemas.js";

interface ConversationOptions {
  agentId?: string;
  "non-interactive"?: boolean;
  dir?: string;
}

export async function executeConversation(
  context: CommandContext,
  options: ConversationOptions
): Promise<void> {
  const { apiClient, workingDir } = context;
  const { agentId, "non-interactive": nonInteractive, dir } = options;

  // If agent ID is provided, use non-interactive mode
  if (agentId) {
    // Validate agent ID format
    const agentIdValidation = validateAgentId(agentId);
    if (!agentIdValidation.valid) {
      console.error(`Error: ${agentIdValidation.error}`);
      console.error("");
      console.error(
        "Agent ID must look like bc_123abc (letters and numbers only, at least 5 characters after bc_)."
      );
      process.exit(1);
    }

    try {
      // Fetch both conversation and agent status
      const [conversation, agent] = await Promise.all([
        apiClient.getAgentConversation(agentId),
        apiClient.getAgentStatus(agentId),
      ]);

      // Display status
      console.log(`Agent Status: ${agent.status}`);
      console.log(`Agent ID: ${agent.id}`);
      console.log("");

      if (conversation.messages.length === 0) {
        console.log("No messages yet.");
        return;
      }

      // Plain text output
      for (const message of conversation.messages) {
        const prefix = message.type === "user_message" ? "[User]" : "[Agent]";
        console.log(`${prefix} ${message.text}`);
        console.log("");
      }
    } catch (error) {
      if (error instanceof ApiError) {
        console.error(`Error: ${error.message}`);
      } else if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.error("Error: Failed to get conversation");
      }
      process.exit(1);
    }
    return;
  }

  // Interactive mode: show agent list
  if (nonInteractive) {
    console.error("Error: Agent ID is required in non-interactive mode");
    process.exit(1);
    return;
  }

  const workingDirectory = dir || workingDir;
  const gitInfo = await detectRepoAndRef(workingDirectory);
  const repositoryFilter = gitInfo?.repository;

  const { waitUntilExit } = render(
    <ConversationInteractive
      apiClient={apiClient}
      repositoryFilter={repositoryFilter}
    />
  );
  await waitUntilExit();
}

function ConversationInteractive({
  apiClient,
  repositoryFilter,
}: {
  apiClient: CommandContext["apiClient"];
  repositoryFilter?: string;
}) {
  const [view, setView] = React.useState<"list" | "conversation">("list");
  const [selectedAgentId, setSelectedAgentId] = React.useState<string | null>(
    null
  );
  const [conversationCache, setConversationCache] = React.useState<
    Map<string, AgentConversation>
  >(() => new Map());
  const [agentCache, setAgentCache] = React.useState<Map<string, Agent>>(
    () => new Map()
  );
  const [refreshingAgents, setRefreshingAgents] = React.useState<Set<string>>(
    () => new Set()
  );

  const refreshConversation = React.useCallback(
    async (agentId: string) => {
      setRefreshingAgents((prev) => {
        if (prev.has(agentId)) {
          return prev;
        }
        const next = new Set(prev);
        next.add(agentId);
        return next;
      });

      try {
        const [conversationData, agentData] = await Promise.all([
          apiClient.getAgentConversation(agentId),
          apiClient.getAgentStatus(agentId),
        ]);

        setConversationCache((prev) => {
          const next = new Map(prev);
          next.set(agentId, conversationData);
          return next;
        });

        setAgentCache((prev) => {
          const next = new Map(prev);
          next.set(agentId, agentData);
          return next;
        });

        return { conversation: conversationData, agent: agentData };
      } finally {
        setRefreshingAgents((prev) => {
          if (!prev.has(agentId)) {
            return prev;
          }
          const next = new Set(prev);
          next.delete(agentId);
          return next;
        });
      }
    },
    [apiClient]
  );

  return (
    <>
      <Box display={view === "list" ? "flex" : "none"} flexDirection="column">
        <AgentList
          apiClient={apiClient}
          onBack={() => process.exit(0)}
          repositoryFilter={repositoryFilter}
          onSelectAgentForConversation={(agentId) => {
            setSelectedAgentId(agentId);
            setView("conversation");
          }}
        />
      </Box>

      <Box
        display={view === "conversation" ? "flex" : "none"}
        flexDirection="column"
      >
        {selectedAgentId && (
          <Conversation
            apiClient={apiClient}
            agentId={selectedAgentId}
            cachedConversation={conversationCache.get(selectedAgentId)}
            cachedAgent={agentCache.get(selectedAgentId)}
            isRefreshing={refreshingAgents.has(selectedAgentId)}
            onRefreshRequest={(agentId) => refreshConversation(agentId)}
            onCacheUpdate={(agentId, conversation, agent) => {
              setConversationCache((prev) => {
                const next = new Map(prev);
                next.set(agentId, conversation);
                return next;
              });
              setAgentCache((prev) => {
                const next = new Map(prev);
                next.set(agentId, agent);
                return next;
              });
            }}
            onBack={() => {
              setView("list");
              setSelectedAgentId(null);
            }}
          />
        )}
      </Box>
    </>
  );
}
