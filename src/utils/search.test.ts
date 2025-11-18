import { test, expect, describe } from "bun:test";
import { fuzzyMatch, fuzzyMatchAny } from "./search.js";

describe("fuzzyMatch", () => {
  test("matches when query characters appear in order", () => {
    expect(fuzzyMatch("agt", "Agent")).toBe(true);
    expect(fuzzyMatch("ag", "Agent")).toBe(true);
    expect(fuzzyMatch("ent", "Agent")).toBe(true);
  });

  test("is case-insensitive", () => {
    expect(fuzzyMatch("AGT", "Agent")).toBe(true);
    expect(fuzzyMatch("agent", "AGENT")).toBe(true);
    expect(fuzzyMatch("AgEnT", "aGeNt")).toBe(true);
  });

  test("ignores whitespace differences (trims query)", () => {
    expect(fuzzyMatch("  agt  ", "Agent")).toBe(true);
    expect(fuzzyMatch("\tagt\n", "Agent")).toBe(true);
    expect(fuzzyMatch(" agt", "Agent")).toBe(true);
  });

  test("returns true for empty query", () => {
    expect(fuzzyMatch("", "Agent")).toBe(true);
    expect(fuzzyMatch("   ", "Agent")).toBe(true);
  });

  test("returns false for null/undefined target", () => {
    expect(fuzzyMatch("agt", null as any)).toBe(false);
    expect(fuzzyMatch("agt", undefined as any)).toBe(false);
  });

  test("handles partial matches correctly", () => {
    expect(fuzzyMatch("ag", "Agent")).toBe(true);
    expect(fuzzyMatch("ge", "Agent")).toBe(true); // 'g' and 'e' appear in order in "Agent"
    expect(fuzzyMatch("nt", "Agent")).toBe(true);
    expect(fuzzyMatch("eg", "Agent")).toBe(false); // 'e' comes before 'g' in query, but 'g' comes before 'e' in target
  });

  test("handles exact matches correctly", () => {
    expect(fuzzyMatch("Agent", "Agent")).toBe(true);
    expect(fuzzyMatch("agent", "Agent")).toBe(true);
  });

  test("requires all query characters to appear", () => {
    expect(fuzzyMatch("agt", "Agent")).toBe(true);
    expect(fuzzyMatch("agtx", "Agent")).toBe(false); // 'x' not in target
  });

  test("handles query longer than target", () => {
    expect(fuzzyMatch("AgentLong", "Agent")).toBe(false);
  });

  test("handles special characters", () => {
    expect(fuzzyMatch("test", "test-123")).toBe(true);
    expect(fuzzyMatch("123", "test-123")).toBe(true);
  });
});

describe("fuzzyMatchAny", () => {
  test("returns true if any target matches", () => {
    expect(
      fuzzyMatchAny("agt", ["Agent", "Other", "Another"])
    ).toBe(true);
    expect(fuzzyMatchAny("oth", ["Agent", "Other", "Another"])).toBe(true);
  });

  test("returns false if no targets match", () => {
    expect(fuzzyMatchAny("xyz", ["Agent", "Other", "Another"])).toBe(false);
  });

  test("handles empty targets array", () => {
    expect(fuzzyMatchAny("agt", [])).toBe(false);
  });

  test("handles null/undefined targets in array", () => {
    expect(fuzzyMatchAny("agt", [null, "Agent", undefined as any])).toBe(
      true
    );
    expect(fuzzyMatchAny("agt", [null, undefined as any])).toBe(false);
  });

  test("returns true if query is empty", () => {
    expect(fuzzyMatchAny("", ["Agent", "Other"])).toBe(true);
    expect(fuzzyMatchAny("   ", ["Agent", "Other"])).toBe(true);
  });

  test("handles multiple matches", () => {
    expect(
      fuzzyMatchAny("ag", ["Agent", "Again", "Other"])
    ).toBe(true);
  });

  test("handles single target", () => {
    expect(fuzzyMatchAny("agt", ["Agent"])).toBe(true);
    expect(fuzzyMatchAny("xyz", ["Agent"])).toBe(false);
  });
});

