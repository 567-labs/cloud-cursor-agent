import type { Agent } from "../api/schemas.js";

const DEFAULT_STATUS_ORDER: ReadonlyArray<string> = [
  "RUNNING",
  "CREATING",
  "FINISHED",
  "FAILED",
  "CANCELLED",
];

/**
 * Normalize a repository URL so string comparisons remain consistent.
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
 * Group agents by their lifecycle status while preserving the default ordering.
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
 * Calculate the display order for grouped statuses, ensuring unknown statuses follow alphabetical order.
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
 * Group agents by normalized repository URL and return an alphabetically sorted map.
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

  const sortedGroups = new Map<string, Agent[]>();
  Array.from(groups.keys())
    .sort()
    .forEach((repo) => {
      sortedGroups.set(repo, groups.get(repo)!);
    });

  return sortedGroups;
}

