/**
 * Status command - Show agent status
 */

import React from "react";
import { render } from "ink";
import { ApiError } from "../api/client.js";
import type { CommandContext } from "../cli/types.js";
import { validateAgentId } from "../utils/validation.js";
import { AgentStatus } from "../components/AgentStatus.js";

interface StatusOptions {
  agentId: string;
  "non-interactive"?: boolean;
}

export async function executeStatus(
  context: CommandContext,
  options: StatusOptions
): Promise<void> {
  const { apiClient } = context;
  const { agentId, "non-interactive": nonInteractive } = options;

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

  if (nonInteractive) {
    // Non-interactive mode: output plain text
    try {
      const agent = await apiClient.getAgentStatus(agentId);
      const { getStatusDisplay } = await import("../utils/status.js");
      const statusDisplay = getStatusDisplay(agent.status);

      console.log("Agent Status:");
      console.log("─────────────");
      console.log(`ID: ${agent.id}`);
      console.log(`Name: ${agent.name}`);
      console.log(`Status: ${statusDisplay.symbol} ${statusDisplay.label}`);
      console.log(`Repository: ${agent.source.repository}`);
      console.log(`Ref: ${agent.source.ref || "N/A"}`);
      if (agent.target.branchName) {
        console.log(`Branch: ${agent.target.branchName}`);
      }
      if (agent.target.prUrl) {
        console.log(`PR: ${agent.target.prUrl}`);
      }
      console.log(`URL: ${agent.target.url}`);
      if (agent.summary) {
        console.log(`Summary: ${agent.summary}`);
      }
      console.log(`Created: ${agent.createdAt}`);
    } catch (error) {
      if (error instanceof ApiError) {
        console.error(`Error: ${error.message}`);
      } else if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.error("Error: Failed to retrieve agent status");
      }
      process.exit(1);
    }
  } else {
    // Interactive mode: use Ink component
    render(
      <AgentStatus
        apiClient={apiClient}
        agentId={agentId}
        onBack={() => process.exit(0)}
      />
    );
  }
}
