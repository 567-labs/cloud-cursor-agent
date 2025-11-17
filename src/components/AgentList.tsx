/**
 * AgentList component
 * Displays a list of agents in a table format
 */

import React, { useCallback, useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { CloudAgentsApiClient, ApiError } from "../api/client.js";
import { Spinner } from "./Spinner.js";
import { openInBrowser } from "../utils/browser.js";
import type { Agent } from "../api/schemas.js";

interface AgentListProps {
  apiClient: CloudAgentsApiClient;
  onBack: () => void;
  repositoryFilter?: string;
}

type InputKey = {
  upArrow?: boolean;
  downArrow?: boolean;
  leftArrow?: boolean;
  rightArrow?: boolean;
  return?: boolean;
};

function getStatusDisplay(status: string): { symbol: string; label: string; color: string } {
  switch (status) {
    case "CREATING":
      return { symbol: "●", label: "Creating", color: "yellow" };
    case "RUNNING":
      return { symbol: "▶", label: "Running", color: "green" };
    case "FINISHED":
      return { symbol: "✓", label: "Finished", color: "green" };
    case "FAILED":
      return { symbol: "✗", label: "Failed", color: "red" };
    case "CANCELLED":
      return { symbol: "○", label: "Cancelled", color: "gray" };
    default:
      return { symbol: "?", label: status, color: "gray" };
  }
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength - 3) + "...";
}

function normalizeRepositoryUrl(url: string): string {
  return url.replace(/\.git$/, "").toLowerCase().trim();
}

