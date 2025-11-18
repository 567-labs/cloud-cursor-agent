import type { Agent } from "../api/schemas.js";

/**
 * Default ordering for known agent statuses.
 */
export const DEFAULT_STATUS_ORDER: ReadonlyArray<string> = [
  "RUNNING",
  "CREATING",
  "FINISHED",
  "FAILED",
  "CANCELLED",
];

/**
 * Normalize a repository URL into a canonical comparison string.
 *
 * @param url - Repository URL to normalize.
 * @returns Normalized repository string.
 */
export function normalizeRepositoryUrl(url: string): string {
  if (!url) return "";
  return url
    .replace(/^https?:\/\//, "")
    .replace(/\.git$/, "")
    .replace(/\/$/, "")
    .toLowerCase()
    .trim();
}

/**
 * Group agents by their status while preserving the default ordering.
 *
 * @param agents - Agents to group.
 * @returns Map of status → agents.
 */
export function groupAgentsByStatus(agents: Agent[]): Map<string, Agent[]> {
  const groups = new Map<string, Agent[]>();

  DEFAULT_STATUS_ORDER.forEach((status) => {
    groups.set(status, []);
  });

  agents.forEach((agent) => {
    const status = agent.status;
    if (!groups.has(status)) {
      groups.set(status, []);
    }
    groups.get(status)!.push(agent);
  });

  return groups;
}

/**
 * Determine the display order for grouped agent statuses.
 *
 * @param groups - Agent groups keyed by status.
 * @returns Ordered list of statuses for display.
 */
export function getStatusDisplayOrder(groups: Map<string, Agent[]>): string[] {
  const knownStatusesWithData = DEFAULT_STATUS_ORDER.filter(
    (status) => (groups.get(status)?.length ?? 0) > 0,
  );

  const extraStatuses = Array.from(groups.entries())
    .filter(
      ([status, items]) =>
        items.length > 0 && !DEFAULT_STATUS_ORDER.includes(status),
    )
    .map(([status]) => status)
    .sort();

  return [...knownStatusesWithData, ...extraStatuses];
}

/**
 * Group agents by their source repository.
 *
 * @param agents - Agents to group.
 * @returns Map of normalized repository → agents.
 */
export function groupAgentsByRepository(agents: Agent[]): Map<string, Agent[]> {
  const groups = new Map<string, Agent[]>();

  agents.forEach((agent) => {
    const repo = normalizeRepositoryUrl(agent.source.repository);
    if (!groups.has(repo)) {
      groups.set(repo, []);
    }
    groups.get(repo)!.push(agent);
  });

  const sortedRepos = Array.from(groups.keys()).sort();
  const sortedGroups = new Map<string, Agent[]>();
  sortedRepos.forEach((repo) => {
    sortedGroups.set(repo, groups.get(repo)!);
  });

  return sortedGroups;
}

