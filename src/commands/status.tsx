/**
 * Status command - Show agent status
 */

import React from "react";
import { render } from "ink";
import type { CommandContext } from "../cli/types.js";
import { AgentStatus } from "../components/AgentStatus.js";
import { validateAgentId } from "../utils/validation.js";

interface StatusOptions {
  agentId: string;
  "non-interactive"?: boolean;
}

/**
 * Convert an agent status string into a square-bracketed unicode symbol.
 *
 * @param {string} status - Agent status such as `RUNNING`.
 * @returns {string} Symbolized status for plain-text output.
 * @example
 * getStatusSymbol("CREATING");
 * // => "[●]"
 */
function getStatusSymbol(status: string): string {
  switch (status) {
    case "CREATING":
      return "[●]";
    case "RUNNING":
      return "[▶]";
    case "FINISHED":
      return "[✓]";
    case "FAILED":
      return "[✗]";
    case "CANCELLED":
      return "[○]";
    default:
      return "[?]";
  }
}

/**
 * Display the status of an agent either interactively or as plain text.
 *
 * @param {CommandContext} context - Shared CLI context with the API client.
 * @param {StatusOptions} options - Agent ID and non-interactive flag.
 * @returns {Promise<void>} Resolves when UI rendering or printing completes.
 * @example
 * await executeStatus(context, { agentId: "bc_abc123", "non-interactive": true });
 */
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
    console.error("Agent ID must look like bc_123abc (letters and numbers only, at least 5 characters after bc_).");
    process.exit(1);
  }

  if (nonInteractive) {
    // Non-interactive mode: output plain text
    try {
      const agent = await apiClient.getAgentStatus(agentId);
      const statusSymbol = getStatusSymbol(agent.status);
      console.log(`Agent: ${agent.id}`);
      console.log(`Name: ${agent.name}`);
      console.log(`Status: ${statusSymbol} ${agent.status}`);
      console.log(`Repository: ${agent.source.repository}`);
      if (agent.source.ref) {
        console.log(`Ref: ${agent.source.ref}`);
      }
      if (agent.target.branchName) {
        console.log(`Branch: ${agent.target.branchName}`);
      }
      console.log(`URL: ${agent.target.url}`);
      if (agent.target.prUrl) {
        console.log(`PR URL: ${agent.target.prUrl}`);
      }
      if (agent.summary) {
        console.log(`\nSummary:\n${agent.summary}`);
      }
      console.log(`Created: ${new Date(agent.createdAt).toLocaleString()}`);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.error("Error: Failed to get agent status");
      }
      process.exit(1);
    }
    return;
  }

  // Interactive mode
  const { waitUntilExit } = render(
    <AgentStatus
      apiClient={apiClient}
      agentId={agentId}
      onBack={() => process.exit(0)}
    />
  );
  await waitUntilExit();
}

