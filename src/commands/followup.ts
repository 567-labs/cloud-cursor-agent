/**
 * Followup command - Add a follow-up instruction to an agent
 */

import { ApiError } from "../api/client.js";
import type { CommandContext, FollowupCommandOptions } from "../cli/types.js";
import { validateAgentId } from "../utils/validation.js";
import { readPlanFile } from "../utils/file.js";
import { validatePlanContent } from "../utils/validation.js";

export async function executeFollowup(
  context: CommandContext,
  options: FollowupCommandOptions
): Promise<void> {
  const { apiClient } = context;
  const { agentId, prompt } = options;

  // Validate agent ID format
  const agentIdValidation = validateAgentId(agentId);
  if (!agentIdValidation.valid) {
    console.error(`Error: ${agentIdValidation.error}`);
    console.error("");
    console.error("Agent ID must look like bc_123abc (letters and numbers only, at least 5 characters after bc_).");
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
      console.error("Error: Prompt cannot be empty");
      process.exit(1);
    }

    // Check agent status
    const agent = await apiClient.getAgentStatus(agentId);
    
    if (agent.status === "FINISHED" || agent.status === "FAILED" || agent.status === "CANCELLED") {
      console.error(`Error: Cannot add follow-up to agent that is ${agent.status.toLowerCase()}.`);
      process.exit(1);
      return;
    }

    // Add follow-up
    await apiClient.addFollowup(agentId, { text: promptText });

    console.log(`Follow-up instruction added to agent ${agentId}`);
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`Error: ${error.message}`);
    } else if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error("Error: Failed to add follow-up");
    }
    process.exit(1);
  }
}

