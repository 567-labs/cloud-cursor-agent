import { test, expect, describe } from "bun:test";
import { render, screen } from "@testing-library/react";
import { AgentGroup } from "./AgentGroup.js";
import { createMockAgent } from "../../test/utils.jsx";
import { vi } from "bun:test";

// Mock Ink components
vi.mock("ink", () => import("../../test/mocks/ink.js"));
vi.mock("../Spinner.js", () => ({
  Spinner: () => <div data-testid="spinner">Loading...</div>,
}));

describe("AgentGroup", () => {
  const defaultProps = {
    groupKey: "RUNNING",
    agents: [],
    groupByRepository: false,
    flattenedAgents: [],
    selectedIndex: 0,
    expandedAgentId: null,
    openingBrowser: null,
    statusTransitionAgents: new Set<string>(),
    columnLayout: {
      nameWidth: 50,
      repoWidth: 40,
      stacked: false,
    },
    terminalWidth: 100,
    separatorWidth: 96,
  };

  test("renders null when agents array is empty", () => {
    const { container } = render(<AgentGroup {...defaultProps} />);
    expect(container.firstChild).toBeNull();
  });

  test("status grouping: renders header with status symbol and label", () => {
    const agents = [createMockAgent({ status: "RUNNING" })];
    render(
      <AgentGroup
        {...defaultProps}
        groupKey="RUNNING"
        agents={agents}
        flattenedAgents={agents}
      />
    );

    expect(screen.getByText(/Running/)).toBeDefined();
  });

  test("status grouping: renders agent count in header", () => {
    const agents = [
      createMockAgent({ id: "1", status: "RUNNING" }),
      createMockAgent({ id: "2", status: "RUNNING" }),
    ];
    render(
      <AgentGroup
        {...defaultProps}
        groupKey="RUNNING"
        agents={agents}
        flattenedAgents={agents}
      />
    );

    expect(screen.getByText(/\(2\)/)).toBeDefined();
  });

  test("repository grouping: renders header with repository URL", () => {
    const agents = [
      createMockAgent({
        source: { repository: "github.com/user/repo" },
      }),
    ];
    render(
      <AgentGroup
        {...defaultProps}
        groupKey="github.com/user/repo"
        agents={agents}
        groupByRepository={true}
        flattenedAgents={agents}
      />
    );

    expect(screen.getByText(/github.com\/user\/repo/)).toBeDefined();
  });

  test("repository grouping: renders agent count in header", () => {
    const agents = [
      createMockAgent({ source: { repository: "github.com/user/repo" } }),
      createMockAgent({ source: { repository: "github.com/user/repo" } }),
    ];
    render(
      <AgentGroup
        {...defaultProps}
        groupKey="github.com/user/repo"
        agents={agents}
        groupByRepository={true}
        flattenedAgents={agents}
      />
    );

    expect(screen.getByText(/\(2\)/)).toBeDefined();
  });

  test("renders all agents in group", () => {
    const agents = [
      createMockAgent({ id: "1", name: "Agent 1" }),
      createMockAgent({ id: "2", name: "Agent 2" }),
    ];
    render(
      <AgentGroup
        {...defaultProps}
        agents={agents}
        flattenedAgents={agents}
      />
    );

    expect(screen.getByText(/Agent 1/)).toBeDefined();
    expect(screen.getByText(/Agent 2/)).toBeDefined();
  });

  test("renders group footer separator", () => {
    const agents = [createMockAgent()];
    render(
      <AgentGroup
        {...defaultProps}
        agents={agents}
        flattenedAgents={agents}
      />
    );

    // Footer separator should be rendered
    const container = screen.getByTestId("ink-box");
    expect(container).toBeDefined();
  });

  test("handles selected index correctly", () => {
    const agents = [
      createMockAgent({ id: "1" }),
      createMockAgent({ id: "2" }),
    ];
    render(
      <AgentGroup
        {...defaultProps}
        agents={agents}
        flattenedAgents={agents}
        selectedIndex={1}
      />
    );

    // AgentItem should receive isSelected prop
    expect(screen.getByText(/Test Agent/)).toBeDefined();
  });

  test("handles expanded agent ID correctly", () => {
    const agent = createMockAgent({ id: "expanded-agent" });
    render(
      <AgentGroup
        {...defaultProps}
        agents={[agent]}
        flattenedAgents={[agent]}
        expandedAgentId="expanded-agent"
      />
    );

    expect(screen.getByText(/Test Agent/)).toBeDefined();
  });

  test("handles opening browser state correctly", () => {
    const agent = createMockAgent({ id: "opening-agent" });
    render(
      <AgentGroup
        {...defaultProps}
        agents={[agent]}
        flattenedAgents={[agent]}
        openingBrowser="opening-agent"
      />
    );

    expect(screen.getByText(/Test Agent/)).toBeDefined();
  });

  test("handles status transition agents correctly", () => {
    const agent = createMockAgent({ id: "transition-agent" });
    render(
      <AgentGroup
        {...defaultProps}
        agents={[agent]}
        flattenedAgents={[agent]}
        statusTransitionAgents={new Set(["transition-agent"])}
      />
    );

    expect(screen.getByText(/Test Agent/)).toBeDefined();
  });
});

