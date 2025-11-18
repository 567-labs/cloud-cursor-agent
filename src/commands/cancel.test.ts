import { test, expect, describe, beforeEach, vi } from "bun:test";
import { executeCancel } from "./cancel.js";
import { createMockApiClient, createMockAgent } from "../test/utils.jsx";
import type { CommandContext } from "../cli/types.js";
import { ApiError } from "../api/client.js";

// Mock console methods
const mockConsoleError = vi
  .spyOn(console, "error")
  .mockImplementation(() => {});
const mockProcessExit = vi.spyOn(process, "exit").mockImplementation(() => {
  return undefined as never;
});

describe("executeCancel", () => {
  let context: CommandContext;

  beforeEach(() => {
    vi.clearAllMocks();
    context = {
      apiClient: createMockApiClient(),
      workingDir: "/test",
    };
  });

  test("exits with error when agent ID is invalid", async () => {
    await executeCancel(context, { agentId: "invalid" });

    expect(mockConsoleError).toHaveBeenCalled();
    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });

  test("exits with error when agent is already finished", async () => {
    const agent = createMockAgent({
      id: "bc_test123",
      status: "FINISHED",
    });

    context.apiClient.getAgentStatus = async () => agent;

    await executeCancel(context, { agentId: "bc_test123" });

    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining("already finished")
    );
    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });

  test("exits with error when agent is already failed", async () => {
    const agent = createMockAgent({
      id: "bc_test123",
      status: "FAILED",
    });

    context.apiClient.getAgentStatus = async () => agent;

    await executeCancel(context, { agentId: "bc_test123" });

    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining("already failed")
    );
    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });

  test("exits with error when agent is already cancelled", async () => {
    const agent = createMockAgent({
      id: "bc_test123",
      status: "CANCELLED",
    });

    context.apiClient.getAgentStatus = async () => agent;

    await executeCancel(context, { agentId: "bc_test123" });

    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining("already cancelled")
    );
    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });

  test("shows not supported message for running agents", async () => {
    const agent = createMockAgent({
      id: "bc_test123",
      status: "RUNNING",
    });

    context.apiClient.getAgentStatus = async () => agent;

    await executeCancel(context, { agentId: "bc_test123" });

    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining("not yet supported")
    );
    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });

  test("handles API errors", async () => {
    context.apiClient.getAgentStatus = async () => {
      throw new ApiError("Agent not found", 404);
    };

    await executeCancel(context, { agentId: "bc_test123" });

    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining("Agent not found")
    );
    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });
});
