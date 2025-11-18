/**
 * AgentList component
 * Displays a list of agents in a table format
 */

import React, { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { Box, Text, useInput, useStdout } from "ink";
import { CloudAgentsApiClient, ApiError } from "../api/client.js";
import { Spinner } from "./Spinner.js";
import { openInBrowser } from "../utils/browser.js";
import { getStatusDisplay, getRelativeTime } from "../utils/status.js";
import type { Agent, AgentStatus } from "../api/schemas.js";
import { fuzzyMatchAny } from "../utils/search.js";

interface AgentListProps {
  apiClient: CloudAgentsApiClient;
  onBack: () => void;
  repositoryFilter?: string;
  initialSearchQuery?: string;
}

type InputKey = {
  upArrow?: boolean;
  downArrow?: boolean;
  leftArrow?: boolean;
  rightArrow?: boolean;
  return?: boolean;
  escape?: boolean;
  backspace?: boolean;
  delete?: boolean;
  ctrl?: boolean;
  meta?: boolean;
};

function truncate(str: string, maxLength: number): string {
  if (maxLength <= 0) return str;
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, Math.max(0, maxLength - 3)) + "...";
}

function clampWidth(width: number, min: number = 8): number {
  return Math.max(min, width);
}

function getSeparator(width: number, minLength: number = 5): string {
  return "─".repeat(Math.max(minLength, width));
}

const DEFAULT_STATUS_ORDER: ReadonlyArray<string> = [
  "RUNNING",
  "CREATING",
  "FINISHED",
  "FAILED",
  "CANCELLED",
];

type LayoutBreakpoint = "wide" | "medium" | "compact";

function getLayoutBreakpoint(width: number): LayoutBreakpoint {
  if (width >= 100) return "wide";
  if (width >= 70) return "medium";
  return "compact";
}

function getLayoutLabel(breakpoint: LayoutBreakpoint): string {
  switch (breakpoint) {
    case "wide":
      return "Wide layout";
    case "medium":
      return "Medium layout";
    case "compact":
      return "Compact layout";
  }
}

