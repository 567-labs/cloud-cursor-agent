/**
 * Cancel command - Cancel a running agent
 */

import { ApiError } from "../api/client.js";
import type { CommandContext } from "../cli/types.js";
import { validateAgentId } from "../utils/validation.js";

interface CancelOptions {
  agentId: string;
}

export async function executeCancel(
  context: CommandContext,
  options: CancelOptions
): Promise<void> {
  const { apiClient } = context;
  const { agentId } = options;

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
    // Check current status first
    const agent = await apiClient.getAgentStatus(agentId);

    if (
      agent.status === "FINISHED" ||
      agent.status === "FAILED" ||
      agent.status === "CANCELLED"
    ) {
      console.error(
        `Error: Agent is already ${agent.status.toLowerCase()}. Cannot cancel.`
      );
      process.exit(1);
      return;
    }

    // Note: The API doesn't have a cancel endpoint yet, so we'll need to check if it exists
    // For now, we'll show an error that this feature isn't available
    console.error("Error: Agent cancellation is not yet supported by the API.");
    console.error("Please cancel the agent manually through the Cursor UI.");
    process.exit(1);
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`Error: ${error.message}`);
    } else if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error("Error: Failed to cancel agent");
    }
    process.exit(1);
  }
}
