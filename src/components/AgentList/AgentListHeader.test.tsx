import { test, expect, describe } from "bun:test";
import { render, screen } from "@testing-library/react";
import { AgentListHeader } from "./AgentListHeader.js";
import { vi } from "bun:test";

// Mock Ink components
vi.mock("ink", () => import("../../test/mocks/ink.js"));
vi.mock("../Spinner.js", () => ({
  Spinner: ({ text }: { text?: string }) => (
    <div data-testid="spinner">{text || "Loading..."}</div>
  ),
}));

describe("AgentListHeader", () => {
  const defaultProps = {
    agentCount: 0,
    statusFilter: null as const,
    groupByRepository: false,
    loading: false,
    separatorWidth: 80,
  };

  test("renders title 'Your Cloud Agents'", () => {
    render(<AgentListHeader {...defaultProps} />);
    expect(screen.getByText(/Your Cloud Agents/)).toBeDefined();
  });

  test("renders agent count when > 0", () => {
    render(<AgentListHeader {...defaultProps} agentCount={10} />);
    expect(screen.getByText(/\(10 agents\)/)).toBeDefined();
  });

  test("renders singular 'agent' for count of 1", () => {
    render(<AgentListHeader {...defaultProps} agentCount={1} />);
    expect(screen.getByText(/\(1 agent\)/)).toBeDefined();
  });

  test("renders plural 'agents' for count > 1", () => {
    render(<AgentListHeader {...defaultProps} agentCount={5} />);
    expect(screen.getByText(/\(5 agents\)/)).toBeDefined();
  });

  test("status filter: shows filter indicator when statusFilter is set", () => {
    render(
      <AgentListHeader {...defaultProps} agentCount={5} statusFilter="RUNNING" />
    );
    expect(screen.getByText(/Filter: Running/)).toBeDefined();
  });

  test("status filter: shows correct status label", () => {
    render(
      <AgentListHeader {...defaultProps} agentCount={5} statusFilter="FINISHED" />
    );
    expect(screen.getByText(/Filter: Finished/)).toBeDefined();
  });

  test("repository filter: shows repository filter when provided", () => {
    render(
      <AgentListHeader
        {...defaultProps}
        agentCount={5}
        repositoryFilter="github.com/user/repo"
      />
    );
    expect(screen.getByText(/github.com\/user\/repo/)).toBeDefined();
  });

  test("grouping mode: shows 'Grouped by repository' when groupByRepository is true", () => {
    render(
      <AgentListHeader {...defaultProps} agentCount={5} groupByRepository={true} />
    );
    expect(screen.getByText(/Grouped by repository/)).toBeDefined();
  });

  test("loading spinner: shows spinner when loading and agentCount > 0", () => {
    render(<AgentListHeader {...defaultProps} agentCount={5} loading={true} />);
    expect(screen.getByTestId("spinner")).toBeDefined();
    expect(screen.getByText(/Refreshing/)).toBeDefined();
  });

  test("loading spinner: does not show when not loading", () => {
    render(<AgentListHeader {...defaultProps} agentCount={5} loading={false} />);
    expect(screen.queryByTestId("spinner")).toBeNull();
  });

  test("loading spinner: does not show when agentCount is 0", () => {
    render(<AgentListHeader {...defaultProps} agentCount={0} loading={true} />);
    expect(screen.queryByTestId("spinner")).toBeNull();
  });

  test("renders separator line", () => {
    render(<AgentListHeader {...defaultProps} />);
    const container = screen.getByTestId("ink-box");
    expect(container).toBeDefined();
  });

  test("handles all filters simultaneously", () => {
    render(
      <AgentListHeader
        {...defaultProps}
        agentCount={10}
        statusFilter="RUNNING"
        repositoryFilter="github.com/user/repo"
        groupByRepository={true}
        loading={true}
      />
    );

    expect(screen.getByText(/Your Cloud Agents/)).toBeDefined();
    expect(screen.getByText(/\(10 agents\)/)).toBeDefined();
    expect(screen.getByText(/Filter: Running/)).toBeDefined();
    expect(screen.getByText(/github.com\/user\/repo/)).toBeDefined();
    expect(screen.getByText(/Grouped by repository/)).toBeDefined();
    expect(screen.getByTestId("spinner")).toBeDefined();
  });
});

