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

export async function executeDelete(
  context: CommandContext,
  options: DeleteOptions
): Promise<void> {
  const { apiClient } = context;
  const { agentId, force = false } = options;

  // Validate agent ID format
  const agentIdValidation = validateAgentId(agentId);
  if (!agentIdValidation.valid) {
    console.error(`Error: ${agentIdValidation.error}`);
    console.error("");
    console.error("Agent ID must look like bc_123abc (letters and numbers only, at least 5 characters after bc_).");
    process.exit(1);
  }

  try {
    // Check status if not forcing
    if (!force) {
      const agent = await apiClient.getAgentStatus(agentId);
      if (agent.status === "RUNNING" || agent.status === "CREATING") {
        console.error(`Error: Cannot delete agent that is ${agent.status.toLowerCase()}.`);
        console.error("Use --force to delete anyway, or wait for the agent to complete.");
        process.exit(1);
        return;
      }
    }

    await apiClient.deleteAgent(agentId);
    console.log(`Agent ${agentId} deleted successfully.`);
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`Error: ${error.message}`);
    } else if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error("Error: Failed to delete agent");
    }
    process.exit(1);
  }
}

