/**
 * Open command - Open agent URL in browser
 */

import { ApiError } from "../api/client.js";
import type { CommandContext } from "../cli/types.js";
import { validateAgentId } from "../utils/validation.js";
import { openInBrowser } from "../utils/browser.js";

interface OpenOptions {
  agentId: string;
  pr?: boolean;
}

/**
 * Open either the agent page or PR URL in the user's default browser.
 *
 * @param {CommandContext} context - Shared CLI context with the API client.
 * @param {OpenOptions} options - Agent ID and whether to open the PR URL.
 * @returns {Promise<void>} Resolves after the browser command finishes.
 * @example
 * await executeOpen(context, { agentId: "bc_abc123", pr: true });
 */
export async function executeOpen(
  context: CommandContext,
  options: OpenOptions,
): Promise<void> {
  const { apiClient } = context;
  const { agentId, pr = false } = options;

  // Validate agent ID format
  const agentIdValidation = validateAgentId(agentId);
  if (!agentIdValidation.valid) {
    console.error(`Error: ${agentIdValidation.error}`);
    console.error("");
    console.error(
      "Agent ID must look like bc_123abc (letters and numbers only, at least 5 characters after bc_).",
    );
    console.error(
      "Tip: run bun run cloud-agent.tsx list to copy the right id.",
    );
    process.exit(1);
  }

  try {
    const agent = await apiClient.getAgentStatus(agentId);

    const url = pr ? agent.target.prUrl : agent.target.url;

    if (!url) {
      if (pr) {
        console.error("Error: No PR URL available for this agent.");
        console.error(
          "The agent may not have created a PR yet or it failed before pushing changes.",
        );
      } else {
        console.error("Error: No URL available for this agent.");
        console.error(
          "The agent might still be running or it has been deleted.",
        );
      }
      console.error(
        "Next steps: run cloud-agent watch or status to see the latest progress, then try open again.",
      );
      process.exit(1);
      return;
    }

    await openInBrowser(url);
  } catch (error) {
    if (error instanceof ApiError) {
      console.error("Open failed: the API did not return the URL.");
      console.error(`Reason: ${error.message}`);
      console.error(
        "Troubleshooting: confirm the agent id exists and CURSOR_API_KEY is set.",
      );
    } else if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      console.error(
        "Troubleshooting: check that your default browser command works (xdg-open on Linux).",
      );
    } else {
      console.error("Error: Failed to open URL.");
      console.error(
        "Try running with --pr to open the pull request directly, or copy the URL from cloud-agent watch.",
      );
    }
    process.exit(1);
  }
}
