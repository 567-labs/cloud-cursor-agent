/**
 * Me command - Show API key information
 */

import { ApiError } from "../api/client.js";
import type { CommandContext } from "../cli/types.js";

export async function executeMe(context: CommandContext): Promise<void> {
  const { apiClient } = context;

  try {
    const info = await apiClient.getApiKeyInfo();

    console.log("API Key Information:");
    console.log("────────────────────");
    console.log(`Name: ${info.apiKeyName}`);
    console.log(`Email: ${info.userEmail}`);
    console.log(`Created: ${info.createdAt}`);
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`Error: ${error.message}`);
    } else if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error("Error: Failed to retrieve API key information");
    }
    process.exit(1);
  }
}
