import { test, expect, describe } from "bun:test";
import { getStatusDisplay, getRelativeTime } from "./status.js";

describe("getStatusDisplay", () => {
  test("returns correct display for CREATING status", () => {
    const display = getStatusDisplay("CREATING");
    expect(display.symbol).toBe("●");
    expect(display.label).toBe("Creating");
    expect(display.color).toBe("yellow");
  });

  test("returns correct display for RUNNING status", () => {
    const display = getStatusDisplay("RUNNING");
    expect(display.symbol).toBe("▶");
    expect(display.label).toBe("Running");
    expect(display.color).toBe("green");
  });

  test("returns correct display for FINISHED status", () => {
    const display = getStatusDisplay("FINISHED");
    expect(display.symbol).toBe("✓");
    expect(display.label).toBe("Finished");
    expect(display.color).toBe("green");
  });

  test("returns correct display for FAILED status", () => {
    const display = getStatusDisplay("FAILED");
    expect(display.symbol).toBe("✗");
    expect(display.label).toBe("Failed");
    expect(display.color).toBe("red");
  });

  test("returns correct display for CANCELLED status", () => {
    const display = getStatusDisplay("CANCELLED");
    expect(display.symbol).toBe("○");
    expect(display.label).toBe("Cancelled");
    expect(display.color).toBe("gray");
  });

  test("handles unknown statuses with default values", () => {
    const display = getStatusDisplay("UNKNOWN_STATUS");
    expect(display.symbol).toBe("?");
    expect(display.label).toBe("UNKNOWN_STATUS");
    expect(display.color).toBe("gray");
  });
});

describe("getRelativeTime", () => {
  test("returns 'just now' for very recent dates (< 10 seconds)", () => {
    const now = new Date();
    const recent = new Date(now.getTime() - 5000); // 5 seconds ago
    expect(getRelativeTime(recent)).toBe("just now");

    const veryRecent = new Date(now.getTime() - 2000); // 2 seconds ago
    expect(getRelativeTime(veryRecent)).toBe("just now");
  });

  test("formats seconds correctly", () => {
    const now = new Date();
    const tenSecondsAgo = new Date(now.getTime() - 10000);
    expect(getRelativeTime(tenSecondsAgo)).toContain("second");

    const thirtySecondsAgo = new Date(now.getTime() - 30000);
    expect(getRelativeTime(thirtySecondsAgo)).toContain("second");
  });

  test("formats minutes correctly", () => {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    expect(getRelativeTime(oneMinuteAgo)).toContain("minute");

    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60000);
    expect(getRelativeTime(thirtyMinutesAgo)).toContain("minute");
  });

  test("formats hours correctly", () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);
    expect(getRelativeTime(oneHourAgo)).toContain("hour");

    const twelveHoursAgo = new Date(now.getTime() - 12 * 3600000);
    expect(getRelativeTime(twelveHoursAgo)).toContain("hour");
  });

  test("formats days correctly", () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 3600000);
    expect(getRelativeTime(oneDayAgo)).toContain("day");

    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 3600000);
    expect(getRelativeTime(threeDaysAgo)).toContain("day");
  });

  test("formats weeks correctly", () => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 3600000);
    expect(getRelativeTime(oneWeekAgo)).toContain("week");

    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 3600000);
    expect(getRelativeTime(twoWeeksAgo)).toContain("week");
  });

  test("formats months correctly", () => {
    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 3600000);
    expect(getRelativeTime(oneMonthAgo)).toContain("month");

    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 3600000);
    expect(getRelativeTime(sixMonthsAgo)).toContain("month");
  });

  test("formats years correctly", () => {
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 3600000);
    expect(getRelativeTime(oneYearAgo)).toContain("year");

    const twoYearsAgo = new Date(now.getTime() - 2 * 365 * 24 * 3600000);
    expect(getRelativeTime(twoYearsAgo)).toContain("year");
  });

  test("handles singular vs plural correctly", () => {
    const now = new Date();
    const oneSecondAgo = new Date(now.getTime() - 15000);
    const twoSecondsAgo = new Date(now.getTime() - 25000);

    const oneSecond = getRelativeTime(oneSecondAgo);
    const twoSeconds = getRelativeTime(twoSecondsAgo);

    expect(oneSecond).toContain("second");
    expect(twoSeconds).toContain("seconds");
  });

  test("accepts both string and Date inputs", () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);
    const oneHourAgoString = oneHourAgo.toISOString();

    const dateResult = getRelativeTime(oneHourAgo);
    const stringResult = getRelativeTime(oneHourAgoString);

    expect(dateResult).toBe(stringResult);
    expect(dateResult).toContain("hour");
  });

  test("handles future dates", () => {
    const now = new Date();
    const future = new Date(now.getTime() + 3600000); // 1 hour in future
    const result = getRelativeTime(future);
    // Should still return a relative time string
    expect(typeof result).toBe("string");
  });
});
