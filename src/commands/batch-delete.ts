/**
 * Batch delete command - Delete multiple agents by status or other criteria
 */

import { ApiError } from "../api/client.js";
import type { CommandContext } from "../cli/types.js";
import { detectRepoAndRef } from "../utils/git.js";
import type { AgentStatus } from "../api/schemas.js";
import { getStatusDisplay } from "../utils/status.js";

interface BatchDeleteOptions {
  status?: AgentStatus | "terminal";
  repo?: string;
  "dry-run"?: boolean;
  force?: boolean;
  limit?: number;
  dir?: string;
}

/**
 * Normalize repository URLs for comparisons by stripping protocol, suffix, and case.
 *
 * @param {string} url - Repository URL from CLI flags or API responses.
 * @returns {string} Normalized repository identifier.
 * @example
 * normalizeRepo("https://github.com/context/app.git");
 * // => "github.com/context/app"
 */
function normalizeRepo(url: string): string {
  if (!url) return "";
  return url
    .replace(/^https?:\/\//, "") // Remove http:// or https:// prefix
    .replace(/\.git$/, "")
    .replace(/\/$/, "") // Remove trailing slash
    .toLowerCase()
    .trim();
}

const TERMINAL_STATUSES: AgentStatus[] = ["FINISHED", "FAILED", "CANCELLED"];

/**
 * Delete multiple agents that match the provided filters.
 *
 * @param {CommandContext} context - Shared CLI context with API client and working directory.
 * @param {BatchDeleteOptions} options - Filters and flags such as status, repo, and dry run.
 * @returns {Promise<void>} Resolves when deletions and logging are complete.
 * @example
 * await executeBatchDelete(context, { status: "terminal", force: true });
 */
export async function executeBatchDelete(
  context: CommandContext,
  options: BatchDeleteOptions,
): Promise<void> {
  const { apiClient, workingDir } = context;
  const {
    status,
    repo,
    "dry-run": dryRun = false,
    force = false,
    limit = 100,
    dir,
  } = options;

  try {
    // Determine repository filter
    let repositoryFilter: string | undefined = repo;
    if (!repositoryFilter) {
      const workingDirectory = dir || workingDir;
      const gitInfo = await detectRepoAndRef(workingDirectory);
      repositoryFilter = gitInfo?.repository;
    }

    // Fetch agents
    const response = await apiClient.listAgents(limit);
    let agents = response.agents;

    // Filter by repository if specified
    if (repositoryFilter) {
      const normalizedFilter = normalizeRepo(repositoryFilter);
      agents = agents.filter((agent) => {
        return normalizeRepo(agent.source.repository) === normalizedFilter;
      });
    }

    // Filter by status if specified
    if (status) {
      if (status === "terminal") {
        agents = agents.filter((agent) =>
          TERMINAL_STATUSES.includes(agent.status),
        );
      } else {
        agents = agents.filter((agent) => agent.status === status);
      }
    }

    if (agents.length === 0) {
      console.log("No agents found matching the criteria.");
      console.log(
        "Try adjusting --status, --repo, or increase --limit to inspect more agents.",
      );
      return;
    }

    // Show what will be deleted
    console.log(`Found ${agents.length} agent(s) to delete:\n`);
    for (const agent of agents) {
      const statusDisplay = getStatusDisplay(agent.status);
      console.log(
        `  ${agent.id} - ${statusDisplay.symbol} ${statusDisplay.label} - ${agent.name}`,
      );
    }
    console.log("");

    if (dryRun) {
      console.log("Dry run: No agents were deleted.");
      console.log("Re-run with --force after reviewing the list above.");
      return;
    }

    // Confirm deletion unless force flag is set
    if (!force) {
      console.error("This will permanently delete these agents.");
      console.error("Use --force to skip this confirmation.");
      console.error("");
      console.error("Example:");
      console.error(
        `  bun run cloud-agent.tsx batch-delete --status FINISHED --force`,
      );
      console.error("");
      console.error(
        "Tip: run the same command with --dry-run first to preview without deleting.",
      );
      process.exit(1);
      return;
    }

    // Delete agents
    console.log("Deleting agents...\n");
    let deletedCount = 0;
    let failedCount = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const agent of agents) {
      try {
        await apiClient.deleteAgent(agent.id);
        const statusDisplay = getStatusDisplay(agent.status);
        console.log(
          `✓ Deleted ${agent.id} (${statusDisplay.symbol} ${statusDisplay.label})`,
        );
        deletedCount++;
      } catch (error) {
        failedCount++;
        const errorMessage =
          error instanceof ApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Unknown error";
        errors.push({ id: agent.id, error: errorMessage });
        console.error(`✗ Failed to delete ${agent.id}: ${errorMessage}`);
      }
    }

    console.log("");
    console.log(`Deleted: ${deletedCount}`);
    if (failedCount > 0) {
      console.log(`Failed: ${failedCount}`);
      process.exit(1);
    }
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(
        "Batch delete failed: the API did not complete the request.",
      );
      console.error(`Reason: ${error.message}`);
      console.error(
        "Confirm your CURSOR_API_KEY has delete access and that the repository filter is valid.",
      );
    } else if (error instanceof Error) {
      console.error(`Unexpected batch delete error: ${error.message}`);
      console.error("Check your network connection and try again.");
    } else {
      console.error(
        "Error: Failed to batch delete agents for an unknown reason.",
      );
      console.error("Retry with a smaller --limit to narrow the request.");
    }
    process.exit(1);
  }
}
