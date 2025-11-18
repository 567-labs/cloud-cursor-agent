/**
 * Open command - Open agent URL in browser
 */

import { ApiError } from "../api/client.js";
import type { CommandContext, OpenCommandOptions } from "../cli/types.js";
import { validateAgentId } from "../utils/validation.js";
import { openInBrowser } from "../utils/browser.js";

export async function executeOpen(
  context: CommandContext,
  options: OpenCommandOptions
): Promise<void> {
  const { apiClient } = context;
  const { agentId, pr = false } = options;

  // Validate agent ID format
  const agentIdValidation = validateAgentId(agentId);
  if (!agentIdValidation.valid) {
    console.error(`Error: ${agentIdValidation.error}`);
    console.error("");
    console.error("Agent ID must look like bc_123abc (letters and numbers only, at least 5 characters after bc_).");
    process.exit(1);
  }

  try {
    const agent = await apiClient.getAgentStatus(agentId);

    const url = pr ? agent.target.prUrl : agent.target.url;

    if (!url) {
      if (pr) {
        console.error("Error: No PR URL available for this agent.");
      } else {
        console.error("Error: No URL available for this agent.");
      }
      process.exit(1);
      return;
    }

    await openInBrowser(url);
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`Error: ${error.message}`);
    } else if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error("Error: Failed to open URL");
    }
    process.exit(1);
  }
}

