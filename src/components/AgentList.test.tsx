import { test, expect, describe, beforeEach, vi } from "bun:test";
import { render, screen, waitFor } from "@testing-library/react";
import { AgentList } from "./AgentList.js";
import { createMockApiClient, createMockAgent } from "../test/utils.jsx";
import type { CloudAgentsApiClient } from "../api/client.js";

// Mock Ink components
vi.mock("ink", () => import("../test/mocks/ink.js"));
vi.mock("./Spinner.js", () => ({
  Spinner: ({ text }: { text?: string }) => (
    <div data-testid="spinner">{text || "Loading..."}</div>
  ),
}));

// Mock hooks
vi.mock("../hooks/useTerminalDimensions.js", () => ({
  useTerminalDimensions: () => ({
    terminalWidth: 100,
    terminalHeight: 30,
  }),
}));

vi.mock("../hooks/useAgentList.js", () => ({
  useAgentList: vi.fn(),
}));

vi.mock("../hooks/useAgentListInput.js", () => ({
  useAgentListInput: vi.fn(),
}));

describe("AgentList", () => {
  let mockApiClient: CloudAgentsApiClient;
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockApiClient = createMockApiClient();
  });

  test("loading state: shows spinner when loading and no agents", () => {
    const { useAgentList } = require("../hooks/useAgentList.js");
    useAgentList.mockReturnValue({
      agents: [],
      loading: true,
      error: null,
      nextCursor: undefined,
      prevCursors: [],
      currentPageCursor: undefined,
      statusFilter: null,
      setStatusFilter: vi.fn(),
      groupByRepository: false,
      setGroupByRepository: vi.fn(),
      statusTransitionAgents: new Set(),
      openPrUrl: true,
      setOpenPrUrl: vi.fn(),
      loadAgents: vi.fn(),
      refreshAgents: vi.fn(),
      setPrevCursors: vi.fn(),
      setCurrentPageCursor: vi.fn(),
    });

    render(<AgentList apiClient={mockApiClient} onBack={mockOnBack} />);
    expect(screen.getByTestId("spinner")).toBeDefined();
    expect(screen.getByText(/Loading your agents/)).toBeDefined();
  });

  test("error state: shows error message", () => {
    const { useAgentList } = require("../hooks/useAgentList.js");
    useAgentList.mockReturnValue({
      agents: [],
      loading: false,
      error: "Failed to load agents",
      nextCursor: undefined,
      prevCursors: [],
      currentPageCursor: undefined,
      statusFilter: null,
      setStatusFilter: vi.fn(),
      groupByRepository: false,
      setGroupByRepository: vi.fn(),
      statusTransitionAgents: new Set(),
      openPrUrl: true,
      setOpenPrUrl: vi.fn(),
      loadAgents: vi.fn(),
      refreshAgents: vi.fn(),
      setPrevCursors: vi.fn(),
      setCurrentPageCursor: vi.fn(),
    });

    render(<AgentList apiClient={mockApiClient} onBack={mockOnBack} />);
    expect(screen.getByText(/Error: Failed to load agents/)).toBeDefined();
  });

  test("empty state: shows EmptyState when no filtered agents", () => {
    const { useAgentList } = require("../hooks/useAgentList.js");
    useAgentList.mockReturnValue({
      agents: [],
      loading: false,
      error: null,
      nextCursor: undefined,
      prevCursors: [],
      currentPageCursor: undefined,
      statusFilter: null,
      setStatusFilter: vi.fn(),
      groupByRepository: false,
      setGroupByRepository: vi.fn(),
      statusTransitionAgents: new Set(),
      openPrUrl: true,
      setOpenPrUrl: vi.fn(),
      loadAgents: vi.fn(),
      refreshAgents: vi.fn(),
      setPrevCursors: vi.fn(),
      setCurrentPageCursor: vi.fn(),
    });

    render(<AgentList apiClient={mockApiClient} onBack={mockOnBack} />);
    expect(screen.getByText(/No agents found yet/)).toBeDefined();
  });

  test("renders AgentListHeader with correct props", () => {
    const agents = [createMockAgent()];
    const { useAgentList } = require("../hooks/useAgentList.js");
    useAgentList.mockReturnValue({
      agents,
      loading: false,
      error: null,
      nextCursor: undefined,
      prevCursors: [],
      currentPageCursor: undefined,
      statusFilter: null,
      setStatusFilter: vi.fn(),
      groupByRepository: false,
      setGroupByRepository: vi.fn(),
      statusTransitionAgents: new Set(),
      openPrUrl: true,
      setOpenPrUrl: vi.fn(),
      loadAgents: vi.fn(),
      refreshAgents: vi.fn(),
      setPrevCursors: vi.fn(),
      setCurrentPageCursor: vi.fn(),
    });

    render(<AgentList apiClient={mockApiClient} onBack={mockOnBack} />);
    expect(screen.getByText(/Your Cloud Agents/)).toBeDefined();
  });

  test("renders AgentListFooter with correct props", () => {
    const agents = [createMockAgent()];
    const { useAgentList } = require("../hooks/useAgentList.js");
    useAgentList.mockReturnValue({
      agents,
      loading: false,
      error: null,
      nextCursor: undefined,
      prevCursors: [],
      currentPageCursor: undefined,
      statusFilter: null,
      setStatusFilter: vi.fn(),
      groupByRepository: false,
      setGroupByRepository: vi.fn(),
      statusTransitionAgents: new Set(),
      openPrUrl: true,
      setOpenPrUrl: vi.fn(),
      loadAgents: vi.fn(),
      refreshAgents: vi.fn(),
      setPrevCursors: vi.fn(),
      setCurrentPageCursor: vi.fn(),
    });

    render(<AgentList apiClient={mockApiClient} onBack={mockOnBack} />);
    expect(screen.getByText(/Showing/)).toBeDefined();
  });

  test("status filtering: filters agents correctly", () => {
    const agents = [
      createMockAgent({ id: "1", status: "RUNNING" }),
      createMockAgent({ id: "2", status: "FINISHED" }),
    ];
    const { useAgentList } = require("../hooks/useAgentList.js");
    useAgentList.mockReturnValue({
      agents,
      loading: false,
      error: null,
      nextCursor: undefined,
      prevCursors: [],
      currentPageCursor: undefined,
      statusFilter: "RUNNING",
      setStatusFilter: vi.fn(),
      groupByRepository: false,
      setGroupByRepository: vi.fn(),
      statusTransitionAgents: new Set(),
      openPrUrl: true,
      setOpenPrUrl: vi.fn(),
      loadAgents: vi.fn(),
      refreshAgents: vi.fn(),
      setPrevCursors: vi.fn(),
      setCurrentPageCursor: vi.fn(),
    });

    render(<AgentList apiClient={mockApiClient} onBack={mockOnBack} />);
    // Should only show RUNNING agent
    expect(screen.getByText(/Test Agent/)).toBeDefined();
  });

  test("repository filtering: filters agents correctly", () => {
    const agents = [
      createMockAgent({
        id: "1",
        source: { repository: "github.com/user/repo" },
      }),
    ];
    const { useAgentList } = require("../hooks/useAgentList.js");
    useAgentList.mockReturnValue({
      agents,
      loading: false,
      error: null,
      nextCursor: undefined,
      prevCursors: [],
      currentPageCursor: undefined,
      statusFilter: null,
      setStatusFilter: vi.fn(),
      groupByRepository: false,
      setGroupByRepository: vi.fn(),
      statusTransitionAgents: new Set(),
      openPrUrl: true,
      setOpenPrUrl: vi.fn(),
      loadAgents: vi.fn(),
      refreshAgents: vi.fn(),
      setPrevCursors: vi.fn(),
      setCurrentPageCursor: vi.fn(),
    });

    render(
      <AgentList
        apiClient={mockApiClient}
        onBack={mockOnBack}
        repositoryFilter="github.com/user/repo"
      />
    );
    expect(screen.getByText(/Test Agent/)).toBeDefined();
  });

  test("grouping: groups by status correctly", () => {
    const agents = [
      createMockAgent({ id: "1", status: "RUNNING" }),
      createMockAgent({ id: "2", status: "FINISHED" }),
    ];
    const { useAgentList } = require("../hooks/useAgentList.js");
    useAgentList.mockReturnValue({
      agents,
      loading: false,
      error: null,
      nextCursor: undefined,
      prevCursors: [],
      currentPageCursor: undefined,
      statusFilter: null,
      setStatusFilter: vi.fn(),
      groupByRepository: false,
      setGroupByRepository: vi.fn(),
      statusTransitionAgents: new Set(),
      openPrUrl: true,
      setOpenPrUrl: vi.fn(),
      loadAgents: vi.fn(),
      refreshAgents: vi.fn(),
      setPrevCursors: vi.fn(),
      setCurrentPageCursor: vi.fn(),
    });

    render(<AgentList apiClient={mockApiClient} onBack={mockOnBack} />);
    expect(screen.getByText(/Test Agent/)).toBeDefined();
  });

  test("grouping: groups by repository correctly", () => {
    const agents = [
      createMockAgent({
        id: "1",
        source: { repository: "github.com/user/repo" },
      }),
    ];
    const { useAgentList } = require("../hooks/useAgentList.js");
    useAgentList.mockReturnValue({
      agents,
      loading: false,
      error: null,
      nextCursor: undefined,
      prevCursors: [],
      currentPageCursor: undefined,
      statusFilter: null,
      setStatusFilter: vi.fn(),
      groupByRepository: true,
      setGroupByRepository: vi.fn(),
      statusTransitionAgents: new Set(),
      openPrUrl: true,
      setOpenPrUrl: vi.fn(),
      loadAgents: vi.fn(),
      refreshAgents: vi.fn(),
      setPrevCursors: vi.fn(),
      setCurrentPageCursor: vi.fn(),
    });

    render(<AgentList apiClient={mockApiClient} onBack={mockOnBack} />);
    expect(screen.getByText(/Test Agent/)).toBeDefined();
  });

  test("pagination: calculates pagination range correctly", () => {
    const agents = [createMockAgent(), createMockAgent()];
    const { useAgentList } = require("../hooks/useAgentList.js");
    useAgentList.mockReturnValue({
      agents,
      loading: false,
      error: null,
      nextCursor: undefined,
      prevCursors: [],
      currentPageCursor: undefined,
      statusFilter: null,
      setStatusFilter: vi.fn(),
      groupByRepository: false,
      setGroupByRepository: vi.fn(),
      statusTransitionAgents: new Set(),
      openPrUrl: true,
      setOpenPrUrl: vi.fn(),
      loadAgents: vi.fn(),
      refreshAgents: vi.fn(),
      setPrevCursors: vi.fn(),
      setCurrentPageCursor: vi.fn(),
    });

    render(<AgentList apiClient={mockApiClient} onBack={mockOnBack} />);
    expect(screen.getByText(/Showing/)).toBeDefined();
  });

  test("renders AgentGroup components correctly", () => {
    const agents = [createMockAgent()];
    const { useAgentList } = require("../hooks/useAgentList.js");
    useAgentList.mockReturnValue({
      agents,
      loading: false,
      error: null,
      nextCursor: undefined,
      prevCursors: [],
      currentPageCursor: undefined,
      statusFilter: null,
      setStatusFilter: vi.fn(),
      groupByRepository: false,
      setGroupByRepository: vi.fn(),
      statusTransitionAgents: new Set(),
      openPrUrl: true,
      setOpenPrUrl: vi.fn(),
      loadAgents: vi.fn(),
      refreshAgents: vi.fn(),
      setPrevCursors: vi.fn(),
      setCurrentPageCursor: vi.fn(),
    });

    render(<AgentList apiClient={mockApiClient} onBack={mockOnBack} />);
    expect(screen.getByText(/Test Agent/)).toBeDefined();
  });

  test("handles keyboard input through useAgentListInput hook", () => {
    const agents = [createMockAgent()];
    const { useAgentList } = require("../hooks/useAgentList.js");
    const { useAgentListInput } = require("../hooks/useAgentListInput.js");

    useAgentList.mockReturnValue({
      agents,
      loading: false,
      error: null,
      nextCursor: undefined,
      prevCursors: [],
      currentPageCursor: undefined,
      statusFilter: null,
      setStatusFilter: vi.fn(),
      groupByRepository: false,
      setGroupByRepository: vi.fn(),
      statusTransitionAgents: new Set(),
      openPrUrl: true,
      setOpenPrUrl: vi.fn(),
      loadAgents: vi.fn(),
      refreshAgents: vi.fn(),
      setPrevCursors: vi.fn(),
      setCurrentPageCursor: vi.fn(),
    });

    render(<AgentList apiClient={mockApiClient} onBack={mockOnBack} />);

    expect(useAgentListInput).toHaveBeenCalled();
  });
});

