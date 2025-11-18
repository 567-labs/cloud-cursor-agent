/**
 * Delete command - Delete an agent
 */

import { ApiError } from "../api/client.js";
import type { CommandContext } from "../cli/types.js";
import { validateAgentId } from "../utils/validation.js";

interface DeleteOptions {
  agentId: string;
  force?: boolean;
}

/**
 * Delete a single agent, optionally forcing deletion while it is running.
 *
 * @param {CommandContext} context - Shared CLI context with the API client.
 * @param {DeleteOptions} options - Agent ID and force flag.
 * @returns {Promise<void>} Resolves after the agent is deleted or an error is emitted.
 * @example
 * await executeDelete(context, { agentId: "bc_abc123", force: true });
 */
export async function executeDelete(
  context: CommandContext,
  options: DeleteOptions,
): Promise<void> {
  const { apiClient } = context;
  const { agentId, force = false } = options;

  // Validate agent ID format
  const agentIdValidation = validateAgentId(agentId);
  if (!agentIdValidation.valid) {
    console.error(`Error: ${agentIdValidation.error}`);
    console.error("");
    console.error(
      "Agent ID must look like bc_123abc (letters and numbers only, at least 5 characters after bc_).",
    );
    console.error(
      "Use bun run cloud-agent.tsx list to copy ids directly from the table.",
    );
    process.exit(1);
  }

  try {
    // Check status if not forcing
    if (!force) {
      const agent = await apiClient.getAgentStatus(agentId);
      if (agent.status === "RUNNING" || agent.status === "CREATING") {
        console.error(
          `Error: Cannot delete agent that is ${agent.status.toLowerCase()}.`,
        );
        console.error(
          "Use --force to delete anyway, or wait for the agent to complete.",
        );
        console.error(
          "Example: bun run cloud-agent.tsx delete --agent-id bc_123abc --force",
        );
        process.exit(1);
        return;
      }
    }

    await apiClient.deleteAgent(agentId);
    console.log(`Agent ${agentId} deleted successfully.`);
  } catch (error) {
    if (error instanceof ApiError) {
      console.error("Delete failed: the API rejected the request.");
      console.error(`Reason: ${error.message}`);
      console.error(
        "Confirm that the agent still exists and that your API key can manage it.",
      );
    } else if (error instanceof Error) {
      console.error(`Unexpected delete error: ${error.message}`);
      console.error("Try again after checking your network connection.");
    } else {
      console.error("Error: Failed to delete agent due to an unknown issue.");
      console.error(
        "Retry soon or open the agent in Cursor to remove it from the UI.",
      );
    }
    process.exit(1);
  }
}
