import { describe, expect, test } from "bun:test";
import { fuzzyMatch, fuzzyMatchAny } from "./search";

describe("fuzzyMatch", () => {
  test("matches when query characters appear in order", () => {
    expect(fuzzyMatch("agt", "Agent")).toBe(true);
  });

  test("is case-insensitive", () => {
    expect(fuzzyMatch("AGT", "agent")).toBe(true);
  });

  test("ignores leading and trailing whitespace in the query", () => {
    expect(fuzzyMatch("  agt  ", "Agent")).toBe(true);
  });

  test("returns true for an empty query", () => {
    expect(fuzzyMatch("", "Agent")).toBe(true);
  });

  test("returns false when the target is null or undefined", () => {
    expect(fuzzyMatch("a", null)).toBe(false);
    expect(fuzzyMatch("a", undefined)).toBe(false);
  });

  test("does not match when only a partial sequence is present", () => {
    expect(fuzzyMatch("agent", "age")).toBe(false);
  });

  test("handles exact matches correctly", () => {
    expect(fuzzyMatch("agent", "agent")).toBe(true);
  });
});

describe("fuzzyMatchAny", () => {
  test("returns true if any target matches", () => {
    expect(fuzzyMatchAny("agt", ["foo", "Agent", "bar"])).toBe(true);
  });

  test("returns false if no targets match", () => {
    expect(fuzzyMatchAny("xyz", ["foo", "bar", "baz"])).toBe(false);
  });

  test("returns false when the targets array is empty", () => {
    expect(fuzzyMatchAny("anything", [])).toBe(false);
  });

  test("handles null or undefined targets within the array", () => {
    expect(fuzzyMatchAny("agt", [null, undefined, "Agent"])).toBe(true);
  });
});

