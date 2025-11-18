import { test, expect, describe, beforeEach, vi } from "bun:test";
import { executeFollowup } from "./followup.js";
import { createMockApiClient, createMockAgent } from "../test/utils.jsx";
import type { CommandContext } from "../cli/types.js";
import { ApiError } from "../api/client.js";

// Mock file utilities
vi.mock("../utils/file.js", () => ({
  readPlanFile: vi.fn(),
}));

// Mock console methods
const mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
const mockConsoleError = vi
  .spyOn(console, "error")
  .mockImplementation(() => {});
const mockProcessExit = vi.spyOn(process, "exit").mockImplementation(() => {
  return undefined as never;
});

describe("executeFollowup", () => {
  let context: CommandContext;
  let mockReadPlanFile: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    context = {
      apiClient: createMockApiClient(),
      workingDir: "/test",
    };
    const fileModule = await import("../utils/file.js");
    mockReadPlanFile = vi.mocked(fileModule.readPlanFile);
  });

  test("exits with error when agent ID is invalid", async () => {
    await executeFollowup(context, {
      agentId: "invalid",
      prompt: "Test prompt",
    });

    expect(mockConsoleError).toHaveBeenCalled();
    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });

  test("adds followup with direct text prompt", async () => {
    const agent = createMockAgent({
      id: "bc_test123",
      status: "RUNNING",
    });

    context.apiClient.getAgentStatus = async () => agent;
    context.apiClient.addFollowup = vi.fn().mockResolvedValue({});

    await executeFollowup(context, {
      agentId: "bc_test123",
      prompt: "Continue with the next task",
    });

    expect(context.apiClient.addFollowup).toHaveBeenCalledWith(
      "bc_test123",
      expect.objectContaining({
        text: "Continue with the next task",
      })
    );
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining("Follow-up instruction added")
    );
  });

  test("reads from file when prompt starts with @", async () => {
    const agent = createMockAgent({
      id: "bc_test123",
      status: "RUNNING",
    });

    mockReadPlanFile.mockResolvedValue("File content from plan.md");

    context.apiClient.getAgentStatus = async () => agent;
    context.apiClient.addFollowup = vi.fn().mockResolvedValue({});

    await executeFollowup(context, {
      agentId: "bc_test123",
      prompt: "@plan.md",
    });

    expect(mockReadPlanFile).toHaveBeenCalledWith("plan.md");
    expect(context.apiClient.addFollowup).toHaveBeenCalledWith(
      "bc_test123",
      expect.objectContaining({
        text: "File content from plan.md",
      })
    );
  });

  test("reads from stdin when prompt is '-'", async () => {
    const agent = createMockAgent({
      id: "bc_test123",
      status: "RUNNING",
    });

    mockReadPlanFile.mockResolvedValue("Stdin content");

    context.apiClient.getAgentStatus = async () => agent;
    context.apiClient.addFollowup = vi.fn().mockResolvedValue({});

    await executeFollowup(context, {
      agentId: "bc_test123",
      prompt: "-",
    });

    expect(mockReadPlanFile).toHaveBeenCalledWith("-");
    expect(context.apiClient.addFollowup).toHaveBeenCalledWith(
      "bc_test123",
      expect.objectContaining({
        text: "Stdin content",
      })
    );
  });

  test("exits with error when prompt is empty", async () => {
    const agent = createMockAgent({
      id: "bc_test123",
      status: "RUNNING",
    });

    context.apiClient.getAgentStatus = async () => agent;

    await executeFollowup(context, {
      agentId: "bc_test123",
      prompt: "   ",
    });

    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining("Prompt cannot be empty")
    );
    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });

  test("exits with error when agent is finished", async () => {
    const agent = createMockAgent({
      id: "bc_test123",
      status: "FINISHED",
    });

    context.apiClient.getAgentStatus = async () => agent;

    await executeFollowup(context, {
      agentId: "bc_test123",
      prompt: "Test prompt",
    });

    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining("Cannot add follow-up to agent that is finished")
    );
    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });

  test("handles API errors", async () => {
    context.apiClient.getAgentStatus = async () => {
      throw new ApiError("Agent not found", 404);
    };

    await executeFollowup(context, {
      agentId: "bc_test123",
      prompt: "Test prompt",
    });

    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining("Agent not found")
    );
    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });
});
