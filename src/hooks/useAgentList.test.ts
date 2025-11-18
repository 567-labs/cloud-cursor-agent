import { test, expect, describe, beforeEach } from "bun:test";
import { renderHook, waitFor } from "@testing-library/react";
import { useAgentList } from "./useAgentList.js";
import { createMockApiClient, createMockAgent } from "../test/utils.jsx";
import type { CloudAgentsApiClient } from "../api/client.js";

describe("useAgentList", () => {
  let mockApiClient: CloudAgentsApiClient;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
  });

  test("initial state: loading is true, agents empty", async () => {
    mockApiClient.listAgents = async () => ({
      agents: [],
      nextCursor: undefined,
    });

    const { result } = renderHook(() =>
      useAgentList({
        apiClient: mockApiClient,
        agentsPerView: 10,
      })
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.agents).toEqual([]);
  });

  test("loadAgents: loads agents successfully", async () => {
    const mockAgents = [
      createMockAgent({ id: "1" }),
      createMockAgent({ id: "2" }),
    ];

    mockApiClient.listAgents = async () => ({
      agents: mockAgents,
      nextCursor: undefined,
    });

    const { result } = renderHook(() =>
      useAgentList({
        apiClient: mockApiClient,
        agentsPerView: 10,
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.agents).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });

  test("loadAgents: handles API errors", async () => {
    mockApiClient.listAgents = async () => {
      throw new Error("API Error");
    };

    const { result } = renderHook(() =>
      useAgentList({
        apiClient: mockApiClient,
        agentsPerView: 10,
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("API Error");
    expect(result.current.agents).toEqual([]);
  });

  test("loadAgents: filters by repository when repositoryFilter provided", async () => {
    const matchingAgent = createMockAgent({
      id: "1",
      source: { repository: "github.com/user/repo" },
    });
    const nonMatchingAgent = createMockAgent({
      id: "2",
      source: { repository: "github.com/user/other" },
    });

    mockApiClient.listAgents = async () => ({
      agents: [matchingAgent, nonMatchingAgent],
      nextCursor: undefined,
    });

    const { result } = renderHook(() =>
      useAgentList({
        apiClient: mockApiClient,
        repositoryFilter: "github.com/user/repo",
        agentsPerView: 10,
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.agents).toHaveLength(1);
    expect(result.current.agents[0].id).toBe("1");
  });

  test("loadAgents: sets nextCursor correctly", async () => {
    mockApiClient.listAgents = async () => ({
      agents: [createMockAgent()],
      nextCursor: "cursor123",
    });

    const { result } = renderHook(() =>
      useAgentList({
        apiClient: mockApiClient,
        agentsPerView: 10,
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.nextCursor).toBe("cursor123");
  });

  test("loadAgents: tracks currentPageCursor", async () => {
    mockApiClient.listAgents = async () => ({
      agents: [createMockAgent()],
      nextCursor: undefined,
    });

    const { result } = renderHook(() =>
      useAgentList({
        apiClient: mockApiClient,
        agentsPerView: 10,
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    result.current.loadAgents("cursor123", 10);

    await waitFor(() => {
      expect(result.current.currentPageCursor).toBe("cursor123");
    });
  });

  test("refreshAgents: resets pagination state", async () => {
    mockApiClient.listAgents = async () => ({
      agents: [createMockAgent()],
      nextCursor: undefined,
    });

    const { result } = renderHook(() =>
      useAgentList({
        apiClient: mockApiClient,
        agentsPerView: 10,
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    result.current.setPrevCursors(["cursor1", "cursor2"]);
    result.current.setCurrentPageCursor("cursor3");

    result.current.refreshAgents();

    expect(result.current.prevCursors).toEqual([]);
    expect(result.current.currentPageCursor).toBeUndefined();
  });

  test("Status filtering: setStatusFilter updates filter", async () => {
    mockApiClient.listAgents = async () => ({
      agents: [],
      nextCursor: undefined,
    });

    const { result } = renderHook(() =>
      useAgentList({
        apiClient: mockApiClient,
        agentsPerView: 10,
      })
    );

    expect(result.current.statusFilter).toBeNull();

    result.current.setStatusFilter("RUNNING");
    expect(result.current.statusFilter).toBe("RUNNING");

    result.current.setStatusFilter(null);
    expect(result.current.statusFilter).toBeNull();
  });

  test("Grouping: setGroupByRepository toggles grouping mode", async () => {
    mockApiClient.listAgents = async () => ({
      agents: [],
      nextCursor: undefined,
    });

    const { result } = renderHook(() =>
      useAgentList({
        apiClient: mockApiClient,
        agentsPerView: 10,
      })
    );

    expect(result.current.groupByRepository).toBe(false);

    result.current.setGroupByRepository(true);
    expect(result.current.groupByRepository).toBe(true);

    result.current.setGroupByRepository(false);
    expect(result.current.groupByRepository).toBe(false);
  });

  test("URL preference: setOpenPrUrl toggles preference", async () => {
    mockApiClient.listAgents = async () => ({
      agents: [],
      nextCursor: undefined,
    });

    const { result } = renderHook(() =>
      useAgentList({
        apiClient: mockApiClient,
        agentsPerView: 10,
      })
    );

    expect(result.current.openPrUrl).toBe(true);

    result.current.setOpenPrUrl(false);
    expect(result.current.openPrUrl).toBe(false);

    result.current.setOpenPrUrl(true);
    expect(result.current.openPrUrl).toBe(true);
  });
});

