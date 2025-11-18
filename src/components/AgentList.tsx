/**
 * AgentList component
 * Displays a list of agents in a table format
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Text, useInput, useStdout, useStdoutDimensions } from "ink";
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

const STATUS_ORDER = ["RUNNING", "CREATING", "FINISHED", "FAILED", "CANCELLED"] as const;
type StatusKey = (typeof STATUS_ORDER)[number];

function groupAgentsByStatus(agents: Agent[]): Map<StatusKey | string, Agent[]> {
  const groups = new Map<string, Agent[]>();

  STATUS_ORDER.forEach((status) => {
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

type LayoutMode = "wide" | "standard" | "compact";

interface TerminalSize {
  width: number;
  height: number;
}

const clampWidth = (value: number, floor = 8) => Math.max(floor, Math.floor(value));

const buildSeparator = (width: number) => "─".repeat(Math.max(5, Math.floor(width)));

const getLayoutMode = (width: number): LayoutMode => {
  if (width >= 100) return "wide";
  if (width >= 70) return "standard";
  return "compact";
};


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
  const { stdout } = useStdout();
  const [stdoutWidth, stdoutHeight] = useStdoutDimensions();

  const sizeFromSources = useCallback((): TerminalSize => {
    return {
      width: stdoutWidth ?? stdout?.columns ?? process.stdout?.columns ?? 80,
      height: stdoutHeight ?? stdout?.rows ?? process.stdout?.rows ?? 24,
    };
  }, [stdoutWidth, stdoutHeight, stdout]);

  const [terminalSize, setTerminalSize] = useState<TerminalSize>(() => sizeFromSources());

  useEffect(() => {
    setTerminalSize(sizeFromSources());
  }, [sizeFromSources]);

  useEffect(() => {
    if (!stdout) return;

    let resizeTimeout: NodeJS.Timeout | null = null;
    const handleResize = () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeTimeout = setTimeout(() => {
        setTerminalSize((prev) => ({
          width: stdout.columns ?? prev.width,
          height: stdout.rows ?? prev.height,
        }));
      }, 120);
    };

    stdout.on("resize", handleResize);

    return () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      stdout.off("resize", handleResize);
    };
  }, [stdout]);

  const terminalWidth = terminalSize.width ?? 80;
  const terminalHeight = terminalSize.height ?? 24;

  const layoutMetrics = useMemo(() => {
    const headerHeight = 4;
    const footerHeight = 4;
    const paddingHeight = 2;
    const rowEstimate = 3;
    const availableHeight = Math.max(5, terminalHeight - headerHeight - footerHeight - paddingHeight);
    const agentsPerView = Math.max(3, Math.floor(availableHeight / rowEstimate));
    const layoutMode = getLayoutMode(terminalWidth);
    const chromePadding = layoutMode === "wide" ? 10 : layoutMode === "standard" ? 8 : 4;
    const availableContentWidth = Math.max(15, terminalWidth - chromePadding);
    const nameRatio = layoutMode === "wide" ? 0.45 : layoutMode === "standard" ? 0.6 : 1;
    const repoRatio = layoutMode === "wide" ? 0.35 : layoutMode === "standard" ? 0.4 : 1;

    const nameMaxWidth = clampWidth(availableContentWidth * nameRatio);
    const repoMaxWidth = clampWidth(availableContentWidth * repoRatio);
    const selectionBoxWidth = terminalWidth - (layoutMode === "compact" ? 2 : 6);

    return {
      availableHeight,
      agentsPerView,
      layoutMode,
      availableContentWidth,
      nameMaxWidth,
      repoMaxWidth,
      selectionBoxWidth,
    };
  }, [terminalWidth, terminalHeight]);

  const { agentsPerView, layoutMode, availableContentWidth, nameMaxWidth, repoMaxWidth, selectionBoxWidth } = layoutMetrics;
  const shouldStackMetadata = layoutMode === "compact";
  const shouldWrapUrls = terminalWidth < 60;
  const layoutLabel = layoutMode === "wide" ? "Wide layout" : layoutMode === "standard" ? "Standard layout" : "Compact layout";
  const selectionBoxWidthProp = selectionBoxWidth >= 10 ? selectionBoxWidth : undefined;

  const currentCursorRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    currentCursorRef.current = currentPageCursor;
  }, [currentPageCursor]);

  const prevAgentsPerViewRef = useRef(agentsPerView);
  useEffect(() => {
    if (agentsPerView > prevAgentsPerViewRef.current) {
      setPrevCursors([]);
    }
    prevAgentsPerViewRef.current = agentsPerView;
  }, [agentsPerView]);

  const inFlightRequestRef = useRef<symbol | null>(null);

  const loadAgents = useCallback(async (cursor?: string, perPage = agentsPerView) => {
    const requestToken = Symbol("agentsRequest");
    inFlightRequestRef.current = requestToken;
    setLoading(true);
    setError(null);

    try {
      let allAgents: Agent[] = [];
      let currentCursor = cursor;
      let hasMore = true;
      const fetchSize = Math.max(perPage, Math.ceil(perPage * 1.5));

      while (allAgents.length < perPage && hasMore) {
        const response = await apiClient.listAgents(fetchSize, currentCursor);

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

        if (allAgents.length >= perPage || !hasMore) {
          break;
        }
      }

      const pageAgents = allAgents.slice(0, perPage);

      if (inFlightRequestRef.current !== requestToken) {
        return;
      }

      setAgents(pageAgents);

      if (hasMore && (allAgents.length > perPage || currentCursor)) {
        setNextCursor(currentCursor);
      } else {
        setNextCursor(undefined);
      }

      setCurrentPageCursor(cursor);
    } catch (err) {
      if (inFlightRequestRef.current !== requestToken) {
        return;
      }

      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load agents");
      }
    } finally {
      if (inFlightRequestRef.current === requestToken) {
        setLoading(false);
      }
    }
  }, [apiClient, repositoryFilter, agentsPerView]);

  useEffect(() => {
    loadAgents(currentCursorRef.current, agentsPerView);
  }, [loadAgents, agentsPerView]);

  const statusGroups = useMemo(() => groupAgentsByStatus(agents), [agents]);

  const flattenedAgents = useMemo(() => {
    const flattened: Agent[] = [];
    STATUS_ORDER.forEach((status) => {
      const groupAgents = statusGroups.get(status) || [];
      flattened.push(...groupAgents);
    });
    return flattened;
  }, [statusGroups]);

  const flattenedAgentsLength = flattenedAgents.length;
  const flattenedIndexMap = useMemo(() => {
    const indexMap = new Map<string, number>();
    flattenedAgents.forEach((agent, index) => {
      indexMap.set(agent.id, index);
    });
    return indexMap;
  }, [flattenedAgents]);

  useEffect(() => {
    setSelectedIndex((prev) => {
      if (flattenedAgentsLength === 0) {
        return 0;
      }
      return Math.min(prev, flattenedAgentsLength - 1);
    });
  }, [flattenedAgentsLength]);

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
      const newPrevCursors = [...prevCursors];
      const prevCursorToUse = newPrevCursors.pop();
      setPrevCursors(newPrevCursors);
      setExpandedAgentId(null);
      loadAgents(prevCursorToUse, agentsPerView);
      setSelectedIndex(0);
    } else if (key.rightArrow && nextCursor) {
      if (currentPageCursor !== undefined) {
        setPrevCursors((prev) => [...prev, currentPageCursor]);
      }
      setExpandedAgentId(null);
      loadAgents(nextCursor, agentsPerView);
      setSelectedIndex(0);
    } else if (key.upArrow && selectedIndex > 0) {
      setExpandedAgentId(null);
      setSelectedIndex((prev) => prev - 1);
    } else if (key.downArrow && selectedIndex < flattenedAgentsLength - 1) {
      setExpandedAgentId(null);
      setSelectedIndex((prev) => prev + 1);
    } else if (key.return) {
      const selectedAgent = flattenedAgents[selectedIndex];
      if (!selectedAgent) return;

      const now = Date.now();
      const timeSinceLastEnter = now - lastEnterPress;

      if (expandedAgentId === selectedAgent.id && timeSinceLastEnter < 500) {
        try {
          setOpeningBrowser(selectedAgent.id);
          await openInBrowser(selectedAgent.target.url);
          setTimeout(() => setOpeningBrowser(null), 1000);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to open browser");
          setTimeout(() => setOpeningBrowser(null), 2000);
        }
      } else {
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

  const separatorWidth = availableContentWidth;
  const nestedSeparatorWidth = Math.max(availableContentWidth - 8, 8);
  const rootWidth = terminalWidth >= 10 ? terminalWidth : undefined;
  const baseItemIndent = shouldStackMetadata ? 0 : 2;
  const nestedMarginLeft = shouldStackMetadata ? 0 : 3;
  const selectionPaddingX = shouldStackMetadata ? 0 : 1;
  const previewMaxWidth = clampWidth(terminalWidth - 15);
  const prMaxWidth = clampWidth(terminalWidth - 8);

  return (
    <Box flexDirection="column" padding={1} width={rootWidth}>
      <Box marginBottom={1} flexDirection="row" alignItems="center" flexWrap="wrap">
        <Text bold>
          Your Cloud Agents
          {agents.length > 0 && (
            <Text color="gray"> ({agents.length} {agents.length === 1 ? "agent" : "agents"})</Text>
          )}
          {repositoryFilter && <Text color="gray"> • {repositoryFilter}</Text>}
        </Text>
        {loading && agents.length > 0 && (
          <Box marginLeft={2}>
            <Spinner text="Refreshing..." />
          </Box>
        )}
      </Box>
      <Box marginBottom={1}>
        <Text color="gray">{buildSeparator(separatorWidth)}</Text>
      </Box>

      {STATUS_ORDER.map((status) => {
        const groupAgents = statusGroups.get(status) || [];
        if (groupAgents.length === 0) return null;

        const statusDisplay = getStatusDisplay(status);
        const sectionTitle = `${statusDisplay.symbol} ${statusDisplay.label} (${groupAgents.length})`;
        const headerTailWidth = separatorWidth - sectionTitle.length - 5;

        return (
          <Box key={status} marginBottom={1} flexDirection="column">
            <Box marginBottom={0} flexDirection="row" alignItems="center">
              <Text color="gray">┌─ </Text>
              <Text color={statusDisplay.color} bold>{sectionTitle}</Text>
              <Text color="gray"> {buildSeparator(headerTailWidth)}┐</Text>
            </Box>

            {groupAgents.map((agent) => {
              const globalIndex = flattenedIndexMap.get(agent.id) ?? -1;
              const isSelected = globalIndex === selectedIndex;
              const isExpanded = expandedAgentId === agent.id;
              const isOpening = openingBrowser === agent.id;

              const compactRepo = agent.source.repository
                .replace(/^https?:\/\/(www\.)?github\.com\//, "")
                .replace(/\.git$/, "");

              const displayName = isExpanded ? agent.name : truncate(agent.name, nameMaxWidth);
              const displayRepo =
                isExpanded || shouldStackMetadata ? agent.source.repository : truncate(compactRepo, repoMaxWidth);

              const previewValue = !shouldWrapUrls && !isExpanded ? truncate(agent.target.url, previewMaxWidth) : agent.target.url;
              const prValue = agent.target.prUrl
                ? !shouldWrapUrls && !isExpanded
                  ? truncate(agent.target.prUrl, prMaxWidth)
                  : agent.target.prUrl
                : null;

              const agentContent = (
                <Box flexDirection="column">
                  <Box flexDirection={shouldStackMetadata ? "column" : "row"}>
                    <Box>
                      <Text color={isSelected ? "cyan" : statusDisplay.color}>
                        {statusDisplay.symbol} {displayName}
                      </Text>
                    </Box>
                    {!shouldStackMetadata && (
                      <Box marginLeft={2}>
                        <Text color={isSelected ? "cyan" : undefined}>{displayRepo}</Text>
                      </Box>
                    )}
                  </Box>
                  {shouldStackMetadata && (
                    <Box marginTop={0}>
                      <Text color={isSelected ? "cyan" : undefined}>{displayRepo}</Text>
                    </Box>
                  )}
                  <Box marginLeft={nestedMarginLeft}>
                    <Text color="cyan" dimColor>
                      Preview: {previewValue}
                    </Text>
                  </Box>
                  {prValue && (
                    <Box marginLeft={nestedMarginLeft}>
                      <Text color="cyan" dimColor>
                        PR: {prValue}
                      </Text>
                    </Box>
                  )}
                  {isExpanded && (
                    <Box marginLeft={shouldStackMetadata ? 0 : 2} marginTop={1} flexDirection="column">
                      <Box marginBottom={1}>
                        <Text color="gray">{buildSeparator(nestedSeparatorWidth)}</Text>
                      </Box>
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
                      {isOpening && (
                        <Box marginTop={1}>
                          <Text color="cyan">Opening in browser...</Text>
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>
              );

              if (isSelected) {
                return (
                  <Box key={agent.id} marginTop={0} marginBottom={0}>
                    <Box
                      borderStyle="round"
                      borderColor="cyan"
                      paddingX={selectionPaddingX}
                      paddingY={isExpanded ? 1 : 0}
                      width={selectionBoxWidthProp}
                    >
                      {agentContent}
                    </Box>
                  </Box>
                );
              }

              return (
                <Box key={agent.id} marginTop={0} marginBottom={0} marginLeft={baseItemIndent}>
                  {agentContent}
                </Box>
              );
            })}

            <Box marginTop={0}>
              <Text color="gray">└{buildSeparator(separatorWidth - 2)}┘</Text>
            </Box>
          </Box>
        );
      })}

      <Box marginTop={2} flexDirection="column">
        <Box marginBottom={1}>
          <Text color="gray" dimColor>
            Page {prevCursors.length + 1} • Showing {agents.length} {agents.length === 1 ? "agent" : "agents"} • {layoutLabel}
          </Text>
        </Box>
        <Box marginBottom={1} flexDirection="row" gap={2}>
          {prevCursors.length > 0 && <Text color="gray" dimColor>← Previous</Text>}
          {nextCursor && <Text color="gray" dimColor>→ Next</Text>}
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

