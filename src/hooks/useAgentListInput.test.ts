import { test, expect, describe, beforeEach, vi } from "bun:test";
import { renderHook } from "@testing-library/react";
import { useAgentListInput } from "./useAgentListInput.js";
import { createMockAgent } from "../test/utils.jsx";
import type { Agent } from "../api/schemas.js";

// Mock ink's useInput
vi.mock("ink", () => ({
  useInput: (callback: (input: string, key: any) => void) => {
    // Store callback for manual triggering in tests
    (global as any).__inkInputCallback = callback;
  },
}));

// Mock browser utility
vi.mock("../utils/browser.js", () => ({
  openInBrowser: vi.fn().mockResolvedValue(undefined),
}));

describe("useAgentListInput", () => {
  let handlers: any;
  let state: any;
  let inputCallback: (input: string, key: any) => void;

  beforeEach(() => {
    handlers = {
      onBack: vi.fn(),
      onRefresh: vi.fn(),
      setStatusFilter: vi.fn(),
      toggleGrouping: vi.fn(),
      toggleOpenPrUrl: vi.fn(),
      onPreviousPage: vi.fn(),
      onNextPage: vi.fn(),
      onMoveUp: vi.fn(),
      onMoveDown: vi.fn(),
      onEnter: vi.fn(),
      setExpandedAgentId: vi.fn(),
      setSelectedIndex: vi.fn(),
      setOpeningBrowser: vi.fn(),
      setError: vi.fn(),
    };

    state = {
      selectedIndex: 0,
      expandedAgentId: null,
      lastEnterPress: 0,
      openPrUrl: true,
      flattenedAgents: [createMockAgent()],
      hasPreviousPage: false,
      hasNextPage: false,
    };

    renderHook(() => useAgentListInput(handlers, state));
    inputCallback = (global as any).__inkInputCallback;
  });

  test("'q' key: calls onBack", () => {
    inputCallback("q", {});
    expect(handlers.onBack).toHaveBeenCalledTimes(1);
  });

  test("'r' key: calls onRefresh and resets state", () => {
    inputCallback("r", {});
    expect(handlers.setExpandedAgentId).toHaveBeenCalledWith(null);
    expect(handlers.onRefresh).toHaveBeenCalledTimes(1);
    expect(handlers.setSelectedIndex).toHaveBeenCalledWith(0);
  });

  test("'1' key: sets status filter to RUNNING", () => {
    inputCallback("1", {});
    expect(handlers.setStatusFilter).toHaveBeenCalledWith("RUNNING");
    expect(handlers.setSelectedIndex).toHaveBeenCalledWith(0);
    expect(handlers.setExpandedAgentId).toHaveBeenCalledWith(null);
  });

  test("'2' key: sets status filter to CREATING", () => {
    inputCallback("2", {});
    expect(handlers.setStatusFilter).toHaveBeenCalledWith("CREATING");
  });

  test("'3' key: sets status filter to FINISHED", () => {
    inputCallback("3", {});
    expect(handlers.setStatusFilter).toHaveBeenCalledWith("FINISHED");
  });

  test("'4' key: sets status filter to FAILED", () => {
    inputCallback("4", {});
    expect(handlers.setStatusFilter).toHaveBeenCalledWith("FAILED");
  });

  test("'5' key: sets status filter to CANCELLED", () => {
    inputCallback("5", {});
    expect(handlers.setStatusFilter).toHaveBeenCalledWith("CANCELLED");
  });

  test("'a'/'A' key: clears status filter", () => {
    inputCallback("a", {});
    expect(handlers.setStatusFilter).toHaveBeenCalledWith(null);

    handlers.setStatusFilter.mockClear();
    inputCallback("A", {});
    expect(handlers.setStatusFilter).toHaveBeenCalledWith(null);
  });

  test("'g'/'G' key: toggles grouping", () => {
    inputCallback("g", {});
    expect(handlers.toggleGrouping).toHaveBeenCalledTimes(1);

    handlers.toggleGrouping.mockClear();
    inputCallback("G", {});
    expect(handlers.toggleGrouping).toHaveBeenCalledTimes(1);
  });

  test("'t'/'T' key: toggles URL preference", () => {
    inputCallback("t", {});
    expect(handlers.toggleOpenPrUrl).toHaveBeenCalledTimes(1);

    handlers.toggleOpenPrUrl.mockClear();
    inputCallback("T", {});
    expect(handlers.toggleOpenPrUrl).toHaveBeenCalledTimes(1);
  });

  test("Left arrow: navigates to previous page when available", () => {
    state.hasPreviousPage = true;
    renderHook(() => useAgentListInput(handlers, state));
    inputCallback = (global as any).__inkInputCallback;

    inputCallback("", { leftArrow: true });
    expect(handlers.setExpandedAgentId).toHaveBeenCalledWith(null);
    expect(handlers.onPreviousPage).toHaveBeenCalledTimes(1);
    expect(handlers.setSelectedIndex).toHaveBeenCalledWith(0);
  });

  test("Right arrow: navigates to next page when available", () => {
    state.hasNextPage = true;
    renderHook(() => useAgentListInput(handlers, state));
    inputCallback = (global as any).__inkInputCallback;

    inputCallback("", { rightArrow: true });
    expect(handlers.setExpandedAgentId).toHaveBeenCalledWith(null);
    expect(handlers.onNextPage).toHaveBeenCalledTimes(1);
    expect(handlers.setSelectedIndex).toHaveBeenCalledWith(0);
  });

  test("Up arrow/'k': moves selection up", () => {
    state.selectedIndex = 1;
    renderHook(() => useAgentListInput(handlers, state));
    inputCallback = (global as any).__inkInputCallback;

    inputCallback("", { upArrow: true });
    expect(handlers.setExpandedAgentId).toHaveBeenCalledWith(null);
    expect(handlers.onMoveUp).toHaveBeenCalledTimes(1);

    handlers.onMoveUp.mockClear();
    inputCallback("k", {});
    expect(handlers.onMoveUp).toHaveBeenCalledTimes(1);
  });

  test("Down arrow/'j': moves selection down", () => {
    state.selectedIndex = 0;
    state.flattenedAgents = [createMockAgent(), createMockAgent()];
    renderHook(() => useAgentListInput(handlers, state));
    inputCallback = (global as any).__inkInputCallback;

    inputCallback("", { downArrow: true });
    expect(handlers.setExpandedAgentId).toHaveBeenCalledWith(null);
    expect(handlers.onMoveDown).toHaveBeenCalledTimes(1);

    handlers.onMoveDown.mockClear();
    inputCallback("j", {});
    expect(handlers.onMoveDown).toHaveBeenCalledTimes(1);
  });

  test("Enter: toggles expansion on single press", async () => {
    const agent = createMockAgent();
    state.flattenedAgents = [agent];
    state.selectedIndex = 0;
    state.expandedAgentId = null;
    renderHook(() => useAgentListInput(handlers, state));
    inputCallback = (global as any).__inkInputCallback;

    inputCallback("", { return: true });
    expect(handlers.onEnter).toHaveBeenCalledWith(agent);
  });

  test("Enter: does not call onEnter when no agent selected", () => {
    state.flattenedAgents = [];
    state.selectedIndex = 0;
    renderHook(() => useAgentListInput(handlers, state));
    inputCallback = (global as any).__inkInputCallback;

    inputCallback("", { return: true });
    expect(handlers.onEnter).not.toHaveBeenCalled();
  });
});

