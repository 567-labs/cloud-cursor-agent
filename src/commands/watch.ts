/**
 * Watch command - Block until agent completes
 */

import { ApiError } from "../api/client.js";
import type { CommandContext } from "../cli/types.js";
import { validateAgentId } from "../utils/validation.js";
import { getStatusDisplay } from "../utils/status.js";
import type { AgentStatus } from "../api/schemas.js";

interface WatchOptions {
  agentId: string;
  interval?: number;
  verbose?: boolean;
}

const TERMINAL_STATUSES: AgentStatus[] = ["FINISHED", "FAILED", "CANCELLED"];
const DEFAULT_POLL_INTERVAL = 2000; // 2 seconds

/**
 * Sleep for a specified number of milliseconds.
 *
 * @param {number} ms - Duration to wait before resolving.
 * @returns {Promise<void>} Resolves after the timeout is reached.
 * @example
 * await sleep(500);
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Poll an agent until it reaches a terminal state, exiting with status codes.
 *
 * @param {CommandContext} context - Shared CLI context with the API client.
 * @param {WatchOptions} options - Agent ID, poll interval, and verbosity flag.
 * @returns {Promise<void>} Resolves only when the process exits or throws.
 * @example
 * await executeWatch(context, { agentId: "bc_abc123", interval: 5000, verbose: true });
 */
export async function executeWatch(
  context: CommandContext,
  options: WatchOptions,
): Promise<void> {
  const { apiClient } = context;
  const {
    agentId,
    interval = DEFAULT_POLL_INTERVAL,
    verbose = false,
  } = options;

  // Validate agent ID format
  const agentIdValidation = validateAgentId(agentId);
  if (!agentIdValidation.valid) {
    console.error(`Error: ${agentIdValidation.error}`);
    console.error("");
    console.error(
      "Agent ID must look like bc_123abc (letters and numbers only, at least 5 characters after bc_).",
    );
    console.error(
      "Run bun run cloud-agent.tsx list to copy a valid agent id from the output.",
    );
    process.exit(1);
  }

  try {
    // Initial status check
    let agent = await apiClient.getAgentStatus(agentId);

    if (verbose) {
      console.error(`Watching agent ${agentId}...`);
      console.error(`Initial status: ${agent.status}`);
      console.error("");
    }

    // If already in terminal state, exit immediately
    if (TERMINAL_STATUSES.includes(agent.status)) {
      const statusDisplay = getStatusDisplay(agent.status);
      if (verbose) {
        console.error(`Agent is already ${statusDisplay.label.toLowerCase()}.`);
      }
      // Exit with code 0 for FINISHED, 1 for FAILED/CANCELLED
      process.exit(agent.status === "FINISHED" ? 0 : 1);
      return;
    }

    // Poll until terminal state
    let lastStatus = agent.status;
    while (!TERMINAL_STATUSES.includes(agent.status)) {
      // Show status change if verbose
      if (verbose && agent.status !== lastStatus) {
        const statusDisplay = getStatusDisplay(agent.status);
        console.error(
          `Status changed: ${statusDisplay.symbol} ${statusDisplay.label}`,
        );
        lastStatus = agent.status;
      }

      // Wait before next poll
      await sleep(interval);

      // Fetch updated status
      agent = await apiClient.getAgentStatus(agentId);
    }

    // Agent reached terminal state
    const statusDisplay = getStatusDisplay(agent.status);
    if (verbose) {
      console.error("");
      console.error(
        `Agent ${agent.status === "FINISHED" ? "completed" : "terminated"}: ${statusDisplay.symbol} ${statusDisplay.label}`,
      );
      if (agent.summary) {
        console.error("");
        console.error(`Summary:\n${agent.summary}`);
      }
      if (agent.target.prUrl) {
        console.error("");
        console.error(`PR URL: ${agent.target.prUrl}`);
      }
    }

    // Exit with code 0 for FINISHED, 1 for FAILED/CANCELLED
    process.exit(agent.status === "FINISHED" ? 0 : 1);
  } catch (error) {
    if (error instanceof ApiError) {
      console.error("Watch failed: the API could not return the agent status.");
      console.error(`Reason: ${error.message}`);
      if (error.statusCode) {
        console.error(`HTTP status: ${error.statusCode}.`);
      }
      console.error(
        "Tip: make sure the agent still exists, your CURSOR_API_KEY is valid, and that you can reach https://api.cursor.com.",
      );
    } else if (error instanceof Error) {
      console.error(`Unexpected watch error: ${error.message}`);
      console.error(
        "Try again with a longer --interval or rerun after checking your network.",
      );
    } else {
      console.error(
        "Error: Failed to watch agent status due to an unknown issue.",
      );
      console.error(
        "Please retry in a moment or use cloud-agent status to check once without watching.",
      );
    }
    process.exit(1);
  }
}
