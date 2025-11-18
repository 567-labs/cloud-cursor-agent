/**
 * List command - List all agents
 */

import React from "react";
import { render } from "ink";
import type { CommandContext } from "../cli/types.js";
import { detectRepoAndRef } from "../utils/git.js";
import { AgentList } from "../components/AgentList.js";

interface ListOptions {
  "non-interactive"?: boolean;
  dir?: string;
}

/**
 * Convert an agent status into a text-friendly symbol for terminal output.
 *
 * @param {string} status - Agent status string such as `RUNNING`.
 * @returns {string} Square-bracketed unicode symbol describing the status.
 * @example
 * getStatusSymbol("FAILED");
 * // => "[✗]"
 */
function getStatusSymbol(status: string): string {
  switch (status) {
    case "CREATING":
      return "[●]";
    case "RUNNING":
      return "[▶]";
    case "FINISHED":
      return "[✓]";
    case "FAILED":
      return "[✗]";
    case "CANCELLED":
      return "[○]";
    default:
      return "[?]";
  }
}

/**
 * Normalize repository URLs for comparisons by stripping protocol, suffix, and case.
 *
 * @param {string} url - Repository URL sourced from git info or API.
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

/**
 * List cloud agents either in an interactive Ink UI or plain text mode.
 *
 * @param {CommandContext} context - Shared CLI context with API client and working directory.
 * @param {ListOptions} options - Flags such as non-interactive output and git directory.
 * @returns {Promise<void>} Resolves when rendering or printing finishes.
 * @example
 * await executeList(context, { "non-interactive": true });
 */
export async function executeList(
  context: CommandContext,
  options: ListOptions
): Promise<void> {
  const { apiClient, workingDir } = context;
  const { "non-interactive": nonInteractive, dir } = options;

  // Detect repository for filtering
  const workingDirectory = dir || workingDir;
  const gitInfo = await detectRepoAndRef(workingDirectory);
  const repositoryFilter = gitInfo?.repository;

  if (nonInteractive) {
    // Non-interactive mode: output plain text
    try {
      const response = await apiClient.listAgents(100); // Get up to 100 agents

      // Filter by repository if detected
      let agents = response.agents;
      if (repositoryFilter) {
        const normalizedFilter = normalizeRepo(repositoryFilter);
        agents = response.agents.filter((agent) => {
          return normalizeRepo(agent.source.repository) === normalizedFilter;
        });
      }

      if (agents.length === 0) {
        if (repositoryFilter) {
          console.log(`No agents found for ${repositoryFilter}.`);
        } else {
          console.log("No agents found.");
        }
        console.log("");
        console.log("Make a cloud agent via command:");
        console.log("  cloud-agent launch --plan plan.md");
        return;
      }

      if (repositoryFilter) {
        console.log(`Found ${agents.length} agent(s) for ${repositoryFilter}:\n`);
      } else {
        console.log(`Found ${agents.length} agent(s):\n`);
      }

      for (const agent of agents) {
        const statusSymbol = getStatusSymbol(agent.status);
        console.log(agent.id);
        console.log(`  Status:     ${statusSymbol} ${agent.status}`);
        console.log(`  Name:       ${agent.name}`);
        console.log(`  Repository: ${agent.source.repository}`);
        if (agent.source.ref) {
          console.log(`  Ref:        ${agent.source.ref}`);
        }
        if (agent.target.branchName) {
          console.log(`  Branch:     ${agent.target.branchName}`);
        }
        console.log(`  URL:        ${agent.target.url}`);
        if (agent.target.prUrl) {
          console.log(`  PR:         ${agent.target.prUrl}`);
        }
        console.log("");
      }
      if (response.nextCursor && !repositoryFilter) {
        console.log("(More agents available - use interactive mode to paginate)");
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.error("Error: Failed to list agents");
      }
      process.exit(1);
    }
    return;
  }

  // Interactive mode
  const { waitUntilExit } = render(
    <AgentList
      apiClient={apiClient}
      onBack={() => process.exit(0)}
      repositoryFilter={repositoryFilter}
    />
  );
  await waitUntilExit();
}

