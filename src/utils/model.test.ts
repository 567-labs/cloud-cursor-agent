import { test, expect, describe } from "bun:test";
import { selectModel, isValidModel, MODELS } from "./model.js";

describe("selectModel", () => {
  test("returns FAST model for simple tasks", () => {
    expect(selectModel("Fix typo")).toBe(MODELS.FAST);
    expect(selectModel("Small bug fix")).toBe(MODELS.FAST);
    expect(selectModel("Update documentation")).toBe(MODELS.FAST);
  });

  test("returns SMART model for complex keywords", () => {
    expect(selectModel("Refactor the codebase")).toBe(MODELS.SMART);
    expect(selectModel("Architecture redesign")).toBe(MODELS.SMART);
    expect(selectModel("Migrate to new framework")).toBe(MODELS.SMART);
    expect(selectModel("Rewrite the system")).toBe(MODELS.SMART);
  });

  test("returns SMART model for plans with many steps", () => {
    const planWithManySteps = `
- Step 1
- Step 2
- Step 3
- Step 4
- Step 5
- Step 6
- Step 7
`;
    expect(selectModel(planWithManySteps)).toBe(MODELS.SMART);
  });

  test("returns SMART model for long plans", () => {
    const longPlan = Array(25).fill("This is a line of content").join("\n");
    expect(selectModel(longPlan)).toBe(MODELS.SMART);
  });

  test("returns SMART when complex keywords outnumber simple keywords", () => {
    expect(
      selectModel("Fix bug and refactor architecture and migrate system")
    ).toBe(MODELS.SMART);
  });

  test("returns FAST when simple keywords outnumber complex keywords", () => {
    expect(selectModel("Fix bug and fix typo and update docs")).toBe(
      MODELS.FAST
    );
  });

  test("is case-insensitive", () => {
    expect(selectModel("REFACTOR CODE")).toBe(MODELS.SMART);
    expect(selectModel("Fix Typo")).toBe(MODELS.FAST);
  });

  test("handles empty plan", () => {
    expect(selectModel("")).toBe(MODELS.FAST);
  });

  test("handles plan with only whitespace", () => {
    expect(selectModel("   \n  \n  ")).toBe(MODELS.FAST);
  });
});

describe("isValidModel", () => {
  test("returns true for valid models", () => {
    expect(isValidModel(MODELS.FAST)).toBe(true);
    expect(isValidModel(MODELS.SMART)).toBe(true);
  });

  test("returns false for invalid models", () => {
    expect(isValidModel("invalid-model")).toBe(false);
    expect(isValidModel("gpt-4")).toBe(false);
    expect(isValidModel("")).toBe(false);
  });

  test("is case-sensitive", () => {
    expect(isValidModel("COMPOSER-1")).toBe(false);
    expect(isValidModel("composer-1")).toBe(true);
  });
});
