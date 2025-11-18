import { test, expect, describe, beforeEach, vi } from "bun:test";
import { CloudAgentsApiClient, ApiError } from "./client.js";
import { createMockAgent } from "../test/utils.jsx";

// Mock global fetch
global.fetch = vi.fn();

describe("CloudAgentsApiClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    test("throws error for empty API key", () => {
      expect(() => new CloudAgentsApiClient("")).toThrow("API key is required");
      expect(() => new CloudAgentsApiClient("   ")).toThrow(
        "API key is required"
      );
    });

    test("creates client with valid API key", () => {
      const client = new CloudAgentsApiClient("test-api-key");
      expect(client).toBeInstanceOf(CloudAgentsApiClient);
    });

    test("trims API key whitespace", () => {
      const client = new CloudAgentsApiClient("  test-api-key  ");
      expect(client).toBeInstanceOf(CloudAgentsApiClient);
    });

    test("uses custom baseUrl when provided", () => {
      const client = new CloudAgentsApiClient(
        "test-api-key",
        "https://custom-api.com"
      );
      expect(client).toBeInstanceOf(CloudAgentsApiClient);
    });
  });

  describe("listAgents", () => {
    test("makes correct API request", async () => {
      const mockFetch = vi.mocked(global.fetch);
      const mockAgent = createMockAgent();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          agents: [mockAgent],
          nextCursor: undefined,
        }),
        headers: {
          get: () => null,
        },
      } as any);

      const client = new CloudAgentsApiClient("test-api-key");
      const result = await client.listAgents(10);

      expect(mockFetch).toHaveBeenCalled();
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toContain("/v0/agents");
      expect(callArgs[1]).toMatchObject({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: expect.stringContaining("Basic"),
        }),
      });
      expect(result.agents).toHaveLength(1);
    });

    test("includes limit parameter", async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ agents: [], nextCursor: undefined }),
        headers: {
          get: () => null,
        },
      } as any);

      const client = new CloudAgentsApiClient("test-api-key");
      await client.listAgents(20);

      expect(mockFetch).toHaveBeenCalled();
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("limit=20");
    });

    test("includes cursor parameter when provided", async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ agents: [], nextCursor: undefined }),
        headers: {
          get: () => null,
        },
      } as any);

      const client = new CloudAgentsApiClient("test-api-key");
      await client.listAgents(10, "cursor123");

      expect(mockFetch).toHaveBeenCalled();
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("cursor=cursor123");
    });

    test("throws ApiError on API error", async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({}),
        headers: {
          get: () => null,
        },
      } as any);

      const client = new CloudAgentsApiClient("test-api-key");

      await expect(client.listAgents(10)).rejects.toThrow(ApiError);
    });
  });

  describe("getAgentStatus", () => {
    test("makes correct API request", async () => {
      const mockFetch = vi.mocked(global.fetch);
      const mockAgent = createMockAgent();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockAgent,
        headers: {
          get: () => null,
        },
      } as any);

      const client = new CloudAgentsApiClient("test-api-key");
      const result = await client.getAgentStatus("bc_test123");

      expect(mockFetch).toHaveBeenCalled();
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("/v0/agents/bc_test123");
      expect(result).toEqual(mockAgent);
    });
  });

  describe("launchAgent", () => {
    test("makes POST request with correct body", async () => {
      const mockFetch = vi.mocked(global.fetch);
      const mockAgent = createMockAgent();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockAgent,
        headers: {
          get: () => null,
        },
      } as any);

      const client = new CloudAgentsApiClient("test-api-key");
      const request = {
        prompt: { text: "Test plan" },
        source: { repository: "github.com/user/repo" },
      };

      await client.launchAgent(request);

      expect(mockFetch).toHaveBeenCalled();
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toContain("/v0/agents");
      expect(callArgs[1]).toMatchObject({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(request),
      });
    });
  });

  describe("error handling", () => {
    test("handles rate limiting (429)", async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        headers: {
          get: (name: string) => (name === "Retry-After" ? "60" : null),
        },
        json: async () => ({}),
      } as any);

      const client = new CloudAgentsApiClient("test-api-key");

      await expect(client.listAgents(10)).rejects.toThrow(
        "Rate limit exceeded"
      );
    });

    test("handles authentication errors (401)", async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({}),
        headers: {
          get: () => null,
        },
      } as any);

      const client = new CloudAgentsApiClient("test-api-key");

      await expect(client.listAgents(10)).rejects.toThrow(
        "Authentication failed"
      );
    });

    test("handles not found (404)", async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({}),
        headers: {
          get: () => null,
        },
      } as any);

      const client = new CloudAgentsApiClient("test-api-key");

      await expect(client.getAgentStatus("bc_invalid")).rejects.toThrow(
        "Resource not found"
      );
    });

    test("handles server errors (500)", async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
        headers: {
          get: () => null,
        },
      } as any);

      const client = new CloudAgentsApiClient("test-api-key");

      await expect(client.listAgents(10)).rejects.toThrow(
        "The service had a problem"
      );
    });
  });
});

describe("ApiError", () => {
  test("creates error with message", () => {
    const error = new ApiError("Test error");
    expect(error.message).toBe("Test error");
    expect(error.name).toBe("ApiError");
  });

  test("includes status code", () => {
    const error = new ApiError("Test error", 404);
    expect(error.statusCode).toBe(404);
  });

  test("includes response data", () => {
    const response = { detail: "Not found" };
    const error = new ApiError("Test error", 404, response);
    expect(error.response).toEqual(response);
  });
});
