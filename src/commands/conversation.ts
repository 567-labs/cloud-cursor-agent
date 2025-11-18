/**
 * Conversation command - View agent conversation/logs
 */

import { ApiError } from "../api/client.js";
import type { CommandContext } from "../cli/types.js";
import { validateAgentId } from "../utils/validation.js";

interface ConversationOptions {
  agentId: string;
  "non-interactive"?: boolean;
}

export async function executeConversation(
  context: CommandContext,
  options: ConversationOptions,
): Promise<void> {
  const { apiClient } = context;
  const { agentId, "non-interactive": nonInteractive } = options;

  // Validate agent ID format
  const agentIdValidation = validateAgentId(agentId);
  if (!agentIdValidation.valid) {
    console.error(`Error: ${agentIdValidation.error}`);
    console.error("");
    console.error(
      "Agent ID must look like bc_123abc (letters and numbers only, at least 5 characters after bc_).",
    );
    console.error(
      "Tip: run bun run cloud-agent.tsx list to find the id you need.",
    );
    process.exit(1);
  }

  try {
    const conversation = await apiClient.getAgentConversation(agentId);

    if (nonInteractive) {
      // Plain text output
      if (conversation.messages.length === 0) {
        console.log("No messages yet.");
        return;
      }

      for (const message of conversation.messages) {
        const prefix = message.type === "user_message" ? "[User]" : "[Agent]";
        console.log(`${prefix} ${message.text}`);
        console.log("");
      }
    } else {
      // Formatted output
      if (conversation.messages.length === 0) {
        console.log("No messages yet.");
        return;
      }

      console.log(`Conversation for agent ${agentId}`);
      console.log("=".repeat(60));
      console.log("");

      for (const message of conversation.messages) {
        const prefix = message.type === "user_message" ? "👤 User" : "🤖 Agent";
        console.log(`${prefix}:`);
        console.log(message.text);
        console.log("");
      }
    }
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(
        "Conversation fetch failed: the API did not return the message log.",
      );
      console.error(`Reason: ${error.message}`);
      console.error(
        "Hint: make sure the agent still exists and that your CURSOR_API_KEY is valid.",
      );
    } else if (error instanceof Error) {
      console.error(`Unexpected conversation error: ${error.message}`);
      console.error(
        "Try rerunning with --non-interactive if the terminal cannot render emojis.",
      );
    } else {
      console.error("Error: Failed to get conversation for an unknown reason.");
      console.error("Wait a moment, then retry with the same agent id.");
    }
    process.exit(1);
  }
}
