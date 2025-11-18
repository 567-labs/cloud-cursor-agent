/**
 * File reading utilities
 * Handles reading plan files and other text files
 */

import { readFile } from "fs/promises";
import { resolve } from "path";

type NodeErrorWithCode = NodeJS.ErrnoException & {
  code?: string;
};

export class FileReadError extends Error {
  constructor(
    message: string,
    public path: string,
    public cause?: unknown,
    public hint?: string
  ) {
    super(message);
    this.name = "FileReadError";
  }
}

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
  if (!filePath || typeof filePath !== "string" || !filePath.trim()) {
    throw new FileReadError("A file path is required.", filePath);
  }

  const resolvedPath = resolve(filePath);

  try {
    const content = await readFile(resolvedPath, "utf-8");

    if (filePath.endsWith(".md") || filePath.endsWith(".markdown")) {
      return stripFrontmatter(content).trim();
    }

    return content.trim();
  } catch (error) {
    if (isNodeError(error)) {
      if (error.code === "ENOENT") {
        throw new FileReadError(`File not found: ${resolvedPath}`, resolvedPath, error, "Double-check the --plan path.");
      }
      if (error.code === "EISDIR") {
        throw new FileReadError(`Expected a file but found a directory: ${resolvedPath}`, resolvedPath, error);
      }
      if (error.code === "EACCES" || error.code === "EPERM") {
        throw new FileReadError(`Permission denied reading ${resolvedPath}`, resolvedPath, error, "Adjust file permissions or run the command with the required access.");
      }
      if (error.code === "ENOTDIR") {
        throw new FileReadError(
          `A parent segment in ${resolvedPath} is not a directory.`,
          resolvedPath,
          error,
          "Verify the folders in the provided path."
        );
      }
    }

    if (error instanceof Error) {
      throw new FileReadError(`Failed to read file ${resolvedPath}: ${error.message}`, resolvedPath, error);
    }

    throw new FileReadError(`Failed to read file ${resolvedPath}: Unknown error`, resolvedPath, error);
  }
}

function isNodeError(error: unknown): error is NodeErrorWithCode {
  return typeof error === "object" && error !== null && "code" in error;
}

