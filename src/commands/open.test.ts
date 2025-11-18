import { test, expect, describe, beforeEach, vi } from "bun:test";
import { executeOpen } from "./open.js";
import { createMockApiClient, createMockAgent } from "../test/utils.jsx";
import type { CommandContext } from "../cli/types.js";
import { ApiError } from "../api/client.js";

// Mock browser utility
vi.mock("../utils/browser.js", () => ({
  openInBrowser: vi.fn().mockResolvedValue(undefined),
}));

// Mock console methods
const mockConsoleError = vi
  .spyOn(console, "error")
  .mockImplementation(() => {});
const mockProcessExit = vi.spyOn(process, "exit").mockImplementation(() => {
  return undefined as never;
});

describe("executeOpen", () => {
  let context: CommandContext;
  let mockOpenInBrowser: any;

  beforeEach(() => {
    vi.clearAllMocks();
    context = {
      apiClient: createMockApiClient(),
      workingDir: "/test",
    };
    mockOpenInBrowser = (await import("../utils/browser.js")).openInBrowser;
  });

  test("opens agent URL when agent exists", async () => {
    const agent = createMockAgent({
      id: "bc_test123",
      target: {
        url: "https://cursor.com/agents?id=bc_test123",
      },
    });

    context.apiClient.getAgentStatus = async () => agent;

    await executeOpen(context, { agentId: "bc_test123" });

    expect(mockOpenInBrowser).toHaveBeenCalledWith(
      "https://cursor.com/agents?id=bc_test123"
    );
  });

  test("opens PR URL when pr option is true", async () => {
    const agent = createMockAgent({
      id: "bc_test123",
      target: {
        url: "https://cursor.com/agents?id=bc_test123",
        prUrl: "https://github.com/user/repo/pull/1",
      },
    });

    context.apiClient.getAgentStatus = async () => agent;

    await executeOpen(context, { agentId: "bc_test123", pr: true });

    expect(mockOpenInBrowser).toHaveBeenCalledWith(
      "https://github.com/user/repo/pull/1"
    );
  });

  test("exits with error when agent ID is invalid", async () => {
    await executeOpen(context, { agentId: "invalid" });

    expect(mockConsoleError).toHaveBeenCalled();
    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });

  test("exits with error when PR URL is requested but not available", async () => {
    const agent = createMockAgent({
      id: "bc_test123",
      target: {
        url: "https://cursor.com/agents?id=bc_test123",
      },
    });

    context.apiClient.getAgentStatus = async () => agent;

    await executeOpen(context, { agentId: "bc_test123", pr: true });

    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining("No PR URL available")
    );
    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });

  test("exits with error when agent URL is not available", async () => {
    const agent = createMockAgent({
      id: "bc_test123",
      target: {} as any,
    });

    context.apiClient.getAgentStatus = async () => agent;

    await executeOpen(context, { agentId: "bc_test123" });

    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining("No URL available")
    );
    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });

  test("handles API errors", async () => {
    context.apiClient.getAgentStatus = async () => {
      throw new ApiError("Agent not found", 404);
    };

    await executeOpen(context, { agentId: "bc_test123" });

    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining("Agent not found")
    );
    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });

  test("handles generic errors", async () => {
    context.apiClient.getAgentStatus = async () => {
      throw new Error("Network error");
    };

    await executeOpen(context, { agentId: "bc_test123" });

    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining("Network error")
    );
    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });
});
