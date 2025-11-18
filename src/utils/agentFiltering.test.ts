import { test, expect, describe } from "bun:test";
import {
  filterAgentsByStatus,
  flattenGroupedAgents,
} from "./agentFiltering.js";
import { createMockAgent } from "../test/utils.jsx";

describe("filterAgentsByStatus", () => {
  test("filters agents by status correctly", () => {
    const agents = [
      createMockAgent({ status: "RUNNING" }),
      createMockAgent({ status: "FINISHED" }),
      createMockAgent({ status: "RUNNING" }),
    ];

    const filtered = filterAgentsByStatus(agents, "RUNNING");

    expect(filtered).toHaveLength(2);
    expect(filtered.every((a) => a.status === "RUNNING")).toBe(true);
  });

  test("returns all agents when filter is null", () => {
    const agents = [createMockAgent(), createMockAgent()];
    const filtered = filterAgentsByStatus(agents, null);
    expect(filtered).toEqual(agents);
  });

  test("handles empty arrays", () => {
    expect(filterAgentsByStatus([], "RUNNING")).toEqual([]);
  });

  test("filters by CREATING status", () => {
    const agents = [
      createMockAgent({ status: "CREATING" }),
      createMockAgent({ status: "RUNNING" }),
      createMockAgent({ status: "CREATING" }),
    ];
    const filtered = filterAgentsByStatus(agents, "CREATING");
    expect(filtered).toHaveLength(2);
    expect(filtered.every((a) => a.status === "CREATING")).toBe(true);
  });

  test("filters by FINISHED status", () => {
    const agents = [
      createMockAgent({ status: "FINISHED" }),
      createMockAgent({ status: "RUNNING" }),
    ];
    const filtered = filterAgentsByStatus(agents, "FINISHED");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].status).toBe("FINISHED");
  });

  test("returns empty array when no agents match filter", () => {
    const agents = [
      createMockAgent({ status: "RUNNING" }),
      createMockAgent({ status: "FINISHED" }),
    ];
    const filtered = filterAgentsByStatus(agents, "FAILED");
    expect(filtered).toEqual([]);
  });
});

describe("flattenGroupedAgents", () => {
  test("flattens repository-grouped agents correctly", () => {
    const agent1 = createMockAgent({
      id: "1",
      source: { repository: "github.com/user/repo1" },
      status: "RUNNING",
    });
    const agent2 = createMockAgent({
      id: "2",
      source: { repository: "github.com/user/repo1" },
      status: "FINISHED",
    });
    const agent3 = createMockAgent({
      id: "3",
      source: { repository: "github.com/user/repo2" },
      status: "RUNNING",
    });

    const groupedAgents = new Map([
      ["github.com/user/repo1", [agent1, agent2]],
      ["github.com/user/repo2", [agent3]],
    ]);

    const flattened = flattenGroupedAgents(groupedAgents, true, []);

    expect(flattened).toHaveLength(3);
    // Should be sorted by repo, then by status within repo
    expect(flattened[0].source.repository).toContain("repo1");
    expect(flattened[2].source.repository).toContain("repo2");
  });

  test("flattens status-grouped agents correctly", () => {
    const agent1 = createMockAgent({ id: "1", status: "RUNNING" });
    const agent2 = createMockAgent({ id: "2", status: "FINISHED" });
    const agent3 = createMockAgent({ id: "3", status: "RUNNING" });

    const groupedAgents = new Map([
      ["RUNNING", [agent1, agent3]],
      ["FINISHED", [agent2]],
    ]);

    const flattened = flattenGroupedAgents(groupedAgents, false, [
      "RUNNING",
      "FINISHED",
    ]);

    expect(flattened).toHaveLength(3);
    expect(flattened[0].status).toBe("RUNNING");
    expect(flattened[1].status).toBe("RUNNING");
    expect(flattened[2].status).toBe("FINISHED");
  });

  test("preserves status order within repository groups", () => {
    const agents = [
      createMockAgent({ id: "1", status: "FINISHED" }),
      createMockAgent({ id: "2", status: "RUNNING" }),
      createMockAgent({ id: "3", status: "CREATING" }),
    ];

    const groupedAgents = new Map([["github.com/user/repo", agents]]);

    const flattened = flattenGroupedAgents(groupedAgents, true, []);

    // Should be ordered: RUNNING, CREATING, FINISHED (by DEFAULT_STATUS_ORDER)
    expect(flattened[0].status).toBe("RUNNING");
    expect(flattened[1].status).toBe("CREATING");
    expect(flattened[2].status).toBe("FINISHED");
  });

  test("handles empty groups", () => {
    const groupedAgents = new Map([
      ["RUNNING", []],
      ["FINISHED", []],
    ]);

    const flattened = flattenGroupedAgents(groupedAgents, false, [
      "RUNNING",
      "FINISHED",
    ]);

    expect(flattened).toEqual([]);
  });

  test("handles empty flattened result", () => {
    const groupedAgents = new Map();
    const flattened = flattenGroupedAgents(groupedAgents, false, []);
    expect(flattened).toEqual([]);
  });
});
