/**
 * Command registry - Register and manage CLI commands
 */

import { Command } from "commander";
import type { CommandContext } from "../cli/types.js";
import { executeLaunch } from "./launch.js";
import { executeList } from "./list.jsx";
import { executeStatus } from "./status.jsx";
import { executeWatch } from "./watch.js";
import { executeCancel } from "./cancel.js";
import { executeFollowup } from "./followup.js";
import { executeConversation } from "./conversation.js";
import { executeOpen } from "./open.js";
import { executeDelete } from "./delete.js";
import { executeBatchDelete } from "./batch-delete.js";

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

  // Watch command
  program
    .command("watch <agent-ids...>")
    .description("Watch agent status(es) and block until they complete. Can watch multiple agents by providing space-separated IDs.")
    .option("--interval <ms>", "Polling interval in milliseconds", "2000")
    .option("--verbose, -v", "Show verbose output")
    .action(async (agentIds: string[], options) => {
      await executeWatch(context, {
        agentIds,
        interval: options.interval ? parseInt(options.interval, 10) : undefined,
        verbose: options.verbose || false,
      });
    });

  // Cancel command
  program
    .command("cancel <agent-id>")
    .description("Cancel a running agent")
    .action(async (agentId: string) => {
      await executeCancel(context, { agentId });
    });

  // Followup command
  program
    .command("followup <agent-id> <prompt>")
    .description("Add a follow-up instruction to an agent. Prompt can be text, a file path prefixed with @, or '-' to read from stdin")
    .action(async (agentId: string, prompt: string) => {
      await executeFollowup(context, { agentId, prompt });
    });

  // Conversation command
  program
    .command("conversation <agent-id>")
    .description("View agent conversation/logs")
    .option("--non-interactive", "Disable interactive mode (output plain text)")
    .option("--no-interactive", "Disable interactive mode (output plain text)")
    .action(async (agentId: string, options) => {
      const normalizedOptions = {
        ...options,
        "non-interactive": options.nonInteractive || options["non-interactive"] || false,
        agentId,
      };
      await executeConversation(context, normalizedOptions);
    });

  // Open command
  program
    .command("open <agent-id>")
    .description("Open agent URL in browser")
    .option("--pr", "Open PR URL instead of agent URL")
    .action(async (agentId: string, options) => {
      await executeOpen(context, {
        agentId,
        pr: options.pr || false,
      });
    });

  // Delete command
  program
    .command("delete <agent-id>")
    .description("Delete an agent")
    .option("--force", "Force delete even if agent is running")
    .action(async (agentId: string, options) => {
      await executeDelete(context, {
        agentId,
        force: options.force || false,
      });
    });

  // Batch delete command
  program
    .command("batch-delete")
    .description("Delete multiple agents by status or repository")
    .option("--status <status>", "Filter by status (FINISHED, FAILED, CANCELLED, CREATING, RUNNING, or 'terminal' for all terminal statuses)")
    .option("--repo <url>", "Filter by repository URL (auto-detected from git if not provided)")
    .option("--dry-run", "Show what would be deleted without actually deleting")
    .option("--force", "Skip confirmation prompt")
    .option("--limit <number>", "Maximum number of agents to fetch", "100")
    .option("--dir <path>", "Working directory for git detection")
    .action(async (options) => {
      await executeBatchDelete(context, {
        status: options.status,
        repo: options.repo,
        "dry-run": options.dryRun || false,
        force: options.force || false,
        limit: options.limit ? parseInt(options.limit, 10) : undefined,
        dir: options.dir,
      });
    });
}

