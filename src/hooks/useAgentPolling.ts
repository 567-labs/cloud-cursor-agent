/**
 * Agent status polling hook
 *
 * Provides reusable polling logic for refreshing the status of active agents.
 *
 * @module hooks/useAgentPolling
 */

import { useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { CloudAgentsApiClient } from "../api/client.js";
import type { Agent } from "../api/schemas.js";

/**
 * Parameters required for the useAgentPolling hook.
 */
export interface UseAgentPollingParams {
  /** Current list of agents to evaluate for polling */
  agents: Agent[];
  /** API client used to fetch agent statuses */
  apiClient: CloudAgentsApiClient;
  /** State setter for the agents collection */
  setAgents: Dispatch<SetStateAction<Agent[]>>;
  /** State setter for tracking status transitions */
  setStatusTransitionAgents: Dispatch<SetStateAction<Set<string>>>;
}

/**
 * Polls active agents (CREATING or RUNNING) every 5 seconds to refresh their statuses.
 *
 * Automatically stops polling when there are no active agents, updates the
 * caller's agent list with fresh statuses, and tracks transition states with
 * a short-lived highlight window.
 *
 * @param params - Hook configuration
 */
export function useAgentPolling({
  agents,
  apiClient,
  setAgents,
  setStatusTransitionAgents,
}: UseAgentPollingParams): void {
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const activeAgents = agents.filter(
      (agent) => agent.status === "CREATING" || agent.status === "RUNNING"
    );

    if (activeAgents.length === 0) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    const refreshActiveAgentStatuses = async () => {
      try {
        const statusPromises = activeAgents.map((agent) =>
          apiClient.getAgentStatus(agent.id).catch((err) => {
            console.error(`Failed to fetch status for agent ${agent.id}:`, err);
            return null;
          })
        );

        const updatedAgents = await Promise.all(statusPromises);

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
        console.error("Error polling agent statuses:", err);
      }
    };

    pollingIntervalRef.current = setInterval(refreshActiveAgentStatuses, 5000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [agents, apiClient, setAgents, setStatusTransitionAgents]);
}
