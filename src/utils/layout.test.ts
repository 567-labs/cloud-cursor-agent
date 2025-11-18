import { test, expect, describe } from "bun:test";
import {
  getLayoutBreakpoint,
  getLayoutLabel,
  calculateColumnLayout,
  calculateLayoutMetrics,
  type LayoutBreakpoint,
} from "./layout.js";

describe("getLayoutBreakpoint", () => {
  test("returns 'wide' for width >= 100", () => {
    expect(getLayoutBreakpoint(100)).toBe("wide");
    expect(getLayoutBreakpoint(120)).toBe("wide");
    expect(getLayoutBreakpoint(200)).toBe("wide");
  });

  test("returns 'medium' for width 70-99", () => {
    expect(getLayoutBreakpoint(70)).toBe("medium");
    expect(getLayoutBreakpoint(85)).toBe("medium");
    expect(getLayoutBreakpoint(99)).toBe("medium");
  });

  test("returns 'compact' for width < 70", () => {
    expect(getLayoutBreakpoint(69)).toBe("compact");
    expect(getLayoutBreakpoint(50)).toBe("compact");
    expect(getLayoutBreakpoint(30)).toBe("compact");
  });

  test("handles boundary values correctly", () => {
    expect(getLayoutBreakpoint(100)).toBe("wide");
    expect(getLayoutBreakpoint(99)).toBe("medium");
    expect(getLayoutBreakpoint(70)).toBe("medium");
    expect(getLayoutBreakpoint(69)).toBe("compact");
  });
});

describe("getLayoutLabel", () => {
  test("returns correct labels for each breakpoint", () => {
    expect(getLayoutLabel("wide")).toBe("Wide layout");
    expect(getLayoutLabel("medium")).toBe("Medium layout");
    expect(getLayoutLabel("compact")).toBe("Compact layout");
  });
});

describe("calculateColumnLayout", () => {
  test("calculates wide layout correctly (45% name, 35% repo)", () => {
    const layout = calculateColumnLayout(100, "wide");

    expect(layout.nameWidth).toBe(45); // 100 * 0.45 = 45
    expect(layout.repoWidth).toBe(35); // 100 * 0.35 = 35
    expect(layout.stacked).toBe(false);
  });

  test("calculates medium layout correctly (60% name, 40% repo)", () => {
    const layout = calculateColumnLayout(80, "medium");

    expect(layout.nameWidth).toBe(48); // 80 * 0.60 = 48
    expect(layout.repoWidth).toBe(32); // 80 * 0.40 = 32
    expect(layout.stacked).toBe(false);
  });

  test("calculates compact layout correctly (stacked)", () => {
    const layout = calculateColumnLayout(50, "compact");

    expect(layout.nameWidth).toBe(50);
    expect(layout.repoWidth).toBe(50);
    expect(layout.stacked).toBe(true);
  });

  test("handles floor division correctly", () => {
    const layout = calculateColumnLayout(99, "wide");
    expect(layout.nameWidth).toBe(Math.floor(99 * 0.45));
    expect(layout.repoWidth).toBe(Math.floor(99 * 0.35));
  });
});

describe("calculateLayoutMetrics", () => {
  test("calculates metrics correctly for wide terminals", () => {
    const metrics = calculateLayoutMetrics(120, 30);

    expect(metrics.terminalWidth).toBe(120);
    expect(metrics.terminalHeight).toBe(30);
    expect(metrics.breakpoint).toBe("wide");
    expect(metrics.availableContentWidth).toBeGreaterThan(0);
    expect(metrics.separatorWidth).toBeGreaterThan(0);
    expect(metrics.availableHeight).toBeGreaterThan(0);
    expect(metrics.agentsPerView).toBeGreaterThanOrEqual(3);
    expect(metrics.mainBoxPadding).toBe(2);
  });

  test("calculates metrics correctly for medium terminals", () => {
    const metrics = calculateLayoutMetrics(80, 25);

    expect(metrics.breakpoint).toBe("medium");
    expect(metrics.mainBoxPadding).toBe(2);
  });

  test("calculates metrics correctly for compact terminals", () => {
    const metrics = calculateLayoutMetrics(50, 20);

    expect(metrics.breakpoint).toBe("compact");
    expect(metrics.mainBoxPadding).toBe(0);
  });

  test("respects custom chromePadding", () => {
    const defaultMetrics = calculateLayoutMetrics(100, 30);
    const customMetrics = calculateLayoutMetrics(100, 30, 8);

    expect(customMetrics.availableContentWidth).not.toBe(
      defaultMetrics.availableContentWidth
    );
  });

  test("respects custom headerHeight", () => {
    const defaultMetrics = calculateLayoutMetrics(100, 30);
    const customMetrics = calculateLayoutMetrics(100, 30, 4, 6);

    expect(customMetrics.availableHeight).not.toBe(
      defaultMetrics.availableHeight
    );
  });

  test("respects custom footerHeight", () => {
    const defaultMetrics = calculateLayoutMetrics(100, 30);
    const customMetrics = calculateLayoutMetrics(100, 30, 4, 4, 8);

    expect(customMetrics.availableHeight).not.toBe(
      defaultMetrics.availableHeight
    );
  });

  test("ensures minimum agentsPerView of 3", () => {
    const metrics = calculateLayoutMetrics(50, 10);
    expect(metrics.agentsPerView).toBeGreaterThanOrEqual(3);
  });

  test("ensures minimum availableHeight of 5", () => {
    const metrics = calculateLayoutMetrics(50, 5);
    expect(metrics.availableHeight).toBeGreaterThanOrEqual(5);
  });

  test("calculates agentsPerView based on available height", () => {
    const tallMetrics = calculateLayoutMetrics(100, 50);
    const shortMetrics = calculateLayoutMetrics(100, 15);

    expect(tallMetrics.agentsPerView).toBeGreaterThan(
      shortMetrics.agentsPerView
    );
  });
});