function normalizeRepositoryUrl(url: string): string {
  if (!url) return "";
  return url
    .replace(/^https?:\/\//, "") // Remove http:// or https:// prefix
    .replace(/\.git$/, "")
    .replace(/\/$/, "") // Remove trailing slash
    .toLowerCase()
    .trim();
}

function groupAgentsByStatus(agents: Agent[]): Map<string, Agent[]> {
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

function getStatusDisplayOrder(groups: Map<string, Agent[]>): string[] {
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

function groupAgentsByRepository(agents: Agent[]): Map<string, Agent[]> {
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


export function AgentList({ apiClient, onBack, repositoryFilter, initialSearchQuery }: AgentListProps) {
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
  const [inFlightCursor, setInFlightCursor] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<AgentStatus | null>(null);
  const [groupByRepository, setGroupByRepository] = useState(false);
  const [previousAgentStatuses, setPreviousAgentStatuses] = useState<Map<string, AgentStatus>>(new Map());
  const [statusTransitionAgents, setStatusTransitionAgents] = useState<Set<string>>(new Set());
  const [totalAgentsCount, setTotalAgentsCount] = useState<number | null>(null);
  const [openPrUrl, setOpenPrUrl] = useState(true); // Default to opening PR URL
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery?.trim() ?? "");
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [hasFetchedAllAgents, setHasFetchedAllAgents] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const trimmedSearchQuery = searchQuery.trim();
  const isSearchActive = trimmedSearchQuery.length > 0;
  
  // Real-time terminal dimensions using Ink hooks
  const { stdout } = useStdout();
  const [terminalWidth, setTerminalWidth] = useState<number>(stdout?.columns || process.stdout.columns || 80);
  const [terminalHeight, setTerminalHeight] = useState<number>(stdout?.rows || process.stdout.rows || 24);
  
  // Debounce resize events to avoid spamming API
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAgentsPerViewRef = useRef<number>(0);
  
  // Listen to resize events
  useEffect(() => {
    const handleResize = () => {
      const newWidth = stdout?.columns || process.stdout.columns || 80;
      const newHeight = stdout?.rows || process.stdout.rows || 24;
      setTerminalWidth(newWidth);
      setTerminalHeight(newHeight);
    };
    
    // Initial sync
    handleResize();
    
    // Listen to resize events on stdout
    if (stdout) {
      stdout.on("resize", handleResize);
      return () => {
        stdout.off("resize", handleResize);
        if (resizeTimeoutRef.current) {
          clearTimeout(resizeTimeoutRef.current);
        }
      };
    }
    
    // Fallback to process.stdout if stdout is not available
    process.stdout.on("resize", handleResize);
    return () => {
      process.stdout.off("resize", handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [stdout]);
  
  // Memoized layout metrics
  // Header: title line + marginBottom + separator line + marginBottom = 4 lines
  const headerHeight = 4;
  // Footer: marginTop (2) + pagination line + marginBottom + hints line = 5 lines
  const footerHeight = 5;
  const chromePadding = 4; // Padding for borders and margins
  
  const layoutBreakpoint = useMemo(() => {
    return getLayoutBreakpoint(terminalWidth);
  }, [terminalWidth]);
  
  // Main Box padding: 1 top + 1 bottom = 2 lines (when not compact)
  const mainBoxPadding = useMemo(() => {
    return layoutBreakpoint === "compact" ? 0 : 2;
  }, [layoutBreakpoint]);
  
  const availableHeight = useMemo(() => {
    return Math.max(5, terminalHeight - headerHeight - footerHeight - mainBoxPadding);
  }, [terminalHeight, mainBoxPadding]);
  
  const agentsPerView = useMemo(() => {
    return Math.max(3, Math.floor(availableHeight / 3));
  }, [availableHeight]);
  
  const availableContentWidth = useMemo(() => {
    return clampWidth(terminalWidth - chromePadding);
  }, [terminalWidth]);
  
  const separatorWidth = useMemo(() => {
    return clampWidth(terminalWidth - 4, 20);
  }, [terminalWidth]);
  
  // Column distribution based on breakpoint
  const columnLayout = useMemo(() => {
    const width = availableContentWidth;
    if (layoutBreakpoint === "wide") {
      // >= 100 columns: 45% name, 35% repo, remainder spacing
      return {
        nameWidth: Math.floor(width * 0.45),
        repoWidth: Math.floor(width * 0.35),
        stacked: false,
      };
    } else if (layoutBreakpoint === "medium") {
      // 70-100: 60% name, 40% repo
      return {
        nameWidth: Math.floor(width * 0.60),
        repoWidth: Math.floor(width * 0.40),
        stacked: false,
      };
    } else {
      // < 70: stack repository and URLs beneath name
      return {
        nameWidth: width,
        repoWidth: width,
        stacked: true,
      };
    }
  }, [availableContentWidth, layoutBreakpoint]);
  
  // Filter agents by status and search query
  const filteredAgents = useMemo(() => {
    let result = agents;
    if (statusFilter) {
      result = result.filter(agent => agent.status === statusFilter);
    }
    if (trimmedSearchQuery) {
      result = result.filter((agent) =>
        fuzzyMatchAny(trimmedSearchQuery, [agent.name, agent.summary ?? ""]),
      );
    }
    return result;
  }, [agents, statusFilter, trimmedSearchQuery]);
  
  // Group agents based on current grouping mode
  const groupedAgents = useMemo(() => {
    if (groupByRepository) {
      return groupAgentsByRepository(filteredAgents);
    } else {
      return groupAgentsByStatus(filteredAgents);
    }
  }, [filteredAgents, groupByRepository]);
  
  const statusDisplayOrder = useMemo(() => {
    if (groupByRepository) {
      return [];
    }
    return getStatusDisplayOrder(groupedAgents);
  }, [groupByRepository, groupedAgents]);

  // Create flattened list for selection tracking
  const flattenedAgents = useMemo(() => {
    const result: Agent[] = [];
    if (groupByRepository) {
      // For repository grouping, sort by repository name, then by status
      const repos = Array.from(groupedAgents.keys()).sort();
      const statusOrder = ["RUNNING", "CREATING", "FINISHED", "FAILED", "CANCELLED"];
      repos.forEach(repo => {
        const repoAgents = groupedAgents.get(repo) || [];
        // Sort agents within each repo by status
        const sortedByStatus: Agent[] = [];
        statusOrder.forEach(status => {
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
  }, [groupedAgents, groupByRepository, statusDisplayOrder]);
  
  const FETCH_MULTIPLIER = 2;
  const SEARCH_FETCH_SIZE = 100;
  const MAX_SEARCH_RESULTS = 2000; // Safeguard to prevent unbounded fetches
  const MAX_SEARCH_ITERATIONS = 200;

  const loadAgents = useCallback(
    async (cursor?: string, perPage = agentsPerView, options?: { fetchAll?: boolean }) => {
      const shouldFetchAll = options?.fetchAll ?? false;
      const fetchKey = `${shouldFetchAll ? "all" : "page"}:${cursor ?? "root"}:${perPage}`;

      if (inFlightCursor && inFlightCursor === fetchKey) {
        return;
      }
      
      try {
        setInFlightCursor(fetchKey);
        setLoading(true);
        setError(null);
        
        const fetchSize = shouldFetchAll
          ? SEARCH_FETCH_SIZE
          : Math.ceil(perPage * FETCH_MULTIPLIER);
        
        let allAgents: Agent[] = [];
        let currentCursor = cursor;
        let hasMore = true;
        let iterationCount = 0;
        
        while (hasMore) {
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
          hasMore = !!response.nextCursor && response.agents.length > 0;
          iterationCount += 1;
          
          if (!shouldFetchAll && (allAgents.length >= perPage || !hasMore)) {
            break;
          }
          
          if (shouldFetchAll) {
            if (!hasMore) {
              break;
            }
            if (allAgents.length >= MAX_SEARCH_RESULTS) {
              hasMore = false;
              break;
            }
            if (iterationCount >= MAX_SEARCH_ITERATIONS) {
              hasMore = false;
              break;
            }
          }
        }
        
        const pageAgents = shouldFetchAll ? allAgents : allAgents.slice(0, perPage);
        
        // Track status transitions
        setAgents((prevAgents) => {
          const prevStatusMap = new Map(prevAgents.map(a => [a.id, a.status]));
          setPreviousAgentStatuses(prevStatusMap);
          
          const transitionSet = new Set<string>();
          pageAgents.forEach(agent => {
            const prevStatus = prevStatusMap.get(agent.id);
            if (prevStatus && prevStatus !== agent.status) {
              transitionSet.add(agent.id);
            }
          });
          
          if (transitionSet.size > 0) {
            setStatusTransitionAgents(transitionSet);
            setTimeout(() => {
              setStatusTransitionAgents(prev => {
                const updated = new Set(prev);
                transitionSet.forEach(id => updated.delete(id));
                return updated;
              });
            }, 3000);
          }
          
          return pageAgents;
        });
        
        if (shouldFetchAll) {
          setNextCursor(undefined);
          setPrevCursors([]);
          setCurrentPageCursor(undefined);
        } else if (hasMore && (allAgents.length > perPage || currentCursor)) {
          setNextCursor(currentCursor);
          setCurrentPageCursor(cursor);
        } else {
          setNextCursor(undefined);
          setCurrentPageCursor(cursor);
        }
        
        setTotalAgentsCount(pageAgents.length);
        setHasFetchedAllAgents(shouldFetchAll);
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
        setInFlightCursor(null);
      }
    },
    [apiClient, repositoryFilter, agentsPerView, inFlightCursor],
  );

  // Initialize lastAgentsPerViewRef
  useEffect(() => {
    if (lastAgentsPerViewRef.current === 0) {
      lastAgentsPerViewRef.current = agentsPerView;
    }
  }, [agentsPerView]);
  
  // Initial load (non-search mode)
  useEffect(() => {
    if (isSearchActive) {
      return;
    }
    loadAgents(undefined, agentsPerView);
    lastAgentsPerViewRef.current = agentsPerView;
  }, [loadAgents, agentsPerView, isSearchActive]);

  // Fetch the full agent list when search is active and not yet hydrated
  useEffect(() => {
    if (!isSearchActive || hasFetchedAllAgents) {
      return;
    }
    loadAgents(undefined, Math.max(agentsPerView, SEARCH_FETCH_SIZE), { fetchAll: true });
  }, [isSearchActive, hasFetchedAllAgents, loadAgents, agentsPerView]);
  
  // Resize-aware pagination: reload current page when agentsPerView changes
  useEffect(() => {
    if (isSearchActive) {
      lastAgentsPerViewRef.current = agentsPerView;
      return;
    }
    
    if (Math.abs(agentsPerView - lastAgentsPerViewRef.current) <= 1) {
      return;
    }
    
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    
    resizeTimeoutRef.current = setTimeout(() => {
      loadAgents(currentPageCursor, agentsPerView);
      
      if (agentsPerView > lastAgentsPerViewRef.current && prevCursors.length > 0) {
        setPrevCursors([]);
      }
      
      lastAgentsPerViewRef.current = agentsPerView;
    }, 300);
    
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [agentsPerView, currentPageCursor, prevCursors, loadAgents, isSearchActive]);
  
  // Clamp selectedIndex when filtered agents list changes
  useEffect(() => {
    if (flattenedAgents.length === 0) return;
    
    if (selectedIndex >= flattenedAgents.length && flattenedAgents.length > 0) {
      setSelectedIndex(Math.max(0, flattenedAgents.length - 1));
    }
  }, [flattenedAgents, selectedIndex]);

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
              setStatusTransitionAgents(prev => {
                const updated = new Set(prev);
                transitionSet.forEach(id => updated.delete(id));
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

  useInput(async (input: string, key: InputKey) => {
    if (isSearchMode) {
      if (key.escape) {
        setIsSearchMode(false);
        return;
      }
      if (key.return) {
        setIsSearchMode(false);
        return;
      }
      if ((key.backspace || key.delete || input === "\u007f") && searchQuery.length > 0) {
        setSearchQuery((prev) => prev.slice(0, -1));
        setSelectedIndex(0);
        setExpandedAgentId(null);
        return;
      }
      if (
        input &&
        input.length === 1 &&
        !key.ctrl &&
        !key.meta
      ) {
        setSearchQuery((prev) => prev + input);
        setSelectedIndex(0);
        setExpandedAgentId(null);
      }
      return;
    }
    
    if (input === "/") {
      setIsSearchMode(true);
      return;
    }
    
    if (key.escape && isSearchActive) {
      setSearchQuery("");
      setIsSearchMode(false);
      setSelectedIndex(0);
      setExpandedAgentId(null);
      return;
    }
    
    if (input === "q") {
      onBack();
    } else if (input === "r") {
      // Refresh
      setExpandedAgentId(null);
      setPrevCursors([]);
      setCurrentPageCursor(undefined);
      if (isSearchActive) {
        loadAgents(undefined, Math.max(agentsPerView, SEARCH_FETCH_SIZE), { fetchAll: true });
      } else {
        loadAgents(undefined, agentsPerView);
      }
      setSelectedIndex(0);
    } else if (input === "1") {
      // Filter by RUNNING
      setStatusFilter("RUNNING");
      setSelectedIndex(0);
      setExpandedAgentId(null);
    } else if (input === "2") {
      // Filter by CREATING
      setStatusFilter("CREATING");
      setSelectedIndex(0);
      setExpandedAgentId(null);
    } else if (input === "3") {
      // Filter by FINISHED
      setStatusFilter("FINISHED");
      setSelectedIndex(0);
      setExpandedAgentId(null);
    } else if (input === "4") {
      // Filter by FAILED
      setStatusFilter("FAILED");
      setSelectedIndex(0);
      setExpandedAgentId(null);
    } else if (input === "5") {
      // Filter by CANCELLED
      setStatusFilter("CANCELLED");
      setSelectedIndex(0);
      setExpandedAgentId(null);
    } else if (input === "a" || input === "A") {
      // Show all statuses
      setStatusFilter(null);
      setSelectedIndex(0);
      setExpandedAgentId(null);
    } else if (input === "g" || input === "G") {
      // Toggle grouping mode
      setGroupByRepository(!groupByRepository);
      setSelectedIndex(0);
      setExpandedAgentId(null);
    } else if (input === "t" || input === "T") {
      // Toggle between PR and Agent URL
      setOpenPrUrl(!openPrUrl);
    } else if (key.leftArrow && prevCursors.length > 0 && !isSearchActive) {
      // Go to previous page
      const newPrevCursors = [...prevCursors];
      const prevCursorToUse = newPrevCursors.pop(); // Get and remove the last cursor
      setPrevCursors(newPrevCursors);
      setExpandedAgentId(null);
      loadAgents(prevCursorToUse, agentsPerView);
      setSelectedIndex(0);
    } else if (key.rightArrow && nextCursor && !isSearchActive) {
      // Go to next page
      // Save current page cursor to prev stack before loading next page
      if (currentPageCursor !== undefined) {
        setPrevCursors((prev) => [...prev, currentPageCursor]);
      }
      setExpandedAgentId(null);
      loadAgents(nextCursor, agentsPerView);
      setSelectedIndex(0);
    } else if ((key.upArrow || input === "k") && selectedIndex > 0) {
      setExpandedAgentId(null); // Collapse when navigating
      setSelectedIndex((prev) => prev - 1);
    } else if (key.downArrow || input === "j") {
      if (selectedIndex < flattenedAgents.length - 1) {
        setExpandedAgentId(null); // Collapse when navigating
        setSelectedIndex((prev) => prev + 1);
      }
    } else if (key.return) {
      const selectedAgent = flattenedAgents[selectedIndex];
      if (!selectedAgent) return;
      
      const now = Date.now();
      const timeSinceLastEnter = now - lastEnterPress;
      
      if (expandedAgentId === selectedAgent.id && timeSinceLastEnter < 500) {
        // Double Enter: Open in browser (PR URL by default, fallback to Agent URL)
        try {
          setOpeningBrowser(selectedAgent.id);
          const urlToOpen = openPrUrl && selectedAgent.target.prUrl 
            ? selectedAgent.target.prUrl 
            : selectedAgent.target.url;
          await openInBrowser(urlToOpen);
          setTimeout(() => setOpeningBrowser(null), 1000);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to open browser");
          setTimeout(() => setOpeningBrowser(null), 2000);
        }
      } else {
        // Single Enter: Toggle expansion and auto-open agent URL
        const isExpanding = expandedAgentId !== selectedAgent.id;
        setExpandedAgentId(expandedAgentId === selectedAgent.id ? null : selectedAgent.id);
        setLastEnterPress(now);
        
        // Auto-open agent URL when expanding
        if (isExpanding) {
          try {
            setOpeningBrowser(selectedAgent.id);
            await openInBrowser(selectedAgent.target.url);
            setTimeout(() => setOpeningBrowser(null), 1000);
          } catch (err) {
            // Silently handle errors to avoid disrupting the UI
            setTimeout(() => setOpeningBrowser(null), 2000);
          }
        }
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

    if (filteredAgents.length === 0) {
      const noAgentMessage = (() => {
        if (isSearchActive && statusFilter) {
          return `No agents match "${trimmedSearchQuery}" with status ${getStatusDisplay(statusFilter).label}.`;
        }
        if (isSearchActive) {
          return `No agents match "${trimmedSearchQuery}".`;
        }
        if (statusFilter) {
          return `No agents found with status: ${getStatusDisplay(statusFilter).label}`;
        }
        return "No agents found yet";
      })();
      
      return (
        <Box padding={1} flexDirection="column">
          <Box marginBottom={1}>
            <Text color="gray">{noAgentMessage}</Text>
          </Box>
          {isSearchActive ? (
            <Box marginBottom={1}>
              <Text color="gray">Press 'Esc' to clear search or keep typing.</Text>
            </Box>
          ) : (
            !statusFilter && (
              <>
                <Box marginBottom={1}>
                  <Text color="gray">To create your first cloud agent, run:</Text>
                </Box>
                <Box marginLeft={2}>
                  <Text color="cyan">cloud-agent launch --plan plan.md</Text>
                </Box>
              </>
            )
          )}
          {statusFilter && !isSearchActive && (
            <Box marginTop={1}>
              <Text color="gray">Press 'a' to show all agents</Text>
            </Box>
          )}
          {!isSearchActive && (
            <Box marginTop={1}>
              <Text color="gray">Press '/' to search</Text>
            </Box>
          )}
          <Box marginTop={1}>
            <Text color="gray">Press 'q' to go back</Text>
          </Box>
        </Box>
      );
    }
  
    const selectedAgent = flattenedAgents[selectedIndex];
    const searchBarVisible = isSearchMode || isSearchActive;
    const searchDisplayText = searchQuery.length > 0 ? searchQuery : "Type to search";
    
    // Calculate pagination range
    const paginationStart = isSearchActive
      ? filteredAgents.length > 0 ? 1 : 0
      : prevCursors.length * agentsPerView + 1;
    const paginationEnd = isSearchActive
      ? filteredAgents.length
      : paginationStart + filteredAgents.length - 1;
    
    const paginationHintParts: string[] = [];
    if (!isSearchActive && prevCursors.length > 0) {
      paginationHintParts.push("← Prev");
    }
    if (!isSearchActive && nextCursor) {
      paginationHintParts.push("→ Next");
    }
    const footerHintParts = [
      ...paginationHintParts,
      "↑↓/jk Navigate",
      "Enter Expand",
      `Enter twice Open ${openPrUrl ? "PR" : "Agent"}`,
      "q Back",
      "r Refresh",
      "Filters 1-5/a",
      "g Group",
      "t PR/Agent",
      "/ Search",
    ];
    if (searchBarVisible) {
      footerHintParts.push("Esc Clear search");
    }
    const footerHintText = footerHintParts.join(" • ");
  
  // Helper function to render an agent item
  const renderAgentItem = (
    agent: Agent,
    globalIndex: number,
    isSelected: boolean,
    isExpanded: boolean,
    isOpening: boolean,
    hasStatusTransition: boolean,
    statusDisplay: ReturnType<typeof getStatusDisplay>
  ) => {
    // Extract org/repo from full URL for compact display
    const compactRepo = agent.source.repository
      .replace(/^https?:\/\/(www\.)?github\.com\//, "")
      .replace(/\.git$/, "");
    
    // Use responsive column widths
    const nameMaxWidth = clampWidth(columnLayout.nameWidth);
    const repoMaxWidth = clampWidth(columnLayout.repoWidth);
    
    // URL truncation: allow wrapping below 60 columns, otherwise truncate
    const urlMaxWidth = terminalWidth >= 60 
      ? clampWidth(terminalWidth - 15)
      : undefined; // undefined allows wrapping
    
    // Status transition indicator
    const transitionIndicator = hasStatusTransition ? " ⚡" : "";
    
    const agentContent = (
      <Box flexDirection="column">
        {/* Main agent row */}
        {columnLayout.stacked ? (
          // Stacked layout for narrow terminals
          <Box flexDirection="column">
            <Box>
              <Text color={isSelected ? "cyan" : statusDisplay.color}>
                {statusDisplay.symbol}{transitionIndicator} {isExpanded ? agent.name : truncate(agent.name, nameMaxWidth)}
              </Text>
            </Box>
            <Box marginTop={0}>
              <Text color={isSelected ? "cyan" : undefined}>
                {isExpanded ? agent.source.repository : truncate(compactRepo, repoMaxWidth)}
              </Text>
            </Box>
          </Box>
        ) : (
          // Side-by-side layout for wider terminals
          <Box flexDirection="row">
            <Box>
              <Text color={isSelected ? "cyan" : statusDisplay.color}>
                {statusDisplay.symbol}{transitionIndicator} {isExpanded ? agent.name : truncate(agent.name, nameMaxWidth)}
              </Text>
            </Box>
            <Box marginLeft={2}>
              <Text color={isSelected ? "cyan" : undefined}>
                {isExpanded ? agent.source.repository : truncate(compactRepo, repoMaxWidth)}
              </Text>
            </Box>
          </Box>
        )}
        
        {/* Preview URL */}
        <Box marginLeft={columnLayout.stacked ? 0 : 3} marginTop={columnLayout.stacked ? 0 : 0}>
          <Text color="cyan" dimColor>
            Preview: {urlMaxWidth ? truncate(agent.target.url, urlMaxWidth) : agent.target.url}
          </Text>
        </Box>
        
        {/* PR URL if available */}
        {agent.target.prUrl && (
          <Box marginLeft={columnLayout.stacked ? 0 : 3} marginTop={0}>
            <Text color="cyan" dimColor>
              PR: {urlMaxWidth ? truncate(agent.target.prUrl, clampWidth(terminalWidth - 8)) : agent.target.prUrl}
            </Text>
          </Box>
        )}
        
        {/* Expanded details */}
        {isExpanded && (
          <Box marginLeft={columnLayout.stacked ? 0 : 2} marginTop={1} flexDirection="column">
            <Box marginTop={0} marginBottom={1}>
              <Text color="gray">{getSeparator(Math.max(20, separatorWidth - 8))}</Text>
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
                  <Text>{getRelativeTime(agent.createdAt)}</Text>
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
    
    const indicatorSymbol = isSelected ? ">" : " ";
    const indicatorColor = isSelected ? "cyan" : "gray";
    const indicatorBox = (
      <Box marginRight={1}>
        <Text color={indicatorColor}>{indicatorSymbol}</Text>
      </Box>
    );
    
    return (
      <Box key={agent.id} marginTop={0} marginBottom={0}>
        <Box
          flexDirection="row"
          alignItems="flex-start"
          marginLeft={columnLayout.stacked ? 0 : 2}
        >
          {indicatorBox}
          <Box flexDirection="column" paddingY={isExpanded ? 1 : 0}>
            {agentContent}
          </Box>
        </Box>
      </Box>
    );
  };
  
  return (
    <Box flexDirection="column" padding={layoutBreakpoint === "compact" ? 0 : 1} width={terminalWidth}>
      <Box marginBottom={1} flexDirection="row" alignItems="center">
        <Text bold>
          Your Cloud Agents
          {filteredAgents.length > 0 && (
            <Text color="gray"> ({filteredAgents.length} {filteredAgents.length === 1 ? 'agent' : 'agents'})</Text>
          )}
          {statusFilter && (
            <Text color="cyan"> • Filter: {getStatusDisplay(statusFilter).label}</Text>
          )}
          {repositoryFilter && (
            <Text color="gray"> • {repositoryFilter}</Text>
          )}
          {groupByRepository && (
            <Text color="cyan"> • Grouped by repository</Text>
          )}
        </Text>
        {loading && filteredAgents.length > 0 && (
          <Box marginLeft={2}>
            <Spinner text="Refreshing..." />
          </Box>
        )}
        </Box>
        <Box marginBottom={1}>
          <Text color="gray">{getSeparator(separatorWidth)}</Text>
        </Box>
        {searchBarVisible && (
          <Box marginBottom={1} flexDirection="row">
            <Text color="gray">/ Search: </Text>
            <Text color={isSearchMode ? "cyan" : "gray"}>
              {searchDisplayText}
              {isSearchMode ? "▌" : ""}
            </Text>
          </Box>
        )}

      {/* Grouped sections */}
      {groupByRepository ? (
        // Repository grouping
        Array.from(groupedAgents.entries()).map(([repo, repoAgents]) => {
          if (repoAgents.length === 0) return null;
          
          return (
            <Box key={repo} marginBottom={1} flexDirection="column">
              {/* Section header */}
              <Box marginBottom={0}>
                <Text color="gray">┌─ </Text>
                <Text color="cyan" bold>{repo} ({repoAgents.length})</Text>
                <Text color="gray"> {getSeparator(Math.max(1, separatorWidth - repo.length - repoAgents.length.toString().length - 7))}┐</Text>
              </Box>
              
              {/* Agents in this repository group */}
              {repoAgents.map((agent) => {
                const globalIndex = flattenedAgents.indexOf(agent);
                const isSelected = globalIndex === selectedIndex;
                const isExpanded = expandedAgentId === agent.id;
                const isOpening = openingBrowser === agent.id;
                const hasStatusTransition = statusTransitionAgents.has(agent.id);
                const statusDisplay = getStatusDisplay(agent.status);
                
                return renderAgentItem(agent, globalIndex, isSelected, isExpanded, isOpening, hasStatusTransition, statusDisplay);
              })}
              
              {/* Section footer */}
              <Box marginTop={0}>
                <Text color="gray">└{getSeparator(Math.max(3, separatorWidth - 2))}┘</Text>
              </Box>
            </Box>
          );
        })
      ) : (
        // Status grouping
        (() => {
          return statusDisplayOrder.map((status) => {
            const groupAgents = groupedAgents.get(status) || [];
            if (groupAgents.length === 0) return null;
            
            const statusDisplay = getStatusDisplay(status);
            const sectionTitle = `${statusDisplay.symbol} ${statusDisplay.label} (${groupAgents.length})`;
            
            return (
              <Box key={status} marginBottom={1} flexDirection="column">
                {/* Section header */}
                <Box marginBottom={0}>
                  <Text color="gray">┌─ </Text>
                  <Text color={statusDisplay.color} bold>{sectionTitle}</Text>
                  <Text color="gray"> {getSeparator(Math.max(1, separatorWidth - sectionTitle.length - 5))}┐</Text>
                </Box>
                
                {/* Agents in this status group */}
                {groupAgents.map((agent) => {
                  const globalIndex = flattenedAgents.indexOf(agent);
                  const isSelected = globalIndex === selectedIndex;
                  const isExpanded = expandedAgentId === agent.id;
                  const isOpening = openingBrowser === agent.id;
                  const hasStatusTransition = statusTransitionAgents.has(agent.id);
                  
                  return renderAgentItem(agent, globalIndex, isSelected, isExpanded, isOpening, hasStatusTransition, statusDisplay);
                })}
                
                {/* Section footer */}
                <Box marginTop={0}>
                  <Text color="gray">└{getSeparator(Math.max(3, separatorWidth - 2))}┘</Text>
                </Box>
              </Box>
            );
          });
        })()
      )}

      {/* Footer */}
      <Box marginTop={2} flexDirection="column">
        <Box marginBottom={1}>
          <Text color="gray" dimColor>
            {(() => {
              if (filteredAgents.length === 0) {
                return `No agents • ${getLayoutLabel(layoutBreakpoint)}`;
              }
              if (isSearchActive) {
                return `Showing ${filteredAgents.length} ${filteredAgents.length === 1 ? "result" : "results"} • Search`;
              }
              return `Showing ${paginationStart}-${paginationEnd} of ${filteredAgents.length} ${filteredAgents.length === 1 ? "agent" : "agents"} • ${getLayoutLabel(layoutBreakpoint)}`;
            })()}
          </Text>
        </Box>
        <Box>
          <Text color="gray" dimColor>{footerHintText}</Text>
        </Box>
      </Box>
    </Box>
  );
}

