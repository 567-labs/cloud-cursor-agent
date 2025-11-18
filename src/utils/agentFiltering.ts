/**
 * Agent filtering and flattening utilities
 * 
 * Provides functions for filtering agents by status and flattening grouped
 * agents into a single array for selection tracking. These utilities are
 * useful for implementing filtering and navigation features.
 * 
 * @module utils/agentFiltering
 */

import type { Agent, AgentStatus } from "../api/schemas.js";
import { DEFAULT_STATUS_ORDER } from "./grouping.js";

/**
 * Filters agents by status.
 * 
 * If no status filter is provided, returns all agents unchanged.
 * Otherwise, returns only agents matching the specified status.
 * 
 * @param agents - Array of agents to filter
 * @param statusFilter - Status to filter by (null to show all)
 * @returns Filtered array of agents
 * 
 * @example
 * ```ts
 * const agents = [
 *   { id: "1", status: "RUNNING", ... },
 *   { id: "2", status: "FINISHED", ... },
 *   { id: "3", status: "RUNNING", ... }
 * ];
 * filterAgentsByStatus(agents, "RUNNING")
 * // [{ id: "1", ... }, { id: "3", ... }]
 * 
 * filterAgentsByStatus(agents, null)
 * // Returns all agents unchanged
 * ```
 */
export function filterAgentsByStatus(
  agents: Agent[],
  statusFilter: AgentStatus | null
): Agent[] {
  if (!statusFilter) return agents;
  return agents.filter(agent => agent.status === statusFilter);
}

/**
 * Flattens grouped agents into a single array for selection tracking.
 * 
 * Takes a Map of grouped agents and returns a flat array in the order
 * they should be displayed. The ordering depends on the grouping mode:
 * 
 * - Repository grouping: Sorted by repository name, then by status within each repo
 * - Status grouping: Ordered by status display order
 * 
 * @param groupedAgents - Map of group key -> agents array
 * @param groupByRepository - Whether grouping is by repository (true) or status (false)
 * @param statusDisplayOrder - Array of status strings in display order (for status grouping)
 * @returns Flattened array of agents in display order
 * 
 * @example
 * ```ts
 * // Repository grouping
 * const repoGroups = new Map([
 *   ["github.com/user/repo1", [agent1, agent2]],
 *   ["github.com/user/repo2", [agent3]]
 * ]);
 * flattenGroupedAgents(repoGroups, true, [])
 * // [agent1, agent2, agent3] (sorted by repo, then status)
 * 
 * // Status grouping
 * const statusGroups = new Map([
 *   ["RUNNING", [agent1]],
 *   ["FINISHED", [agent2]]
 * ]);
 * flattenGroupedAgents(statusGroups, false, ["RUNNING", "FINISHED"])
 * // [agent1, agent2]
 * ```
 */
export function flattenGroupedAgents(
  groupedAgents: Map<string, Agent[]>,
  groupByRepository: boolean,
  statusDisplayOrder: string[]
): Agent[] {
  const result: Agent[] = [];
  
  if (groupByRepository) {
    // For repository grouping, sort by repository name, then by status
    const repos = Array.from(groupedAgents.keys()).sort();
    repos.forEach(repo => {
      const repoAgents = groupedAgents.get(repo) || [];
      // Sort agents within each repo by status
      const sortedByStatus: Agent[] = [];
      DEFAULT_STATUS_ORDER.forEach(status => {
        repoAgents.filter(a => a.status === status).forEach(a => sortedByStatus.push(a));
      });
      result.push(...sortedByStatus);
    });
  } else {
    // For status grouping, iterate over dynamic status order
    statusDisplayOrder.forEach(status => {
      const groupAgents = groupedAgents.get(status) || [];
      result.push(...groupAgents);
    });
  }
  
  return result;
}

