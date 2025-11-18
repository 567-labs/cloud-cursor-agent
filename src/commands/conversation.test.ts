import { test, expect, describe, beforeEach, vi } from "bun:test";
import { executeConversation } from "./conversation.jsx";
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
    const agent = {
      id: "bc_test123",
      name: "Test Agent",
      status: "RUNNING" as const,
      source: { repository: "https://github.com/test/repo" },
      target: { url: "https://cursor.com/agents?id=bc_test123" },
      createdAt: "2024-01-01T00:00:00Z",
    };

    context.apiClient.getAgentStatus = async () => agent;
    context.apiClient.getAgentConversation = async () => ({
      id: "bc_test123",
      messages: [],
    });

    await executeConversation(context, {
      agentId: "bc_test123",
    });

    expect(mockConsoleLog).toHaveBeenCalledWith("No messages yet.");
  });

  test("displays messages with status in non-interactive mode", async () => {
    const agent = {
      id: "bc_test123",
      name: "Test Agent",
      status: "RUNNING" as const,
      source: { repository: "https://github.com/test/repo" },
      target: { url: "https://cursor.com/agents?id=bc_test123" },
      createdAt: "2024-01-01T00:00:00Z",
    };

    context.apiClient.getAgentStatus = async () => agent;
    context.apiClient.getAgentConversation = async () => ({
      id: "bc_test123",
      messages: [
        {
          id: "msg1",
          type: "user_message" as const,
          text: "User message",
        },
        {
          id: "msg2",
          type: "assistant_message" as const,
          text: "Agent response",
        },
      ],
    });

    await executeConversation(context, {
      agentId: "bc_test123",
    });

    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining("Agent Status: RUNNING")
    );
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining("[User]")
    );
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining("[Agent]")
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
