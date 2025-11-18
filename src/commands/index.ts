/**
 * Command registry - Register and manage CLI commands
 */

import { Command } from "commander";
import type { CommandContext } from "../cli/types.js";
import { executeLaunch } from "./launch.js";
import { executeList } from "./list.jsx";
import { executeStatus } from "./status.jsx";

/**
 * Register all commands with Commander.js program
 */
export function registerCommands(program: Command, context: CommandContext): void {
  // Launch command
  program
    .command("launch")
    .description("Launch an agent from a plan file")
    .requiredOption("--plan <file>", "Plan file to use as prompt (required for launch). Use \"-\" to read from stdin (supports heredoc syntax)")
    .option("--repo <url>", "Repository URL (auto-detected if not provided)")
    .option("--ref <ref>", "Git ref (branch/tag/commit) (auto-detected if not provided)")
    .option("--branch <name>", "Target branch name")
    .option("--no-auto-pr", "Disable automatic PR creation (PR creation is default)")
    .option("--model <name>", "Model to use (composer-1 or gpt-5.1-codex). If not provided, model is auto-selected based on plan")
    .option("--verbose, -v", "Show verbose output")
    .option("--dir <path>", "Working directory for git detection")
    .action(async (options) => {
      await executeLaunch(context, options);
    });

  // List command
  program
    .command("list")
    .description("List all agents")
    .option("--non-interactive", "Disable interactive mode (output plain text)")
    .option("--no-interactive", "Disable interactive mode (output plain text)")
    .option("--dir <path>", "Working directory for git detection")
    .action(async (options) => {
      // Normalize non-interactive flag (Commander.js converts --non-interactive to nonInteractive)
      const normalizedOptions = {
        ...options,
        "non-interactive": options.nonInteractive || options["non-interactive"] || false,
      };
      await executeList(context, normalizedOptions);
    });

  // Status command
  program
    .command("status <agent-id>")
    .description("Show agent status")
    .option("--non-interactive", "Disable interactive mode (output plain text)")
    .option("--no-interactive", "Disable interactive mode (output plain text)")
    .action(async (agentId: string, options) => {
      // Normalize non-interactive flag
      const normalizedOptions = {
        ...options,
        "non-interactive": options.nonInteractive || options["non-interactive"] || false,
        agentId,
      };
      await executeStatus(context, normalizedOptions);
    });
}

