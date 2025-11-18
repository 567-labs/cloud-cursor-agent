import { test, expect, describe } from "bun:test";
import { render, screen } from "@testing-library/react";
import { AgentListFooter } from "./AgentListFooter.js";
import { vi } from "bun:test";

// Mock Ink components
vi.mock("ink", () => import("../../test/mocks/ink.js"));

describe("AgentListFooter", () => {
  const defaultProps = {
    agentCount: 0,
    paginationStart: 1,
    paginationEnd: 0,
    hasPreviousPage: false,
    hasNextPage: false,
    layoutBreakpoint: "wide" as const,
    openPrUrl: true,
  };

  test("pagination: shows correct range (e.g., 'Showing 1-10 of 25 agents')", () => {
    render(
      <AgentListFooter
        {...defaultProps}
        agentCount={25}
        paginationStart={1}
        paginationEnd={10}
      />
    );
    expect(screen.getByText(/Showing 1-10 of 25 agents/)).toBeDefined();
  });

  test("pagination: shows singular 'agent' for count of 1", () => {
    render(
      <AgentListFooter
        {...defaultProps}
        agentCount={1}
        paginationStart={1}
        paginationEnd={1}
      />
    );
    expect(screen.getByText(/Showing 1-1 of 1 agent/)).toBeDefined();
  });

  test("pagination: shows plural 'agents' for count > 1", () => {
    render(
      <AgentListFooter
        {...defaultProps}
        agentCount={25}
        paginationStart={1}
        paginationEnd={10}
      />
    );
    expect(screen.getByText(/25 agents/)).toBeDefined();
  });

  test("pagination: shows 'No agents' when count is 0", () => {
    render(<AgentListFooter {...defaultProps} agentCount={0} />);
    expect(screen.getByText(/No agents/)).toBeDefined();
  });

  test("layout label: shows correct layout label", () => {
    render(<AgentListFooter {...defaultProps} layoutBreakpoint="wide" />);
    expect(screen.getByText(/Wide layout/)).toBeDefined();

    const { rerender } = render(
      <AgentListFooter {...defaultProps} layoutBreakpoint="medium" />
    );
    expect(screen.getByText(/Medium layout/)).toBeDefined();

    rerender(<AgentListFooter {...defaultProps} layoutBreakpoint="compact" />);
    expect(screen.getByText(/Compact layout/)).toBeDefined();
  });

  test("pagination hints: shows '← Prev' when hasPreviousPage is true", () => {
    render(<AgentListFooter {...defaultProps} hasPreviousPage={true} />);
    expect(screen.getByText(/← Prev/)).toBeDefined();
  });

  test("pagination hints: shows '→ Next' when hasNextPage is true", () => {
    render(<AgentListFooter {...defaultProps} hasNextPage={true} />);
    expect(screen.getByText(/→ Next/)).toBeDefined();
  });

  test("pagination hints: does not show hints when pages unavailable", () => {
    render(
      <AgentListFooter
        {...defaultProps}
        hasPreviousPage={false}
        hasNextPage={false}
      />
    );
    expect(screen.queryByText(/← Prev/)).toBeNull();
    expect(screen.queryByText(/→ Next/)).toBeNull();
  });

  test("keyboard hints: shows all keyboard shortcuts", () => {
    render(<AgentListFooter {...defaultProps} />);
    expect(screen.getByText(/↑↓\/jk Navigate/)).toBeDefined();
    expect(screen.getByText(/Enter Expand\/Status/)).toBeDefined();
    expect(screen.getByText(/q Back/)).toBeDefined();
    expect(screen.getByText(/r Refresh/)).toBeDefined();
    expect(screen.getByText(/Filters 1-5\/a/)).toBeDefined();
    expect(screen.getByText(/g Group/)).toBeDefined();
    expect(screen.getByText(/t PR\/Agent/)).toBeDefined();
  });

  test("URL preference: shows 'Open PR' when openPrUrl is true", () => {
    render(<AgentListFooter {...defaultProps} openPrUrl={true} />);
    expect(screen.getByText(/Enter twice Open PR/)).toBeDefined();
  });

  test("URL preference: shows 'Open Agent' when openPrUrl is false", () => {
    render(<AgentListFooter {...defaultProps} openPrUrl={false} />);
    expect(screen.getByText(/Enter twice Open Agent/)).toBeDefined();
  });

  test("handles all combinations of pagination states", () => {
    render(
      <AgentListFooter
        {...defaultProps}
        agentCount={25}
        paginationStart={11}
        paginationEnd={20}
        hasPreviousPage={true}
        hasNextPage={true}
      />
    );

    expect(screen.getByText(/Showing 11-20 of 25 agents/)).toBeDefined();
    expect(screen.getByText(/← Prev/)).toBeDefined();
    expect(screen.getByText(/→ Next/)).toBeDefined();
  });
});

