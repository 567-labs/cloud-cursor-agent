/**
 * Watch command - Block until agent(s) complete
 */

import { ApiError } from "../api/client.js";
import type { CommandContext } from "../cli/types.js";
import { validateAgentId } from "../utils/validation.js";
import { getStatusDisplay } from "../utils/status.js";
import type { AgentStatus, Agent } from "../api/schemas.js";

interface WatchOptions {
  agentIds: string[];
  interval?: number;
  verbose?: boolean;
}

const TERMINAL_STATUSES: AgentStatus[] = ["FINISHED", "FAILED", "CANCELLED"];
const DEFAULT_POLL_INTERVAL = 2000; // 2 seconds

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Watch a single agent until it reaches a terminal state
 */
async function watchSingleAgent(
  apiClient: CommandContext["apiClient"],
  agentId: string,
  interval: number,
  verbose: boolean
): Promise<Agent> {
  // Initial status check
  let agent = await apiClient.getAgentStatus(agentId);

  if (verbose) {
    console.error(`Watching agent ${agentId}...`);
    console.error(`Initial status: ${agent.status}`);
  }

  // If already in terminal state, return immediately
  if (TERMINAL_STATUSES.includes(agent.status)) {
    if (verbose) {
      const statusDisplay = getStatusDisplay(agent.status);
      console.error(`Agent ${agentId} is already ${statusDisplay.label.toLowerCase()}.`);
    }
    return agent;
  }

  // Poll until terminal state
  let lastStatus = agent.status;
  while (!TERMINAL_STATUSES.includes(agent.status)) {
    // Show status change if verbose
    if (verbose && agent.status !== lastStatus) {
      const statusDisplay = getStatusDisplay(agent.status);
      console.error(`[${agentId}] Status changed: ${statusDisplay.symbol} ${statusDisplay.label}`);
      lastStatus = agent.status;
    }

    // Wait before next poll
    await sleep(interval);

    // Fetch updated status
    agent = await apiClient.getAgentStatus(agentId);
  }

  return agent;
}

export async function executeWatch(
  context: CommandContext,
  options: WatchOptions
): Promise<void> {
  const { apiClient } = context;
  const { agentIds, interval = DEFAULT_POLL_INTERVAL, verbose = false } = options;

  // Validate all agent IDs
  const invalidIds: string[] = [];
  for (const agentId of agentIds) {
    const agentIdValidation = validateAgentId(agentId);
    if (!agentIdValidation.valid) {
      invalidIds.push(agentId);
    }
  }

  if (invalidIds.length > 0) {
    console.error(`Error: Invalid agent ID(s): ${invalidIds.join(", ")}`);
    console.error("");
    console.error("Agent IDs must look like bc_123abc or bc-uuid-format (letters, numbers, and hyphens only, at least 5 characters after bc- or bc_).");
    process.exit(1);
  }

  if (verbose && agentIds.length > 1) {
    console.error(`Watching ${agentIds.length} agent(s)...`);
    console.error("");
  }

  try {
    // Watch all agents in parallel
    const results = await Promise.all(
      agentIds.map((agentId) =>
        watchSingleAgent(apiClient, agentId, interval, verbose).catch((error) => {
          // Return error info instead of throwing
          return { error, agentId } as const;
        })
      )
    );

    // Check for errors
    const errors = results.filter((r): r is { error: unknown; agentId: string } => "error" in r);
    if (errors.length > 0) {
      for (const { error, agentId } of errors) {
        if (error instanceof ApiError) {
          console.error(`Error watching agent ${agentId}: ${error.message}`);
        } else if (error instanceof Error) {
          console.error(`Error watching agent ${agentId}: ${error.message}`);
        } else {
          console.error(`Error watching agent ${agentId}: Failed to watch agent status`);
        }
      }
      process.exit(1);
      return;
    }

    // All agents completed successfully
    const agents = results as Agent[];

    if (verbose) {
      console.error("");
      for (const agent of agents) {
        const statusDisplay = getStatusDisplay(agent.status);
        const statusText = agent.status === "FINISHED" ? "completed" : "terminated";
        console.error(`Agent ${agent.id} ${statusText}: ${statusDisplay.symbol} ${statusDisplay.label}`);
        if (agent.summary) {
          console.error(`  Summary: ${agent.summary}`);
        }
        if (agent.target.prUrl) {
          console.error(`  PR URL: ${agent.target.prUrl}`);
        }
        console.error("");
      }
    }

    // Determine exit code: 0 if all finished successfully, 1 if any failed/cancelled
    const allFinished = agents.every((agent) => agent.status === "FINISHED");

    // Exit with code 0 if all finished, 1 otherwise
    process.exit(allFinished ? 0 : 1);
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`Error: ${error.message}`);
    } else if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error("Error: Failed to watch agent status");
    }
    process.exit(1);
  }
}

