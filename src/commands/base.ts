/**
 * Base command interface and utilities
 */

import type { CommandContext } from "../cli/types.js";

/**
 * Base interface for CLI commands
 */
export interface Command {
  /** Command name */
  name: string;
  /** Command description */
  description: string;
  /** Execute the command */
  execute(
    context: CommandContext,
    options: Record<string, unknown>
  ): Promise<void>;
}
