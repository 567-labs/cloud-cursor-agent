/**
 * Plan validation utilities.
 */

import { failure, success, type ValidationResult } from "./common";

export const PLAN_EXTENSIONS = [".md", ".markdown", ".plan", ".txt"];
export const INVALID_PLAN_PATH_CHARS = /[<>:"|?*\u0000]/;
export const FRONTMATTER_REGEX = /^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n?/;

/**
 * Validate a plan file path string before attempting to read from disk.
 *
 * @param {string} filePath - Relative/absolute path pointing to a plan file.
 * @returns {ValidationResult} Result describing whether the path has a safe format.
 * @example
 * validatePlanFilePath("plans/bugfix.md");
 * // => { valid: true }
 */
export function validatePlanFilePath(filePath: string): ValidationResult {
  if (!filePath || typeof filePath !== "string") {
    return failure("Plan file path is required.");
  }

  const trimmed = filePath.trim();

  if (trimmed.length === 0) {
    return failure("Plan file path cannot be empty.");
  }

  if (INVALID_PLAN_PATH_CHARS.test(trimmed)) {
    return failure(
      'Plan file path cannot include any of the following characters: < > : " | ? *'
    );
  }

  if (trimmed.endsWith("/") || trimmed.endsWith("\\")) {
    return failure("Plan file path must point to a file, not a directory.");
  }

  const lowercasePath = trimmed.toLowerCase();
  const hasValidExtension = PLAN_EXTENSIONS.some((ext) =>
    lowercasePath.endsWith(ext)
  );
  if (!hasValidExtension) {
    return failure(
      `Plan file must end with one of the following extensions: ${PLAN_EXTENSIONS.join(", ")}`
    );
  }

  return success();
}

/**
 * Validate plan content after it has been read into memory.
 *
 * @param {string} content - Raw plan text that may include frontmatter.
 * @returns {ValidationResult} Result indicating if the plan has enough structure to launch.
 * @example
 * validatePlanContent("# Bug Fixes\n- Fix login flow");
 * // => { valid: true }
 */
export function validatePlanContent(content: string): ValidationResult {
  if (!content || typeof content !== "string") {
    return failure("Plan content is required.");
  }

  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return failure("Plan content cannot be empty.");
  }

  const withoutFrontmatter = trimmed.replace(FRONTMATTER_REGEX, "").trim();
  if (withoutFrontmatter.length === 0) {
    return failure(
      "Plan content only contains frontmatter. Add the actual plan under the metadata."
    );
  }

  if (withoutFrontmatter.length < 20) {
    return failure(
      "Plan content is too short. Add a few sentences or bullet points describing the work."
    );
  }

  if (/^\s*(todo|tbd|coming soon)\s*$/i.test(withoutFrontmatter)) {
    return failure(
      "Plan content cannot be a placeholder like TODO or TBD. Provide concrete steps."
    );
  }

  const hasStructure = /(^|\n)\s*(?:#|\d+\.|[-*])\s+\S+/m.test(
    withoutFrontmatter
  );
  if (!hasStructure) {
    return failure(
      "Plan content should include at least one heading or bullet so it can be parsed."
    );
  }

  return success();
}
