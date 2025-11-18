import { test, expect, describe } from "bun:test";
import { render, screen } from "@testing-library/react";
import { AgentItem } from "./AgentItem.js";
import { createMockAgent } from "../../test/utils.jsx";
import { vi } from "bun:test";

// Mock Ink components
vi.mock("ink", () => import("../../test/mocks/ink.js"));

describe("AgentItem", () => {
  const defaultProps = {
    agent: createMockAgent(),
    isSelected: false,
    isExpanded: false,
    isOpening: false,
    hasStatusTransition: false,
    columnLayout: {
      nameWidth: 50,
      repoWidth: 40,
      stacked: false,
    },
    terminalWidth: 100,
    separatorWidth: 96,
  };

  test("renders agent name with status symbol", () => {
    render(<AgentItem {...defaultProps} />);
    expect(screen.getByText(/Test Agent/)).toBeDefined();
  });

  test("renders repository URL (compact format)", () => {
    const agent = createMockAgent({
      source: { repository: "https://github.com/user/repo.git" },
    });
    render(<AgentItem {...defaultProps} agent={agent} />);
    expect(screen.getByText(/user\/repo/)).toBeDefined();
  });

  test("stacked layout: renders name and repo on separate lines", () => {
    render(
      <AgentItem
        {...defaultProps}
        columnLayout={{ nameWidth: 50, repoWidth: 50, stacked: true }}
      />
    );
    expect(screen.getByText(/Test Agent/)).toBeDefined();
  });

  test("side-by-side layout: renders name and repo on same line", () => {
    render(
      <AgentItem
        {...defaultProps}
        columnLayout={{ nameWidth: 50, repoWidth: 40, stacked: false }}
      />
    );
    expect(screen.getByText(/Test Agent/)).toBeDefined();
  });

  test("selection: highlights selected agent", () => {
    render(<AgentItem {...defaultProps} isSelected={true} />);
    expect(screen.getByText(/Test Agent/)).toBeDefined();
  });

  test("expansion: shows full name and repo when expanded", () => {
    const agent = createMockAgent({ name: "Very Long Agent Name" });
    render(<AgentItem {...defaultProps} agent={agent} isExpanded={true} />);
    expect(screen.getByText(/Very Long Agent Name/)).toBeDefined();
  });

  test("expansion: shows expanded details section when expanded", () => {
    render(<AgentItem {...defaultProps} isExpanded={true} />);
    expect(screen.getByText(/Agent ID:/)).toBeDefined();
    expect(screen.getByText(/Status:/)).toBeDefined();
    expect(screen.getByText(/Repository:/)).toBeDefined();
  });

  test("status transition: shows transition indicator when hasStatusTransition is true", () => {
    render(<AgentItem {...defaultProps} hasStatusTransition={true} />);
    expect(screen.getByText(/Test Agent/)).toBeDefined();
  });

  test("expanded details: shows all agent fields when expanded", () => {
    const agent = createMockAgent({
      id: "test-id",
      name: "Test Agent",
      status: "RUNNING",
      source: { repository: "github.com/user/repo", ref: "main" },
      target: {
        url: "https://cursor.com/agents?id=test-id",
        prUrl: "https://github.com/user/repo/pull/1",
        branchName: "test-branch",
      },
      summary: "Test summary",
    });
    render(<AgentItem {...defaultProps} agent={agent} isExpanded={true} />);

    expect(screen.getByText(/test-id/)).toBeDefined();
    expect(screen.getByText(/Test Agent/)).toBeDefined();
    expect(screen.getByText(/Running/)).toBeDefined();
    expect(screen.getByText(/github.com\/user\/repo/)).toBeDefined();
    expect(screen.getByText(/main/)).toBeDefined();
    expect(screen.getByText(/test-branch/)).toBeDefined();
    expect(screen.getByText(/Test summary/)).toBeDefined();
  });

  test("expanded details: shows PR URL when available", () => {
    const agent = createMockAgent({
      target: {
        url: "https://cursor.com/agents?id=test",
        prUrl: "https://github.com/user/repo/pull/1",
      },
    });
    render(<AgentItem {...defaultProps} agent={agent} isExpanded={true} />);
    expect(screen.getByText(/Pull Request:/)).toBeDefined();
  });

  test("expanded details: shows summary when available", () => {
    const agent = createMockAgent({
      summary: "This is a test summary",
    });
    render(<AgentItem {...defaultProps} agent={agent} isExpanded={true} />);
    expect(screen.getByText(/Summary:/)).toBeDefined();
    expect(screen.getByText(/This is a test summary/)).toBeDefined();
  });

  test("expanded details: shows relative time for createdAt", () => {
    render(<AgentItem {...defaultProps} isExpanded={true} />);
    expect(screen.getByText(/Created:/)).toBeDefined();
  });

  test("opening browser: shows 'Opening in browser...' when isOpening is true", () => {
    render(<AgentItem {...defaultProps} isExpanded={true} isOpening={true} />);
    expect(screen.getByText(/Opening in browser/)).toBeDefined();
  });

  test("selection indicator: shows '>' when selected, ' ' when not", () => {
    const { rerender } = render(<AgentItem {...defaultProps} isSelected={false} />);
    expect(screen.getByText(/Test Agent/)).toBeDefined();

    rerender(<AgentItem {...defaultProps} isSelected={true} />);
    expect(screen.getByText(/Test Agent/)).toBeDefined();
  });

  test("handles missing optional fields gracefully", () => {
    const agent = createMockAgent({
      source: { repository: "github.com/user/repo" },
      target: { url: "https://cursor.com/agents?id=test" },
    });
    delete (agent as any).summary;
    delete (agent.target as any).prUrl;
    delete (agent.source as any).ref;

    render(<AgentItem {...defaultProps} agent={agent} isExpanded={true} />);
    expect(screen.getByText(/Test Agent/)).toBeDefined();
  });
});
