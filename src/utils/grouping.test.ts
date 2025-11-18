import { test, expect, describe } from "bun:test";
import {
  groupAgentsByStatus,
  groupAgentsByRepository,
  getStatusDisplayOrder,
  DEFAULT_STATUS_ORDER,
} from "./grouping.js";
import { createMockAgent } from "../test/utils.jsx";

describe("groupAgentsByStatus", () => {
  test("groups agents correctly by status", () => {
    const agents = [
      createMockAgent({ id: "1", status: "RUNNING" }),
      createMockAgent({ id: "2", status: "FINISHED" }),
      createMockAgent({ id: "3", status: "RUNNING" }),
    ];

    const groups = groupAgentsByStatus(agents);

    expect(groups.get("RUNNING")).toHaveLength(2);
    expect(groups.get("FINISHED")).toHaveLength(1);
    expect(groups.get("CREATING")).toHaveLength(0);
  });

  test("initializes all known statuses even with no agents", () => {
    const groups = groupAgentsByStatus([]);

    DEFAULT_STATUS_ORDER.forEach((status) => {
      expect(groups.has(status)).toBe(true);
      expect(groups.get(status)).toEqual([]);
    });
  });

  test("handles unknown statuses", () => {
    const agent = createMockAgent({
      id: "1",
      status: "UNKNOWN_STATUS" as any,
    });

    const groups = groupAgentsByStatus([agent]);

    expect(groups.get("UNKNOWN_STATUS")).toHaveLength(1);
  });

  test("handles empty input", () => {
    const groups = groupAgentsByStatus([]);
    expect(groups.size).toBeGreaterThan(0);
    Array.from(groups.values()).forEach((group) => {
      expect(group).toEqual([]);
    });
  });

  test("groups all status types correctly", () => {
    const agents = [
      createMockAgent({ status: "CREATING" }),
      createMockAgent({ status: "RUNNING" }),
      createMockAgent({ status: "FINISHED" }),
      createMockAgent({ status: "FAILED" }),
      createMockAgent({ status: "CANCELLED" }),
    ];

    const groups = groupAgentsByStatus(agents);

    expect(groups.get("CREATING")).toHaveLength(1);
    expect(groups.get("RUNNING")).toHaveLength(1);
    expect(groups.get("FINISHED")).toHaveLength(1);
    expect(groups.get("FAILED")).toHaveLength(1);
    expect(groups.get("CANCELLED")).toHaveLength(1);
  });
});

describe("groupAgentsByRepository", () => {
  test("groups agents correctly by repository", () => {
    const agents = [
      createMockAgent({
        id: "1",
        source: { repository: "https://github.com/user/repo1.git" },
      }),
      createMockAgent({
        id: "2",
        source: { repository: "github.com/user/repo2" },
      }),
      createMockAgent({
        id: "3",
        source: { repository: "https://github.com/user/repo1" },
      }),
    ];

    const groups = groupAgentsByRepository(agents);

    expect(groups.size).toBe(2);
    expect(groups.get("github.com/user/repo1")).toHaveLength(2);
    expect(groups.get("github.com/user/repo2")).toHaveLength(1);
  });

  test("normalizes repository URLs consistently", () => {
    const agents = [
      createMockAgent({
        source: { repository: "https://github.com/user/repo.git" },
      }),
      createMockAgent({
        source: { repository: "http://github.com/user/repo/" },
      }),
      createMockAgent({
        source: { repository: "GITHUB.COM/USER/REPO" },
      }),
    ];

    const groups = groupAgentsByRepository(agents);

    expect(groups.size).toBe(1);
    expect(groups.get("github.com/user/repo")).toHaveLength(3);
  });

  test("sorts repositories alphabetically", () => {
    const agents = [
      createMockAgent({
        source: { repository: "github.com/user/zebra" },
      }),
      createMockAgent({
        source: { repository: "github.com/user/apple" },
      }),
      createMockAgent({
        source: { repository: "github.com/user/banana" },
      }),
    ];

    const groups = groupAgentsByRepository(agents);
    const repoKeys = Array.from(groups.keys());

    expect(repoKeys[0]).toContain("apple");
    expect(repoKeys[1]).toContain("banana");
    expect(repoKeys[2]).toContain("zebra");
  });

  test("handles empty input", () => {
    const groups = groupAgentsByRepository([]);
    expect(groups.size).toBe(0);
  });

  test("handles single repository", () => {
    const agents = [
      createMockAgent({ source: { repository: "github.com/user/repo" } }),
      createMockAgent({ source: { repository: "github.com/user/repo" } }),
    ];

    const groups = groupAgentsByRepository(agents);

    expect(groups.size).toBe(1);
    expect(groups.get("github.com/user/repo")).toHaveLength(2);
  });
});

describe("getStatusDisplayOrder", () => {
  test("returns known statuses first", () => {
    const groups = new Map([
      ["FINISHED", [createMockAgent({ status: "FINISHED" })]],
      ["RUNNING", [createMockAgent({ status: "RUNNING" })]],
      ["CREATING", [createMockAgent({ status: "CREATING" })]],
    ]);

    const order = getStatusDisplayOrder(groups);

    expect(order[0]).toBe("RUNNING");
    expect(order[1]).toBe("CREATING");
    expect(order[2]).toBe("FINISHED");
  });

  test("appends unknown statuses sorted alphabetically", () => {
    const groups = new Map([
      ["RUNNING", [createMockAgent({ status: "RUNNING" })]],
      ["ZEBRA_STATUS", [createMockAgent({ status: "ZEBRA_STATUS" as any })]],
      ["ALPHA_STATUS", [createMockAgent({ status: "ALPHA_STATUS" as any })]],
    ]);

    const order = getStatusDisplayOrder(groups);

    const knownIndex = order.indexOf("RUNNING");
    const alphaIndex = order.indexOf("ALPHA_STATUS");
    const zebraIndex = order.indexOf("ZEBRA_STATUS");

    expect(knownIndex).toBeLessThan(alphaIndex);
    expect(alphaIndex).toBeLessThan(zebraIndex);
  });

  test("filters out empty groups", () => {
    const groups = new Map([
      ["RUNNING", [createMockAgent({ status: "RUNNING" })]],
      ["FINISHED", []],
      ["CREATING", []],
    ]);

    const order = getStatusDisplayOrder(groups);

    expect(order).toEqual(["RUNNING"]);
    expect(order).not.toContain("FINISHED");
    expect(order).not.toContain("CREATING");
  });

  test("handles empty input", () => {
    const groups = new Map();
    const order = getStatusDisplayOrder(groups);
    expect(order).toEqual([]);
  });

  test("handles only unknown statuses", () => {
    const groups = new Map([
      ["UNKNOWN1", [createMockAgent({ status: "UNKNOWN1" as any })]],
      ["UNKNOWN2", [createMockAgent({ status: "UNKNOWN2" as any })]],
    ]);

    const order = getStatusDisplayOrder(groups);

    expect(order).toHaveLength(2);
    expect(order[0]).toBe("UNKNOWN1");
    expect(order[1]).toBe("UNKNOWN2");
  });
});
