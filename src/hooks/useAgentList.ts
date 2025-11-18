/**
 * Agent list data management hook
 * 
 * Manages state, data fetching, pagination, and polling for agent lists.
 * This hook handles all the complex logic for loading agents, tracking
 * status transitions, and maintaining pagination state.
 * 
 * @module hooks/useAgentList
 */

import { useCallback, useEffect, useState, useRef } from "react";
import { CloudAgentsApiClient, ApiError } from "../api/client.js";
import type { Agent, AgentStatus } from "../api/schemas.js";
import { normalizeRepositoryUrl } from "../utils/formatting.js";

/**
 * Configuration options for the useAgentList hook.
 */
export interface UseAgentListOptions {
  /** API client instance */
  apiClient: CloudAgentsApiClient;
  /** Optional repository filter */
  repositoryFilter?: string;
  /** Number of agents to display per view */
  agentsPerView: number;
}

/**
 * Return type for the useAgentList hook.
 */
export interface UseAgentListReturn {
  /** Array of loaded agents */
  agents: Agent[];
  /** Whether agents are currently loading */
  loading: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** Cursor for loading next page */
  nextCursor: string | undefined;
  /** Stack of cursors for previous pages */
  prevCursors: string[];
  /** Cursor used to load current page */
  currentPageCursor: string | undefined;
  /** Status filter (null = show all) */
  statusFilter: AgentStatus | null;
  /** Set status filter */
  setStatusFilter: (filter: AgentStatus | null) => void;
  /** Whether grouping is by repository */
  groupByRepository: boolean;
  /** Toggle grouping mode */
  setGroupByRepository: (value: boolean) => void;
  /** Set of agent IDs with status transitions */
  statusTransitionAgents: Set<string>;
  /** Whether to open PR URL (vs Agent URL) */
  openPrUrl: boolean;
  /** Toggle PR/Agent URL preference */
  setOpenPrUrl: (value: boolean) => void;
  /** Function to load agents */
  loadAgents: (cursor?: string, perPage?: number) => Promise<void>;
  /** Function to refresh agents */
  refreshAgents: () => void;
  /** Set previous cursors stack */
  setPrevCursors: (cursors: string[]) => void;
  /** Set current page cursor */
  setCurrentPageCursor: (cursor: string | undefined) => void;
}

const FETCH_MULTIPLIER = 2;

/**
 * Hook for managing agent list state, fetching, and polling.
 * 
 * Handles:
 * - Loading agents with pagination
 * - Filtering by repository
 * - Status filtering
 * - Grouping mode (status vs repository)
 * - Polling active agents for status updates
 * - Tracking status transitions
 * 
 * @param options - Configuration options
 * @returns Agent list state and control functions
 * 
 * @example
 * ```tsx
 * function AgentListComponent({ apiClient }) {
 *   const {
 *     agents,
 *     loading,
 *     error,
 *     loadAgents,
 *     statusFilter,
 *     setStatusFilter
 *   } = useAgentList({
 *     apiClient,
 *     agentsPerView: 10
 *   });
 *   
 *   // Use the state and functions...
 * }
 * ```
 */