function groupAgentsByStatus(agents: Agent[]): Map<string, Agent[]> {
  const groups = new Map<string, Agent[]>();
  const statusOrder = ["RUNNING", "CREATING", "FINISHED", "FAILED", "CANCELLED"];
  
  // Initialize groups
  statusOrder.forEach(status => {
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


export function AgentList({ apiClient, onBack, repositoryFilter }: AgentListProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [prevCursors, setPrevCursors] = useState<string[]>([]); // Stack of cursors used to load previous pages
  const [currentPageCursor, setCurrentPageCursor] = useState<string | undefined>(undefined); // Cursor used to load current page
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);
  const [lastEnterPress, setLastEnterPress] = useState<number>(0);
  const [openingBrowser, setOpeningBrowser] = useState<string | null>(null);
  const terminalWidth = process.stdout.columns || 80;
  const terminalHeight = process.stdout.rows || 24;
  const headerHeight = 4;
  const footerHeight = 4;
  const paddingHeight = 2;
  const availableHeight = Math.max(5, terminalHeight - headerHeight - footerHeight - paddingHeight);
  const agentsPerView = Math.max(3, Math.floor(availableHeight / 3));
  const FETCH_MULTIPLIER = 2;

  const loadAgents = useCallback(async (cursor?: string, perPage = agentsPerView) => {
    try {
      setLoading(true);
      setError(null);
      
      // Keep fetching until we have enough agents or run out
      let allAgents: Agent[] = [];
      let currentCursor = cursor;
      let hasMore = true;
      
      while (allAgents.length < perPage && hasMore) {
        const response = await apiClient.listAgents(perPage * FETCH_MULTIPLIER, currentCursor); // Fetch more to account for filtering
        
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
        hasMore = !!response.nextCursor && filteredAgents.length > 0;
        
        // If we have enough agents or no more pages, stop
        if (allAgents.length >= perPage || !hasMore) {
          break;
        }
      }
      
      // Take only the first perPage agents
        const pageAgents = allAgents.slice(0, perPage);
      setAgents(pageAgents);
      
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
    }
  }, [apiClient, repositoryFilter, agentsPerView]);

  useEffect(() => {
    loadAgents(undefined, agentsPerView);
  }, [loadAgents, agentsPerView]);

  useInput(async (input: string, key: InputKey) => {
    if (input === "q") {
      onBack();
      } else if (input === "r") {
      setExpandedAgentId(null);
      setPrevCursors([]);
      setCurrentPageCursor(undefined);
        loadAgents(undefined, agentsPerView);
      setSelectedIndex(0);
    } else if (key.leftArrow && prevCursors.length > 0) {
      // Go to previous page
      const newPrevCursors = [...prevCursors];
      const prevCursorToUse = newPrevCursors.pop(); // Get and remove the last cursor
      setPrevCursors(newPrevCursors);
      setExpandedAgentId(null);
      loadAgents(prevCursorToUse, agentsPerView);
      setSelectedIndex(0);
    } else if (key.rightArrow && nextCursor) {
      // Go to next page
      // Save current page cursor to prev stack before loading next page
      if (currentPageCursor !== undefined) {
        setPrevCursors((prev) => [...prev, currentPageCursor]);
      }
      setExpandedAgentId(null);
      loadAgents(nextCursor, agentsPerView);
      setSelectedIndex(0);
    } else if (key.upArrow && selectedIndex > 0) {
      setExpandedAgentId(null); // Collapse when navigating
      setSelectedIndex((prev) => prev - 1);
    } else if (key.downArrow) {
      // Create flattened list for navigation
      const statusGroups = groupAgentsByStatus(agents);
      const flattenedAgents: Agent[] = [];
      const statusOrder = ["RUNNING", "CREATING", "FINISHED", "FAILED", "CANCELLED"];
      statusOrder.forEach(status => {
        const groupAgents = statusGroups.get(status) || [];
        flattenedAgents.push(...groupAgents);
      });
      
      if (selectedIndex < flattenedAgents.length - 1) {
        setExpandedAgentId(null); // Collapse when navigating
        setSelectedIndex((prev) => prev + 1);
      }
    } else if (key.return) {
      // Create flattened list for selection
      const statusGroups = groupAgentsByStatus(agents);
      const flattenedAgents: Agent[] = [];
      const statusOrder = ["RUNNING", "CREATING", "FINISHED", "FAILED", "CANCELLED"];
      statusOrder.forEach(status => {
        const groupAgents = statusGroups.get(status) || [];
        flattenedAgents.push(...groupAgents);
      });
      
      const selectedAgent = flattenedAgents[selectedIndex];
      if (!selectedAgent) return;
      
      const now = Date.now();
      const timeSinceLastEnter = now - lastEnterPress;
      
      if (expandedAgentId === selectedAgent.id && timeSinceLastEnter < 500) {
        // Double Enter: Open in browser
        try {
          setOpeningBrowser(selectedAgent.id);
          await openInBrowser(selectedAgent.target.url);
          setTimeout(() => setOpeningBrowser(null), 1000);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to open browser");
          setTimeout(() => setOpeningBrowser(null), 2000);
        }
      } else {
        // Single Enter: Toggle expansion
        setExpandedAgentId(expandedAgentId === selectedAgent.id ? null : selectedAgent.id);
        setLastEnterPress(now);
      }
    }
  });

  if (loading && agents.length === 0) {
    return (
      <Box padding={1}>
        <Spinner text="Loading your agents..." />
      </Box>
    );
  }

  if (error) {
    return (
      <Box padding={1} flexDirection="column">
        <Text color="red">✗ Error: {error}</Text>
        <Box marginTop={1}>
          <Text color="gray">Press 'q' to go back or 'r' to try again</Text>
        </Box>
      </Box>
    );
  }

  if (agents.length === 0) {
    return (
      <Box padding={1} flexDirection="column">
        <Box marginBottom={1}>
          <Text color="gray">No agents found yet</Text>
        </Box>
        <Box marginBottom={1}>
          <Text color="gray">To create your first cloud agent, run:</Text>
        </Box>
        <Box marginLeft={2}>
          <Text color="cyan">cloud-agent launch --plan plan.md</Text>
        </Box>
        <Box marginTop={1}>
          <Text color="gray">Press 'q' to go back</Text>
        </Box>
      </Box>
    );
  }

  // Group agents by status
  const statusGroups = groupAgentsByStatus(agents);
  
  // Create flattened list for selection tracking
  const flattenedAgents: Agent[] = [];
  const statusOrder = ["RUNNING", "CREATING", "FINISHED", "FAILED", "CANCELLED"];
  statusOrder.forEach(status => {
    const groupAgents = statusGroups.get(status) || [];
    flattenedAgents.push(...groupAgents);
  });
  
  // Get selected agent from flattened list
  const selectedAgent = flattenedAgents[selectedIndex];
  
  const separatorWidth = Math.max(20, terminalWidth - 4);
  
  return (
    <Box flexDirection="column" padding={1} width={terminalWidth}>
      <Box marginBottom={1} flexDirection="row" alignItems="center">
        <Text bold>
          Your Cloud Agents
          {agents.length > 0 && (
            <Text color="gray"> ({agents.length} {agents.length === 1 ? 'agent' : 'agents'})</Text>
          )}
          {repositoryFilter && (
            <Text color="gray"> • {repositoryFilter}</Text>
          )}
        </Text>
        {loading && agents.length > 0 && (
          <Box marginLeft={2}>
            <Spinner text="Refreshing..." />
          </Box>
        )}
      </Box>
      <Box marginBottom={1}>
        <Text color="gray">{"─".repeat(separatorWidth)}</Text>
      </Box>

      {/* Status-grouped sections */}
      {statusOrder.map((status) => {
        const groupAgents = statusGroups.get(status) || [];
        if (groupAgents.length === 0) return null;
        
        const statusDisplay = getStatusDisplay(status);
        const sectionTitle = `${statusDisplay.symbol} ${statusDisplay.label} (${groupAgents.length})`;
        
        return (
          <Box key={status} marginBottom={1} flexDirection="column">
            {/* Section header */}
            <Box marginBottom={0}>
              <Text color="gray">┌─ </Text>
              <Text color={statusDisplay.color} bold>{sectionTitle}</Text>
              <Text color="gray"> {"─".repeat(Math.max(1, separatorWidth - sectionTitle.length - 5))}┐</Text>
            </Box>
            
            {/* Agents in this status group */}
            {groupAgents.map((agent) => {
              const globalIndex = flattenedAgents.indexOf(agent);
              const isSelected = globalIndex === selectedIndex;
              const isExpanded = expandedAgentId === agent.id;
              const isOpening = openingBrowser === agent.id;
              
              // Extract org/repo from full URL for compact display
              const compactRepo = agent.source.repository
                .replace(/^https?:\/\/(www\.)?github\.com\//, "")
                .replace(/\.git$/, "");
              
              const nameMaxWidth = Math.max(30, Math.floor(terminalWidth * 0.4));
              const repoMaxWidth = Math.max(25, Math.floor(terminalWidth * 0.35));
              
              const agentContent = (
                <Box flexDirection="column">
                  {/* Main agent row */}
                  <Box flexDirection="row">
                    <Box>
                      <Text color={isSelected ? "cyan" : statusDisplay.color}>
                        {statusDisplay.symbol} {isExpanded ? agent.name : truncate(agent.name, nameMaxWidth)}
                      </Text>
                    </Box>
                    <Box marginLeft={2}>
                      <Text color={isSelected ? "cyan" : undefined}>
                        {isExpanded ? agent.source.repository : truncate(compactRepo, repoMaxWidth)}
                      </Text>
                    </Box>
                  </Box>
                  
                  {/* Preview URL */}
                  <Box marginLeft={3}>
                    <Text color="cyan" dimColor>
                      Preview: {truncate(agent.target.url, terminalWidth - 15)}
                    </Text>
                  </Box>
                  
                  {/* PR URL if available */}
                  {agent.target.prUrl && (
                    <Box marginLeft={3}>
                      <Text color="cyan" dimColor>
                        PR: {truncate(agent.target.prUrl, terminalWidth - 8)}
                      </Text>
                    </Box>
                  )}
                  
                  {/* Expanded details */}
                  {isExpanded && (
                    <Box marginLeft={2} marginTop={1} flexDirection="column">
                      <Box marginTop={0} marginBottom={1}>
                        <Text color="gray">{"─".repeat(Math.max(20, separatorWidth - 8))}</Text>
                      </Box>
                      <Box marginTop={0} flexDirection="column">
                        <Box marginBottom={1}>
                          <Text>
                            <Text color="gray" dimColor>Agent ID: </Text>
                            <Text>{agent.id}</Text>
                          </Text>
                        </Box>
                        <Box marginBottom={1}>
                          <Text>
                            <Text color="gray" dimColor>Name: </Text>
                            <Text bold>{agent.name}</Text>
                          </Text>
                        </Box>
                        <Box marginBottom={1}>
                          <Text>
                            <Text color="gray" dimColor>Status: </Text>
                            <Text color={statusDisplay.color}>
                              {statusDisplay.symbol} {statusDisplay.label}
                            </Text>
                          </Text>
                        </Box>
                        <Box marginBottom={1}>
                          <Text>
                            <Text color="gray" dimColor>Repository: </Text>
                            <Text>{agent.source.repository}</Text>
                          </Text>
                        </Box>
                        {agent.source.ref && (
                          <Box marginBottom={1}>
                            <Text>
                              <Text color="gray" dimColor>Ref: </Text>
                              <Text>{agent.source.ref}</Text>
                            </Text>
                          </Box>
                        )}
                        {agent.target.branchName && (
                          <Box marginBottom={1}>
                            <Text>
                              <Text color="gray" dimColor>Branch: </Text>
                              <Text>{agent.target.branchName}</Text>
                            </Text>
                          </Box>
                        )}
                        <Box marginBottom={1}>
                          <Text>
                            <Text color="gray" dimColor>Preview URL: </Text>
                            <Text color="cyan">{agent.target.url}</Text>
                          </Text>
                        </Box>
                        {agent.target.prUrl && (
                          <Box marginBottom={1}>
                            <Text>
                              <Text color="gray" dimColor>Pull Request: </Text>
                              <Text color="cyan">{agent.target.prUrl}</Text>
                            </Text>
                          </Box>
                        )}
                        {agent.summary && (
                          <Box marginTop={1} marginBottom={1} flexDirection="column">
                            <Box marginBottom={0}>
                              <Text color="gray" dimColor>Summary:</Text>
                            </Box>
                            <Box marginTop={0}>
                              <Text>{agent.summary}</Text>
                            </Box>
                          </Box>
                        )}
                        <Box marginTop={1} marginBottom={0}>
                          <Text>
                            <Text color="gray" dimColor>Created: </Text>
                            <Text>{new Date(agent.createdAt).toLocaleString()}</Text>
                          </Text>
                        </Box>
                      </Box>
                      {isOpening && (
                        <Box marginTop={1}>
                          <Text color="cyan">Opening in browser...</Text>
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>
              );
              
              // Wrap selected item in a box with border
              if (isSelected) {
                return (
                  <Box key={agent.id} marginTop={0} marginBottom={0}>
                    <Box 
                      borderStyle="round" 
                      borderColor="cyan" 
                      paddingX={1} 
                      paddingY={isExpanded ? 1 : 0}
                      width={terminalWidth - 6}
                    >
                      {agentContent}
                    </Box>
                  </Box>
                );
              }
              
              return (
                <Box key={agent.id} marginTop={0} marginBottom={0}>
                  <Box marginLeft={2}>
                    {agentContent}
                  </Box>
                </Box>
              );
            })}
            
            {/* Section footer */}
            <Box marginTop={0}>
              <Text color="gray">└{"─".repeat(separatorWidth - 2)}┘</Text>
            </Box>
          </Box>
        );
      })}

      {/* Footer */}
      <Box marginTop={2} flexDirection="column">
        <Box marginBottom={1}>
          <Text color="gray" dimColor>
            Page {prevCursors.length + 1} • Showing {agents.length} {agents.length === 1 ? 'agent' : 'agents'}
          </Text>
        </Box>
        <Box marginBottom={1} flexDirection="row" gap={2}>
          {prevCursors.length > 0 && (
            <Text color="gray" dimColor>← Previous</Text>
          )}
          {nextCursor && (
            <Text color="gray" dimColor>→ Next</Text>
          )}
        </Box>
        <Box marginTop={0} marginBottom={0}>
          <Text color="gray" dimColor>
            ↑↓ Navigate • Enter Expand • Enter twice Open • q Back • r Refresh
          </Text>
        </Box>
      </Box>
    </Box>
  );
}

