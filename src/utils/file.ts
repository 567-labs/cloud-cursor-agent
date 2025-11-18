/**
 * File reading utilities
 * Handles reading plan files and other text files
 */

import { readFile } from "fs/promises";
import { resolve } from "path";
import { stdin } from "process";

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
 * Read from stdin and return its contents.
 *
 * @returns {Promise<string>} Resolved text contents from stdin.
 * @throws {Error} When stdin cannot be read.
 * @example
 * // Inside an async function
 * const input = await readFromStdin();
 * // => "user provided text"
 */
async function readFromStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: (string | Buffer)[] = [];

    // Set encoding to utf8 so chunks are strings
    stdin.setEncoding("utf8");

    stdin.on("data", (chunk: string | Buffer) => {
      chunks.push(chunk);
    });

    stdin.on("end", () => {
      // If encoding is set, chunks are strings; otherwise they're Buffers
      const content = chunks.join("");
      resolve(content);
    });

    stdin.on("error", (error: Error) => {
      reject(new Error(`Failed to read from stdin: ${error.message}`));
    });
  });
}

/**
 * Read a plan file and return its contents.
 *
 * Supports both relative and absolute paths, trims the result, and removes
 * YAML frontmatter for markdown files so downstream parsing stays simple.
 *
 * When filePath is "-", reads from stdin (useful for heredoc syntax).
 *
 * @param {string} filePath - Path to the file (relative or absolute), or "-" for stdin.
 * @returns {Promise<string>} Resolved text contents of the plan.
 * @throws {Error} When the file cannot be located or read.
 * @example
 * // Read from file
 * const content = await readPlanFile("plan.md");
 *
 * // Read from stdin (use with heredoc)
 * // cloud-agent launch --plan - <<'EOF'
 * // ... content ...
 * // EOF
 * const content = await readPlanFile("-");
 */
export async function readPlanFile(filePath: string): Promise<string> {
  try {
    let content: string;

    // Read from stdin if "-" is specified
    if (filePath === "-") {
      content = await readFromStdin();
    } else {
      // Resolve the path (handles both relative and absolute)
      const resolvedPath = resolve(filePath);

      // Read the file
      content = await readFile(resolvedPath, "utf-8");
    }

    // Strip frontmatter if it's a markdown file
    // For stdin, we check if content starts with frontmatter
    if (
      filePath.endsWith(".md") ||
      filePath.endsWith(".markdown") ||
      filePath === "-"
    ) {
      return stripFrontmatter(content).trim();
    }

    return content.trim();
  } catch (error) {
    if (error instanceof Error) {
      if ("code" in error && error.code === "ENOENT") {
        throw new Error(`File not found: ${filePath}`);
      }
      throw new Error(
        `Failed to read ${filePath === "-" ? "stdin" : `file ${filePath}`}: ${error.message}`
      );
    }
    throw new Error(
      `Failed to read ${filePath === "-" ? "stdin" : `file ${filePath}`}: Unknown error`
    );
  }
}
