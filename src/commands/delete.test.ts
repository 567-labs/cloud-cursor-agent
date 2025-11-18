import { test, expect, describe, beforeEach, vi } from "bun:test";
import { executeDelete } from "./delete.js";
import { createMockApiClient, createMockAgent } from "../test/utils.jsx";
import type { CommandContext } from "../cli/types.js";
import { ApiError } from "../api/client.js";

// Mock console methods
const mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
const mockConsoleError = vi
  .spyOn(console, "error")
  .mockImplementation(() => {});
const mockProcessExit = vi.spyOn(process, "exit").mockImplementation(() => {
  return undefined as never;
});

describe("executeDelete", () => {
  let context: CommandContext;

  beforeEach(() => {
    vi.clearAllMocks();
    context = {
      apiClient: createMockApiClient(),
      workingDir: "/test",
    };
  });

  test("deletes finished agent successfully", async () => {
    const agent = createMockAgent({
      id: "bc_test123",
      status: "FINISHED",
    });

    context.apiClient.getAgentStatus = async () => agent;
    context.apiClient.deleteAgent = vi.fn().mockResolvedValue({});

    await executeDelete(context, { agentId: "bc_test123" });

    expect(context.apiClient.deleteAgent).toHaveBeenCalledWith("bc_test123");
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining("deleted successfully")
    );
  });

  test("exits with error when agent ID is invalid", async () => {
    await executeDelete(context, { agentId: "invalid" });

    expect(mockConsoleError).toHaveBeenCalled();
    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });

  test("exits with error when trying to delete running agent without force", async () => {
    const agent = createMockAgent({
      id: "bc_test123",
      status: "RUNNING",
    });

    context.apiClient.getAgentStatus = async () => agent;

    await executeDelete(context, { agentId: "bc_test123" });

    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining("Cannot delete agent that is running")
    );
    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });

  test("exits with error when trying to delete creating agent without force", async () => {
    const agent = createMockAgent({
      id: "bc_test123",
      status: "CREATING",
    });

    context.apiClient.getAgentStatus = async () => agent;

    await executeDelete(context, { agentId: "bc_test123" });

    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining("Cannot delete agent that is creating")
    );
    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });

  test("deletes running agent when force is true", async () => {
    const agent = createMockAgent({
      id: "bc_test123",
      status: "RUNNING",
    });

    context.apiClient.getAgentStatus = async () => agent;
    context.apiClient.deleteAgent = vi.fn().mockResolvedValue({});

    await executeDelete(context, { agentId: "bc_test123", force: true });

    expect(context.apiClient.deleteAgent).toHaveBeenCalledWith("bc_test123");
    expect(mockConsoleLog).toHaveBeenCalled();
  });

  test("skips status check when force is true", async () => {
    context.apiClient.deleteAgent = vi.fn().mockResolvedValue({});

    await executeDelete(context, { agentId: "bc_test123", force: true });

    expect(context.apiClient.deleteAgent).toHaveBeenCalledWith("bc_test123");
    expect(mockConsoleLog).toHaveBeenCalled();
  });

  test("handles API errors", async () => {
    const agent = createMockAgent({
      id: "bc_test123",
      status: "FINISHED",
    });

    context.apiClient.getAgentStatus = async () => agent;
    context.apiClient.deleteAgent = async () => {
      throw new ApiError("Delete failed", 500);
    };

    await executeDelete(context, { agentId: "bc_test123" });

    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining("Delete failed")
    );
    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });
});
