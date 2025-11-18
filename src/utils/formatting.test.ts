import { describe, expect, test } from "bun:test";

import {
  clampWidth,
  getSeparator,
  normalizeRepositoryUrl,
  truncate,
} from "./formatting";

describe("truncate", () => {
  test("truncates strings longer than maxLength", () => {
    expect(truncate("Hello World", 8)).toBe("Hello...");
  });

  test("returns unchanged string if shorter than maxLength", () => {
    expect(truncate("Hi", 8)).toBe("Hi");
  });

  test("handles maxLength of 0 or negative (returns original)", () => {
    expect(truncate("Sample", 0)).toBe("Sample");
    expect(truncate("Sample", -1)).toBe("Sample");
  });

  test("handles empty strings", () => {
    expect(truncate("", 5)).toBe("");
    expect(truncate("", 0)).toBe("");
  });
});

describe("clampWidth", () => {
  test("returns width if greater than or equal to min", () => {
    expect(clampWidth(12, 8)).toBe(12);
  });

  test("returns min if width is below min", () => {
    expect(clampWidth(5, 8)).toBe(8);
  });

  test("uses default min of 8 when none provided", () => {
    expect(clampWidth(3)).toBe(8);
  });
});

describe("getSeparator", () => {
  test("generates separator of the requested width", () => {
    expect(getSeparator(10)).toBe("─".repeat(10));
  });

  test("respects minimum length when specified", () => {
    expect(getSeparator(4, 12)).toBe("─".repeat(12));
  });

  test("handles widths below the default minimum length", () => {
    expect(getSeparator(2)).toBe("─".repeat(5));
  });
});

describe("normalizeRepositoryUrl", () => {
  test("removes http:// prefix", () => {
    expect(normalizeRepositoryUrl("http://github.com/user/repo")).toBe(
      "github.com/user/repo",
    );
  });

  test("removes https:// prefix", () => {
    expect(normalizeRepositoryUrl("https://github.com/user/repo")).toBe(
      "github.com/user/repo",
    );
  });

  test("removes .git suffix", () => {
    expect(normalizeRepositoryUrl("github.com/user/repo.git")).toBe(
      "github.com/user/repo",
    );
  });

  test("removes trailing slash", () => {
    expect(normalizeRepositoryUrl("github.com/user/repo/")).toBe(
      "github.com/user/repo",
    );
  });

  test("converts entire string to lowercase", () => {
    expect(normalizeRepositoryUrl("GITHUB.COM/User/Repo")).toBe(
      "github.com/user/repo",
    );
  });

  test("handles empty or falsy inputs", () => {
    expect(normalizeRepositoryUrl("")).toBe("");
    expect(normalizeRepositoryUrl(null as unknown as string)).toBe("");
  });

  test("handles multiple url formats consistently", () => {
    const expected = "github.com/user/repo";
    const variants = [
      "https://github.com/user/repo.git",
      "http://github.com/user/repo/",
      "github.com/user/repo",
      "GITHUB.com/User/Repo/",
    ];

    variants.forEach((input) => {
      expect(normalizeRepositoryUrl(input)).toBe(expected);
    });
  });
});
