/**
 * File reading utilities
 * Handles reading plan files and other text files
 */

import { readFile } from "fs/promises";
import { resolve } from "path";

/**
 * Strip YAML frontmatter when present at the start of markdown content.
 *
 * Frontmatter is treated as any block wrapped in leading `---` delimiters.
 *
 * @param {string} content - Raw file contents read from disk.
 * @returns {string} Content without the frontmatter block.
 * @example
 * stripFrontmatter("---\\ntitle: Plan\\n---\\nRest of file");
 * // => "Rest of file"
 */
function stripFrontmatter(content: string): string {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  const match = content.match(frontmatterRegex);
  if (match) {
    return content.slice(match[0].length);
  }
  return content;
}

/**
 * Read a plan file and return its contents.
 *
 * Supports both relative and absolute paths, trims the result, and removes
 * YAML frontmatter for markdown files so downstream parsing stays simple.
 *
 * @param {string} filePath - Path to the file (relative or absolute).
 * @returns {Promise<string>} Resolved text contents of the plan.
 * @throws {Error} When the file cannot be located or read.
 */
export async function readPlanFile(filePath: string): Promise<string> {
  try {
    // Resolve the path (handles both relative and absolute)
    const resolvedPath = resolve(filePath);

    // Read the file
    const content = await readFile(resolvedPath, "utf-8");

    // Strip frontmatter if it's a markdown file
    if (filePath.endsWith(".md") || filePath.endsWith(".markdown")) {
      return stripFrontmatter(content).trim();
    }

    return content.trim();
  } catch (error) {
    if (error instanceof Error) {
      if ("code" in error && error.code === "ENOENT") {
        throw new Error(`File not found: ${filePath}`);
      }
      throw new Error(`Failed to read file ${filePath}: ${error.message}`);
    }
    throw new Error(`Failed to read file ${filePath}: Unknown error`);
  }
}

