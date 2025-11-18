/**
 * List Models command - Show available models for cloud agents
 */

import { ApiError } from "../api/client.js";
import type { CommandContext } from "../cli/types.js";

export async function executeListModels(
  context: CommandContext
): Promise<void> {
  const { apiClient } = context;

  try {
    const response = await apiClient.listModels();

    if (response.models.length === 0) {
      console.log("No models available.");
      return;
    }

    console.log("Available Models:");
    console.log("─────────────────");
    response.models.forEach((model) => {
      console.log(`  • ${model}`);
    });
    console.log("");
    console.log(
      "Tip: Use --model <name> with the launch command to specify a model, or omit it to auto-select."
    );
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`Error: ${error.message}`);
    } else if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error("Error: Failed to list models");
    }
    process.exit(1);
  }
}
