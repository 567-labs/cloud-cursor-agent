/**
 * Followup command - Add a follow-up instruction to an agent
 */

import { ApiError } from "../api/client.js";
import type { CommandContext } from "../cli/types.js";
import { validateAgentId } from "../utils/validation.js";
import { readPlanFile } from "../utils/file.js";
import { validatePlanContent } from "../utils/validation.js";

interface FollowupOptions {
  agentId: string;
  prompt: string;
}

export async function executeFollowup(
  context: CommandContext,
  options: FollowupOptions,
): Promise<void> {
  const { apiClient } = context;
  const { agentId, prompt } = options;

  // Validate agent ID format
  const agentIdValidation = validateAgentId(agentId);
  if (!agentIdValidation.valid) {
    console.error(`Error: ${agentIdValidation.error}`);
    console.error("");
    console.error(
      "Agent ID must look like bc_123abc (letters and numbers only, at least 5 characters after bc_).",
    );
    console.error(
      "Tip: run bun run cloud-agent.tsx list and copy the id from that table.",
    );
    process.exit(1);
  }

  try {
    // Check if prompt is a file path or direct text
    let promptText: string;
    if (prompt === "-") {
      // Read from stdin
      promptText = await readPlanFile("-");
    } else if (prompt.startsWith("@")) {
      // File path
      const filePath = prompt.slice(1);
      promptText = await readPlanFile(filePath);
    } else {
      // Direct text
      promptText = prompt;
    }

    // Validate prompt content (if it's not too short, treat as plan-like content)
    if (promptText.length > 10) {
      const validation = validatePlanContent(promptText);
      if (!validation.valid && validation.error.includes("empty")) {
        // Only fail on empty content, allow other validation issues for flexibility
        console.error(`Error: ${validation.error}`);
        process.exit(1);
      }
    }

    if (!promptText.trim()) {
      console.error("Error: Prompt cannot be empty.");
      console.error(
        'Try again with quoted text ("fix the README") or reference a file like @followup.md.',
      );
      process.exit(1);
    }

    // Check agent status
    const agent = await apiClient.getAgentStatus(agentId);

    if (
      agent.status === "FINISHED" ||
      agent.status === "FAILED" ||
      agent.status === "CANCELLED"
    ) {
      console.error(
        `Error: Cannot add follow-up because the agent is already ${agent.status.toLowerCase()}.`,
      );
      console.error(
        "Start a new agent with cloud-agent launch or rerun watch to confirm the latest status.",
      );
      process.exit(1);
      return;
    }

    // Add follow-up
    await apiClient.addFollowup(agentId, { text: promptText });

    console.log(`Follow-up instruction added to agent ${agentId}`);
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(
        "Follow-up failed: the API did not accept the instruction.",
      );
      console.error(`Reason: ${error.message}`);
      console.error(
        'Example: bun run cloud-agent.tsx followup bc_123abc --prompt "Add tests for status util"',
      );
    } else if (error instanceof Error) {
      console.error(`Unexpected follow-up error: ${error.message}`);
      console.error(
        "Double-check the file path or text you passed to --prompt.",
      );
    } else {
      console.error("Error: Failed to add follow-up due to an unknown issue.");
      console.error(
        "Retry in a few seconds or confirm the agent id with cloud-agent status <id>.",
      );
    }
    process.exit(1);
  }
}
