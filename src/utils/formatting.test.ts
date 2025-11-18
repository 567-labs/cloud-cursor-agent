import { test, expect, describe } from "bun:test";
import {
  truncate,
  clampWidth,
  getSeparator,
  normalizeRepositoryUrl,
} from "./formatting.js";

describe("truncate", () => {
  test("truncates strings longer than maxLength", () => {
    expect(truncate("Hello World", 8)).toBe("Hello...");
    expect(truncate("This is a very long string", 10)).toBe("This is...");
  });

  test("returns unchanged string if shorter than maxLength", () => {
    expect(truncate("Hi", 8)).toBe("Hi");
    expect(truncate("Short", 10)).toBe("Short");
  });

  test("handles maxLength of 0 or negative (returns original)", () => {
    expect(truncate("Hello World", 0)).toBe("Hello World");
    expect(truncate("Hello World", -5)).toBe("Hello World");
  });

  test("handles empty strings", () => {
    expect(truncate("", 10)).toBe("");
    expect(truncate("", 0)).toBe("");
  });

  test("handles exact maxLength", () => {
    expect(truncate("Hello", 5)).toBe("Hello");
    expect(truncate("Hello", 8)).toBe("Hello");
  });

  test("truncates to exactly maxLength including ellipsis", () => {
    const result = truncate("Hello World", 8);
    expect(result.length).toBe(8);
    expect(result).toBe("Hello...");
  });
});

describe("clampWidth", () => {
  test("returns width if >= min", () => {
    expect(clampWidth(10, 8)).toBe(10);
    expect(clampWidth(20, 8)).toBe(20);
    expect(clampWidth(8, 8)).toBe(8);
  });

  test("returns min if width < min", () => {
    expect(clampWidth(5, 8)).toBe(8);
    expect(clampWidth(3, 10)).toBe(10);
    expect(clampWidth(0, 8)).toBe(8);
  });

  test("uses default min of 8", () => {
    expect(clampWidth(10)).toBe(10);
    expect(clampWidth(5)).toBe(8);
    expect(clampWidth(8)).toBe(8);
  });

  test("handles negative width", () => {
    expect(clampWidth(-5, 8)).toBe(8);
  });
});

describe("getSeparator", () => {
  test("generates separator of correct width", () => {
    expect(getSeparator(10)).toBe("──────────");
    expect(getSeparator(5)).toBe("─────");
    expect(getSeparator(1)).toBe("─────"); // Respects default minLength of 5
  });

  test("respects minimum length", () => {
    expect(getSeparator(3, 5)).toBe("─────");
    expect(getSeparator(1, 5)).toBe("─────");
  });

  test("handles width less than minLength", () => {
    expect(getSeparator(2, 10)).toBe("──────────");
  });

  test("uses default minLength of 5", () => {
    expect(getSeparator(10)).toBe("──────────");
    expect(getSeparator(3)).toBe("─────");
  });

  test("handles zero width with minLength", () => {
    expect(getSeparator(0, 5)).toBe("─────");
  });
});

describe("normalizeRepositoryUrl", () => {
  test("removes http:// prefix", () => {
    expect(normalizeRepositoryUrl("http://github.com/user/repo")).toBe(
      "github.com/user/repo"
    );
  });

  test("removes https:// prefix", () => {
    expect(normalizeRepositoryUrl("https://github.com/user/repo")).toBe(
      "github.com/user/repo"
    );
  });

  test("removes .git suffix", () => {
    expect(normalizeRepositoryUrl("github.com/user/repo.git")).toBe(
      "github.com/user/repo"
    );
  });

  test("removes trailing slash", () => {
    expect(normalizeRepositoryUrl("github.com/user/repo/")).toBe(
      "github.com/user/repo"
    );
  });

  test("converts to lowercase", () => {
    expect(normalizeRepositoryUrl("GITHUB.COM/USER/REPO")).toBe(
      "github.com/user/repo"
    );
    expect(normalizeRepositoryUrl("GitHub.com/User/Repo")).toBe(
      "github.com/user/repo"
    );
  });

  test("handles empty/falsy input", () => {
    expect(normalizeRepositoryUrl("")).toBe("");
    expect(normalizeRepositoryUrl(null as any)).toBe("");
    expect(normalizeRepositoryUrl(undefined as any)).toBe("");
  });

  test("handles various URL formats consistently", () => {
    const url1 = "https://github.com/user/repo.git";
    const url2 = "http://github.com/user/repo/";
    const url3 = "GITHUB.COM/USER/REPO";
    const url4 = "github.com/user/repo";

    const normalized1 = normalizeRepositoryUrl(url1);
    const normalized2 = normalizeRepositoryUrl(url2);
    const normalized3 = normalizeRepositoryUrl(url3);
    const normalized4 = normalizeRepositoryUrl(url4);

    expect(normalized1).toBe("github.com/user/repo");
    expect(normalized2).toBe("github.com/user/repo");
    expect(normalized3).toBe("github.com/user/repo");
    expect(normalized4).toBe("github.com/user/repo");
  });

  test("handles combined transformations", () => {
    expect(
      normalizeRepositoryUrl("HTTPS://GITHUB.COM/USER/REPO.GIT/")
    ).toBe("github.com/user/repo");
  });

  test("trims whitespace", () => {
    expect(normalizeRepositoryUrl("  github.com/user/repo  ")).toBe(
      "github.com/user/repo"
    );
  });
});

