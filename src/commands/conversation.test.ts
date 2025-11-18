import { test, expect, describe, beforeEach, vi } from "bun:test";
import { executeConversation } from "./conversation.js";
import { createMockApiClient } from "../test/utils.jsx";
import type { CommandContext } from "../api/client.js";
import { ApiError } from "../api/client.js";

// Mock console methods
const mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
const mockConsoleError = vi
  .spyOn(console, "error")
  .mockImplementation(() => {});
const mockProcessExit = vi.spyOn(process, "exit").mockImplementation(() => {
  return undefined as never;
});

describe("executeConversation", () => {
  let context: CommandContext;

  beforeEach(() => {
    vi.clearAllMocks();
    context = {
      apiClient: createMockApiClient(),
      workingDir: "/test",
    };
  });

  test("exits with error when agent ID is invalid", async () => {
    await executeConversation(context, {
      agentId: "invalid",
    });

    expect(mockConsoleError).toHaveBeenCalled();
    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });

  test("displays empty message when no messages", async () => {
    context.apiClient.getAgentConversation = async () => ({
      id: "bc_test123",
      messages: [],
    });

    await executeConversation(context, {
      agentId: "bc_test123",
    });

    expect(mockConsoleLog).toHaveBeenCalledWith("No messages yet.");
  });

  test("displays messages in non-interactive mode", async () => {
    context.apiClient.getAgentConversation = async () => ({
      id: "bc_test123",
      messages: [
        {
          id: "msg1",
          type: "user_message",
          text: "User message",
        },
        {
          id: "msg2",
          type: "assistant_message",
          text: "Agent response",
        },
      ],
    });

    await executeConversation(context, {
      agentId: "bc_test123",
      "non-interactive": true,
    });

    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining("[User]")
    );
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining("[Agent]")
    );
  });

  test("displays formatted messages in interactive mode", async () => {
    context.apiClient.getAgentConversation = async () => ({
      id: "bc_test123",
      messages: [
        {
          id: "msg1",
          type: "user_message",
          text: "User message",
        },
      ],
    });

    await executeConversation(context, {
      agentId: "bc_test123",
      "non-interactive": false,
    });

    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining("Conversation for agent")
    );
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining("User")
    );
  });

  test("handles API errors", async () => {
    context.apiClient.getAgentConversation = async () => {
      throw new ApiError("Agent not found", 404);
    };

    await executeConversation(context, {
      agentId: "bc_test123",
    });

    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining("Agent not found")
    );
    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });
});
