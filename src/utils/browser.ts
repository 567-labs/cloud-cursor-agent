/**
 * Utility functions for opening URLs in the default browser
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Open a URL in the user's default browser using a platform-specific command.
 *
 * @param {string} url - Fully qualified URL (for example, `https://example.com`).
 * @returns {Promise<void>} Resolves when the shell command completes.
 * @throws {Error} When the browser process cannot be launched.
 * @example
 * await openInBrowser("https://docs.context.ai");
 */
export async function openInBrowser(url: string): Promise<void> {
  const command =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "start"
        : "xdg-open";

  try {
    await execAsync(`${command} "${url}"`);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to open browser: ${errorMessage}`);
  }
}