export function useAgentList({
  apiClient,
  repositoryFilter,
  agentsPerView,
}: UseAgentListOptions): UseAgentListReturn {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [prevCursors, setPrevCursors] = useState<string[]>([]);
  const [currentPageCursor, setCurrentPageCursor] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<AgentStatus | null>(null);
  const [groupByRepository, setGroupByRepository] = useState(false);
  const [statusTransitionAgents, setStatusTransitionAgents] = useState<Set<string>>(new Set());
  const [openPrUrl, setOpenPrUrl] = useState(true);
  const [inFlightCursor, setInFlightCursor] = useState<string | undefined>(undefined);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadAgents = useCallback(
    async (cursor?: string, perPage = agentsPerView) => {
      // Prevent overlapping fetches
      if (inFlightCursor !== undefined && inFlightCursor === cursor) {
        return;
      }

      try {
        setInFlightCursor(cursor);
        setLoading(true);
        setError(null);

        // Precompute fetch size to avoid empty slots when gaining vertical space
        const fetchSize = Math.ceil(perPage * FETCH_MULTIPLIER);

        // Keep fetching until we have enough agents or run out
        let allAgents: Agent[] = [];
        let currentCursor = cursor;
        let hasMore = true;

        while (allAgents.length < perPage && hasMore) {
          const response = await apiClient.listAgents(fetchSize, currentCursor);

          // Filter by repository if filter is provided
          let filteredAgents = response.agents;
          if (repositoryFilter) {
            const normalizedFilter = normalizeRepositoryUrl(repositoryFilter);
            filteredAgents = response.agents.filter((agent) => {
              const agentRepo = normalizeRepositoryUrl(agent.source.repository);
              return agentRepo === normalizedFilter;
            });
          }

          allAgents = [...allAgents, ...filteredAgents];
          currentCursor = response.nextCursor;
          // Continue fetching as long as there are more pages from the API
          // Don't stop just because current page has no matches when filtering
          hasMore = !!response.nextCursor && response.agents.length > 0;

          // If we have enough agents or no more pages, stop
          if (allAgents.length >= perPage || !hasMore) {
            break;
          }
        }

        // Take only the first perPage agents
        const pageAgents = allAgents.slice(0, perPage);

        // Track status transitions
        setAgents((prevAgents) => {
          const prevStatusMap = new Map(prevAgents.map((a) => [a.id, a.status]));

          // Find agents whose status changed
          const transitionSet = new Set<string>();
          pageAgents.forEach((agent) => {
            const prevStatus = prevStatusMap.get(agent.id);
            if (prevStatus && prevStatus !== agent.status) {
              transitionSet.add(agent.id);
            }
          });

          if (transitionSet.size > 0) {
            setStatusTransitionAgents(transitionSet);
            // Clear transition indicators after 3 seconds
            setTimeout(() => {
              setStatusTransitionAgents((prev) => {
                const updated = new Set(prev);
                transitionSet.forEach((id) => updated.delete(id));
                return updated;
              });
            }, 3000);
          }

          return pageAgents;
        });

        // Set next cursor if we have more agents or more pages available
        if (hasMore && (allAgents.length > perPage || currentCursor)) {
          setNextCursor(currentCursor);
        } else {
          setNextCursor(undefined);
        }

        // Track the cursor used to load this page
        setCurrentPageCursor(cursor);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to load agents");
        }
      } finally {
        setLoading(false);
        setInFlightCursor(undefined);
      }
    },
    [apiClient, repositoryFilter, agentsPerView, inFlightCursor]
  );

  const refreshAgents = useCallback(() => {
    setPrevCursors([]);
    setCurrentPageCursor(undefined);
    loadAgents(undefined, agentsPerView);
  }, [loadAgents, agentsPerView]);

  // Initial load
  useEffect(() => {
    loadAgents(undefined, agentsPerView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiClient, repositoryFilter]);

  // Poll status for active agents (CREATING or RUNNING)
  useEffect(() => {
    // Find agents that need polling (use all agents, not filtered, so we poll even when filtered)
    const activeAgents = agents.filter(
      (agent) => agent.status === "CREATING" || agent.status === "RUNNING"
    );

    // If no active agents, clear any existing polling
    if (activeAgents.length === 0) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Function to refresh statuses for active agents
    const refreshActiveAgentStatuses = async () => {
      try {
        // Fetch fresh status for each active agent
        const statusPromises = activeAgents.map((agent) =>
          apiClient.getAgentStatus(agent.id).catch((err) => {
            // If fetching fails, return null to skip updating that agent
            console.error(`Failed to fetch status for agent ${agent.id}:`, err);
            return null;
          })
        );

        const updatedAgents = await Promise.all(statusPromises);

        // Update agents state with new statuses and track transitions
        setAgents((currentAgents) => {
          const agentMap = new Map(currentAgents.map((a) => [a.id, a]));
          const transitionSet = new Set<string>();

          updatedAgents.forEach((updatedAgent) => {
            if (updatedAgent) {
              const oldAgent = agentMap.get(updatedAgent.id);
              if (oldAgent && oldAgent.status !== updatedAgent.status) {
                transitionSet.add(updatedAgent.id);
              }
              agentMap.set(updatedAgent.id, updatedAgent);
            }
          });

          if (transitionSet.size > 0) {
            setStatusTransitionAgents(transitionSet);
            // Clear transition indicators after 3 seconds
            setTimeout(() => {
              setStatusTransitionAgents((prev) => {
                const updated = new Set(prev);
                transitionSet.forEach((id) => updated.delete(id));
                return updated;
              });
            }, 3000);
          }

          return Array.from(agentMap.values());
        });
      } catch (err) {
        // Silently handle errors during polling to avoid disrupting the UI
        console.error("Error polling agent statuses:", err);
      }
    };

    // Poll every 5 seconds
    pollingIntervalRef.current = setInterval(refreshActiveAgentStatuses, 5000);

    // Cleanup on unmount or when active agents change
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [agents, apiClient]);

  return {
    agents,
    loading,
    error,
    nextCursor,
    prevCursors,
    currentPageCursor,
    statusFilter,
    setStatusFilter,
    groupByRepository,
    setGroupByRepository,
    statusTransitionAgents,
    openPrUrl,
    setOpenPrUrl,
    loadAgents,
    refreshAgents,
    setPrevCursors,
    setCurrentPageCursor,
  };
}

