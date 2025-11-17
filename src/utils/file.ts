/**
 * File reading utilities
 * Handles reading plan files and other text files
 */

import { readFile } from "fs/promises";
import { resolve } from "path";

/**
 * Strip frontmatter from markdown content
 * Frontmatter is YAML between --- delimiters at the start of the file
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
 * Read a plan file and return its contents
 * Supports relative and absolute paths
 * Handles markdown files and strips frontmatter if present
 * @param filePath - Path to the file (relative or absolute)
 * @returns The file contents as a string
 * @throws Error if file cannot be read or doesn't exist
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

