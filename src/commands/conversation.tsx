/**
 * Conversation command - View agent conversation/logs
 */

import React from "react";
import { render } from "ink";
import { ApiError } from "../api/client.js";
import type { CommandContext } from "../cli/types.js";
import { validateAgentId } from "../utils/validation.js";
import { AgentList } from "../components/AgentList.js";
import { Conversation } from "../components/Conversation.js";
import { detectRepoAndRef } from "../utils/git.js";

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

  if (view === "conversation" && selectedAgentId) {
    return (
      <Conversation
        apiClient={apiClient}
        agentId={selectedAgentId}
        onBack={() => {
          setView("list");
          setSelectedAgentId(null);
        }}
      />
    );
  }

  return (
    <AgentList
      apiClient={apiClient}
      onBack={() => process.exit(0)}
      repositoryFilter={repositoryFilter}
      onSelectAgentForConversation={(agentId) => {
        setSelectedAgentId(agentId);
        setView("conversation");
      }}
    />
  );
}
