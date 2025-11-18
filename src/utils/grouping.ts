/**
 * Agent grouping utilities
 * 
 * Provides functions for grouping and organizing agents by various criteria
 * (status, repository, etc.). These utilities maintain consistent ordering
 * and can be reused across components that need to display agents in groups.
 * 
 * @module utils/grouping
 */

import type { Agent } from "../api/schemas.js";
import { normalizeRepositoryUrl } from "./formatting.js";

/**
 * Default order for agent statuses when displaying grouped lists.
 * 
 * Statuses are ordered by priority/importance:
 * 1. RUNNING - Active work in progress
 * 2. CREATING - Being set up
 * 3. FINISHED - Completed successfully
 * 4. FAILED - Completed with errors
 * 5. CANCELLED - Manually stopped
 * 
 * This order is used to ensure consistent display across the application.
 */
export const DEFAULT_STATUS_ORDER: ReadonlyArray<string> = [
  "RUNNING",
  "CREATING",
  "FINISHED",
  "FAILED",
  "CANCELLED",
];

/**
 * Groups agents by their status.
 * 
 * Creates a Map where keys are status strings and values are arrays of agents
 * with that status. The Map is initialized with all known statuses from
 * DEFAULT_STATUS_ORDER to preserve ordering, even if no agents have that status.
 * 
 * @param agents - Array of agents to group
 * @returns Map of status -> agents array
 * 
 * @example
 * ```ts
 * const agents = [
 *   { id: "1", status: "RUNNING", ... },
 *   { id: "2", status: "FINISHED", ... },
 *   { id: "3", status: "RUNNING", ... }
 * ];
 * const groups = groupAgentsByStatus(agents);
 * // Map {
 * //   "RUNNING" => [agent1, agent3],
 * //   "FINISHED" => [agent2],
 * //   "CREATING" => [],
 * //   ...
 * // }
 * ```
 */
export function groupAgentsByStatus(agents: Agent[]): Map<string, Agent[]> {
  const groups = new Map<string, Agent[]>();
  
  // Initialize groups for known statuses so they preserve order later
  DEFAULT_STATUS_ORDER.forEach(status => {
    groups.set(status, []);
  });
  
  // Group agents
  agents.forEach(agent => {
    const status = agent.status;
    if (!groups.has(status)) {
      groups.set(status, []);
    }
    groups.get(status)!.push(agent);
  });
  
  return groups;
}

/**
 * Gets the display order for statuses based on which groups have agents.
 * 
 * Returns an array of status strings in the order they should be displayed.
 * Known statuses (from DEFAULT_STATUS_ORDER) are listed first, followed by
 * any unknown statuses sorted alphabetically.
 * 
 * @param groups - Map of status -> agents array (typically from groupAgentsByStatus)
 * @returns Array of status strings in display order
 * 
 * @example
 * ```ts
 * const groups = new Map([
 *   ["FINISHED", [agent1]],
 *   ["RUNNING", [agent2]],
 *   ["UNKNOWN_STATUS", [agent3]]
 * ]);
 * const order = getStatusDisplayOrder(groups);
 * // ["RUNNING", "FINISHED", "UNKNOWN_STATUS"]
 * ```
 */
export function getStatusDisplayOrder(groups: Map<string, Agent[]>): string[] {
  const knownStatusesWithData = DEFAULT_STATUS_ORDER.filter(
    (status) => (groups.get(status)?.length ?? 0) > 0
  );
  const extraStatuses = Array.from(groups.entries())
    .filter(
      ([status, items]) =>
        items.length > 0 && !DEFAULT_STATUS_ORDER.includes(status)
    )
    .map(([status]) => status)
    .sort();
  return [...knownStatusesWithData, ...extraStatuses];
}

/**
 * Groups agents by their repository URL.
 * 
 * Creates a Map where keys are normalized repository URLs and values are arrays
 * of agents from that repository. Repositories are sorted alphabetically.
 * 
 * Uses normalizeRepositoryUrl to ensure consistent grouping even if URLs
 * are formatted differently (e.g., with/without protocol, trailing slashes).
 * 
 * @param agents - Array of agents to group
 * @returns Map of normalized repository URL -> agents array (sorted by repo name)
 * 
 * @example
 * ```ts
 * const agents = [
 *   { id: "1", source: { repository: "https://github.com/user/repo1.git" }, ... },
 *   { id: "2", source: { repository: "github.com/user/repo2" }, ... },
 *   { id: "3", source: { repository: "https://github.com/user/repo1" }, ... }
 * ];
 * const groups = groupAgentsByRepository(agents);
 * // Map {
 * //   "github.com/user/repo1" => [agent1, agent3],
 * //   "github.com/user/repo2" => [agent2]
 * // }
 * ```
 */
export function groupAgentsByRepository(agents: Agent[]): Map<string, Agent[]> {
  const groups = new Map<string, Agent[]>();
  
  // Group agents by repository
  agents.forEach(agent => {
    const repo = normalizeRepositoryUrl(agent.source.repository);
    if (!groups.has(repo)) {
      groups.set(repo, []);
    }
    groups.get(repo)!.push(agent);
  });
  
  // Sort repositories alphabetically
  const sortedRepos = Array.from(groups.keys()).sort();
  const sortedGroups = new Map<string, Agent[]>();
  sortedRepos.forEach(repo => {
    sortedGroups.set(repo, groups.get(repo)!);
  });
  
  return sortedGroups;
}

