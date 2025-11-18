/**
 * Cancel command - Cancel a running agent
 */

import { ApiError } from "../api/client.js";
import type { CommandContext } from "../cli/types.js";
import { validateAgentId } from "../utils/validation.js";

interface CancelOptions {
  agentId: string;
}

/**
 * Cancel a running agent if the API supports it (currently informational).
 *
 * @param {CommandContext} context - Shared CLI context with the API client.
 * @param {CancelOptions} options - CLI flags including the agent ID to cancel.
 * @returns {Promise<void>} Resolves after validation and API calls complete.
 * @example
 * await executeCancel(context, { agentId: "bc_abc123" });
 */
export async function executeCancel(
  context: CommandContext,
  options: CancelOptions,
): Promise<void> {
  const { apiClient } = context;
  const { agentId } = options;

  // Validate agent ID format
  const agentIdValidation = validateAgentId(agentId);
  if (!agentIdValidation.valid) {
    console.error(`Error: ${agentIdValidation.error}`);
    console.error("");
    console.error(
      "Agent ID must look like bc_123abc (letters and numbers only, at least 5 characters after bc_).",
    );
    console.error(
      "Copy one from bun run cloud-agent.tsx list if you are unsure.",
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
        `Error: Agent is already ${agent.status.toLowerCase()}. Nothing to cancel.`,
      );
      console.error(
        "Use cloud-agent watch <id> to monitor future jobs instead of cancelling them.",
      );
      process.exit(1);
      return;
    }

    // Note: The API doesn't have a cancel endpoint yet, so we'll need to check if it exists
    // For now, we'll show an error that this feature isn't available
    console.error(
      `Status: ${agent.status}. Agent cancellation is not yet supported by the API.`,
    );
    console.error(
      "Next steps: open the agent in Cursor and click Cancel, or wait for it to finish.",
    );
    process.exit(1);
  } catch (error) {
    if (error instanceof ApiError) {
      console.error("Cancel failed: the API did not process the request.");
      console.error(`Reason: ${error.message}`);
      console.error("Make sure CURSOR_API_KEY has access to this agent.");
    } else if (error instanceof Error) {
      console.error(`Unexpected cancel error: ${error.message}`);
      console.error("Retry in a moment after checking your network.");
    } else {
      console.error("Error: Failed to cancel agent for an unknown reason.");
      console.error("Open the agent in Cursor to cancel it manually.");
    }
    process.exit(1);
  }
}
