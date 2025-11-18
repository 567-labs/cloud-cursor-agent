import { test, expect, describe, beforeEach, vi } from "bun:test";
import { render, screen, waitFor } from "@testing-library/react";
import { AgentStatus } from "./AgentStatus.js";
import { createMockApiClient, createMockAgent } from "../test/utils.jsx";
import { ApiError } from "../api/client.js";
import type { CloudAgentsApiClient } from "../api/client.js";

// Mock Ink components
vi.mock("ink", () => import("../test/mocks/ink.js"));

describe("AgentStatus", () => {
  let mockApiClient: CloudAgentsApiClient;
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockApiClient = createMockApiClient();
  });

  test("shows loading spinner initially", () => {
    mockApiClient.getAgentStatus = async () => createMockAgent();

    render(
      <AgentStatus
        apiClient={mockApiClient}
        agentId="bc_test123"
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText(/Loading agent details/)).toBeDefined();
  });

  test("displays agent details when loaded", async () => {
    const agent = createMockAgent({
      id: "bc_test123",
      name: "Test Agent",
      status: "RUNNING",
    });

    mockApiClient.getAgentStatus = async () => agent;

    render(
      <AgentStatus
        apiClient={mockApiClient}
        agentId="bc_test123"
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Agent Details/)).toBeDefined();
      expect(screen.getByText(/bc_test123/)).toBeDefined();
      expect(screen.getByText(/Test Agent/)).toBeDefined();
    });
  });

  test("displays error message on API error", async () => {
    mockApiClient.getAgentStatus = async () => {
      throw new ApiError("Agent not found", 404);
    };

    render(
      <AgentStatus
        apiClient={mockApiClient}
        agentId="bc_test123"
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Error: Agent not found/)).toBeDefined();
    });
  });

  test("displays all agent fields", async () => {
    const agent = createMockAgent({
      id: "bc_test123",
      name: "Test Agent",
      status: "FINISHED",
      source: {
        repository: "github.com/user/repo",
        ref: "main",
      },
      target: {
        url: "https://cursor.com/agents?id=bc_test123",
        prUrl: "https://github.com/user/repo/pull/1",
        branchName: "test-branch",
      },
      summary: "Test summary",
    });

    mockApiClient.getAgentStatus = async () => agent;

    render(
      <AgentStatus
        apiClient={mockApiClient}
        agentId="bc_test123"
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/bc_test123/)).toBeDefined();
      expect(screen.getByText(/Test Agent/)).toBeDefined();
      expect(screen.getByText(/github.com\/user\/repo/)).toBeDefined();
      expect(screen.getByText(/main/)).toBeDefined();
      expect(screen.getByText(/test-branch/)).toBeDefined();
      expect(screen.getByText(/Test summary/)).toBeDefined();
    });
  });

  test("handles missing optional fields", async () => {
    const agent = createMockAgent({
      source: { repository: "github.com/user/repo" },
      target: { url: "https://cursor.com/agents?id=test" },
    });
    delete (agent.source as any).ref;
    delete (agent.target as any).prUrl;
    delete (agent.target as any).branchName;
    delete (agent as any).summary;

    mockApiClient.getAgentStatus = async () => agent;

    render(
      <AgentStatus
        apiClient={mockApiClient}
        agentId="bc_test123"
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/N\/A/)).toBeDefined();
    });
  });
});
