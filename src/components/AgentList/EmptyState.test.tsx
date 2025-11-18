import { test, expect, describe } from "bun:test";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "./EmptyState.js";
import { vi } from "bun:test";

// Mock Ink components
vi.mock("ink", () => import("../../test/mocks/ink.js"));

describe("EmptyState", () => {
  test("no filter: shows 'No agents found yet'", () => {
    render(<EmptyState statusFilter={null} />);
    expect(screen.getByText(/No agents found yet/)).toBeDefined();
  });

  test("no filter: shows instruction to create first agent", () => {
    render(<EmptyState statusFilter={null} />);
    expect(
      screen.getByText(/To create your first cloud agent, run:/)
    ).toBeDefined();
  });

  test("no filter: shows command example", () => {
    render(<EmptyState statusFilter={null} />);
    expect(screen.getByText(/cloud-agent launch --plan plan.md/)).toBeDefined();
  });

  test("status filter: shows 'No agents found with status: [label]'", () => {
    render(<EmptyState statusFilter="RUNNING" />);
    expect(
      screen.getByText(/No agents found with status: Running/)
    ).toBeDefined();
  });

  test("status filter: shows correct status label", () => {
    render(<EmptyState statusFilter="FINISHED" />);
    expect(
      screen.getByText(/No agents found with status: Finished/)
    ).toBeDefined();

    const { rerender } = render(<EmptyState statusFilter="FAILED" />);
    expect(
      screen.getByText(/No agents found with status: Failed/)
    ).toBeDefined();
  });

  test("status filter: shows instruction to press 'a' to show all", () => {
    render(<EmptyState statusFilter="RUNNING" />);
    expect(screen.getByText(/Press 'a' to show all agents/)).toBeDefined();
  });

  test("always shows 'Press 'q' to go back'", () => {
    render(<EmptyState statusFilter={null} />);
    expect(screen.getByText(/Press 'q' to go back/)).toBeDefined();

    const { rerender } = render(<EmptyState statusFilter="RUNNING" />);
    expect(screen.getByText(/Press 'q' to go back/)).toBeDefined();
  });

  test("handles all status types correctly", () => {
    const statuses = [
      "CREATING",
      "RUNNING",
      "FINISHED",
      "FAILED",
      "CANCELLED",
    ] as const;

    statuses.forEach((status) => {
      const { unmount } = render(<EmptyState statusFilter={status} />);
      expect(
        screen.getByText(new RegExp(`No agents found with status:`))
      ).toBeDefined();
      unmount();
    });
  });

  test("does not show create instruction when filter is active", () => {
    render(<EmptyState statusFilter="RUNNING" />);
    expect(screen.queryByText(/To create your first cloud agent/)).toBeNull();
    expect(screen.queryByText(/cloud-agent launch/)).toBeNull();
  });
});
