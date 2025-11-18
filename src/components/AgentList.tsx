/**
 * AgentList component
 *
 * Main component for displaying a list of cloud agents with filtering,
 * grouping, pagination, and interactive navigation. This component
 * orchestrates all the sub-components and hooks to provide a complete
 * agent list interface.
 *
 * @module components/AgentList
 */

import React, { useEffect, useState, useMemo, useRef } from "react";
import { Box, Text } from "ink";
import { CloudAgentsApiClient } from "../api/client.js";
import { Spinner } from "./Spinner.js";
import { useTerminalDimensions } from "../hooks/useTerminalDimensions.js";
import { useAgentList } from "../hooks/useAgentList.js";
import { useAgentListInput } from "../hooks/useAgentListInput.js";
import {
  filterAgentsByStatus,
  flattenGroupedAgents,
} from "../utils/agentFiltering.js";
import {
  groupAgentsByStatus,
  groupAgentsByRepository,
  getStatusDisplayOrder,
} from "../utils/grouping.js";
import {
  calculateLayoutMetrics,
  calculateColumnLayout,
} from "../utils/layout.js";
import { AgentListHeader } from "./AgentList/AgentListHeader.js";
import { AgentListFooter } from "./AgentList/AgentListFooter.js";
import { EmptyState } from "./AgentList/EmptyState.js";
import { AgentGroup } from "./AgentList/AgentGroup.js";

interface AgentListProps {
  apiClient: CloudAgentsApiClient;
  onBack: () => void;
  repositoryFilter?: string;
  onSelectAgentForConversation?: (agentId: string) => void;
}

/**
 * Component for displaying and managing a list of cloud agents.
 *
 * Features:
 * - Real-time terminal resize handling
 * - Responsive layout (wide/medium/compact)
 * - Status and repository filtering
 * - Grouping by status or repository
 * - Pagination with cursor-based navigation
 * - Status polling for active agents
 * - Keyboard navigation and shortcuts
 * - Agent expansion for detailed view
 * - Browser opening (PR or agent URL)
 *
 * @param props - Component props
 * @returns Agent list UI
 *
 * @example
 * ```tsx
 * <AgentList
 *   apiClient={apiClient}
 *   onBack={() => navigateBack()}
 *   repositoryFilter="github.com/user/repo"
 * />
 * ```
 */
export function AgentList({
  apiClient,
  onBack,
  repositoryFilter,
  onSelectAgentForConversation,
}: AgentListProps) {
  const { terminalWidth, terminalHeight } = useTerminalDimensions();

  const layoutMetrics = useMemo(
    () => calculateLayoutMetrics(terminalWidth, terminalHeight),
    [terminalWidth, terminalHeight]
  );

  const columnLayout = useMemo(
    () =>
      calculateColumnLayout(
        layoutMetrics.availableContentWidth,
        layoutMetrics.breakpoint
      ),
    [layoutMetrics.availableContentWidth, layoutMetrics.breakpoint]
  );

  const {
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
  } = useAgentList({
    apiClient,
    repositoryFilter,
    agentsPerView: layoutMetrics.agentsPerView,
  });

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);
  const [lastEnterPress, setLastEnterPress] = useState<number>(0);
  const [openingBrowser, setOpeningBrowser] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAgentsPerViewRef = useRef<number>(0);

  useEffect(() => {
    if (lastAgentsPerViewRef.current === 0) {
      lastAgentsPerViewRef.current = layoutMetrics.agentsPerView;
    }
  }, [layoutMetrics.agentsPerView]);

  // Resize-aware pagination: reload current page when agentsPerView changes
  useEffect(() => {
    // Skip if this is the initial load or if agentsPerView hasn't changed materially
    if (
      Math.abs(layoutMetrics.agentsPerView - lastAgentsPerViewRef.current) <= 1
    ) {
      return;
    }

    // Debounce resize events to avoid spamming API while user drags window
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }

    resizeTimeoutRef.current = setTimeout(() => {
      // Reload current page with new page size
      loadAgents(currentPageCursor, layoutMetrics.agentsPerView);

      // Clear prevCursors if new page size is larger than cached pages can satisfy
      if (
        layoutMetrics.agentsPerView > lastAgentsPerViewRef.current &&
        prevCursors.length > 0
      ) {
        setPrevCursors([]);
      }

      lastAgentsPerViewRef.current = layoutMetrics.agentsPerView;
    }, 300); // 300ms debounce

    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [layoutMetrics.agentsPerView, currentPageCursor, loadAgents]);

  const filteredAgents = useMemo(
    () => filterAgentsByStatus(agents, statusFilter),
    [agents, statusFilter]
  );

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

  const flattenedAgents = useMemo(
    () =>
      flattenGroupedAgents(
        groupedAgents,
        groupByRepository,
        statusDisplayOrder
      ),
    [groupedAgents, groupByRepository, statusDisplayOrder]
  );

  // Clamp selectedIndex when filtered agents list changes
  useEffect(() => {
    if (flattenedAgents.length === 0) return;

    if (selectedIndex >= flattenedAgents.length && flattenedAgents.length > 0) {
      setSelectedIndex(Math.max(0, flattenedAgents.length - 1));
    }
  }, [flattenedAgents, selectedIndex]);

  // Input handling
  useAgentListInput(
    {
      onBack,
      onRefresh: () => {
        setExpandedAgentId(null);
        setPrevCursors([]);
        setCurrentPageCursor(undefined);
        refreshAgents();
      },
      setStatusFilter,
      toggleGrouping: () => setGroupByRepository(!groupByRepository),
      toggleOpenPrUrl: () => setOpenPrUrl(!openPrUrl),
      onPreviousPage: () => {
        if (prevCursors.length > 0) {
          const newPrevCursors = [...prevCursors];
          const prevCursorToUse = newPrevCursors.pop();
          setPrevCursors(newPrevCursors);
          setExpandedAgentId(null);
          loadAgents(prevCursorToUse, layoutMetrics.agentsPerView);
        }
      },
      onNextPage: () => {
        if (nextCursor) {
          // Save current page cursor to prev stack before loading next page
          if (currentPageCursor !== undefined) {
            setPrevCursors([...prevCursors, currentPageCursor]);
          }
          setExpandedAgentId(null);
          loadAgents(nextCursor, layoutMetrics.agentsPerView);
        }
      },
      onMoveUp: () => setSelectedIndex((prev) => prev - 1),
      onMoveDown: () => setSelectedIndex((prev) => prev + 1),
      onEnter: async (selectedAgent) => {
        if (!selectedAgent) return;
        const now = Date.now();
        const timeSinceLastEnter = now - lastEnterPress;
        if (expandedAgentId === selectedAgent.id && timeSinceLastEnter < 500) {
          // Double Enter handled in useAgentListInput
          return;
        } else {
          // Single Enter: Toggle expansion
          setExpandedAgentId(
            expandedAgentId === selectedAgent.id ? null : selectedAgent.id
          );
          setLastEnterPress(now);
        }
      },
      setExpandedAgentId,
      setSelectedIndex,
      setOpeningBrowser,
      setError: setErrorMessage,
      onViewConversation: onSelectAgentForConversation
        ? (agent) => {
            if (agent) {
              onSelectAgentForConversation(agent.id);
            }
          }
        : undefined,
    },
    {
      selectedIndex,
      expandedAgentId,
      lastEnterPress,
      openPrUrl,
      flattenedAgents,
      hasPreviousPage: prevCursors.length > 0,
      hasNextPage: !!nextCursor,
    }
  );

  if (loading && agents.length === 0) {
    return (
      <Box padding={1}>
        <Spinner text="Loading your agents..." />
      </Box>
    );
  }

  if (error || errorMessage) {
    return (
      <Box padding={1} flexDirection="column">
        <Box>
          <Box>
            <Text color="red">✗ Error: {error || errorMessage}</Text>
          </Box>
          <Box marginTop={1}>
            <Text color="gray">Press 'q' to go back or 'r' to try again</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  if (filteredAgents.length === 0) {
    return <EmptyState statusFilter={statusFilter} />;
  }

  const paginationStart = prevCursors.length * layoutMetrics.agentsPerView + 1;
  const paginationEnd = paginationStart + filteredAgents.length - 1;

  const renderGroups = () => {
    if (groupByRepository) {
      // Repository grouping
      return Array.from(groupedAgents.entries()).map(([repo, repoAgents]) => (
        <AgentGroup
          key={repo}
          groupKey={repo}
          agents={repoAgents}
          groupByRepository={true}
          flattenedAgents={flattenedAgents}
          selectedIndex={selectedIndex}
          expandedAgentId={expandedAgentId}
          openingBrowser={openingBrowser}
          statusTransitionAgents={statusTransitionAgents}
          columnLayout={columnLayout}
          terminalWidth={terminalWidth}
          separatorWidth={layoutMetrics.separatorWidth}
        />
      ));
    } else {
      // Status grouping
      return statusDisplayOrder.map((status) => {
        const groupAgents = groupedAgents.get(status) || [];
        if (groupAgents.length === 0) return null;

        return (
          <AgentGroup
            key={status}
            groupKey={status}
            agents={groupAgents}
            groupByRepository={false}
            flattenedAgents={flattenedAgents}
            selectedIndex={selectedIndex}
            expandedAgentId={expandedAgentId}
            openingBrowser={openingBrowser}
            statusTransitionAgents={statusTransitionAgents}
            columnLayout={columnLayout}
            terminalWidth={terminalWidth}
            separatorWidth={layoutMetrics.separatorWidth}
          />
        );
      });
    }
  };

  return (
    <Box
      flexDirection="column"
      padding={layoutMetrics.breakpoint === "compact" ? 0 : 1}
      width={terminalWidth}
    >
      <AgentListHeader
        agentCount={filteredAgents.length}
        statusFilter={statusFilter}
        repositoryFilter={repositoryFilter}
        groupByRepository={groupByRepository}
        loading={loading}
        separatorWidth={layoutMetrics.separatorWidth}
      />

      {renderGroups()}

      <AgentListFooter
        agentCount={filteredAgents.length}
        paginationStart={paginationStart}
        paginationEnd={paginationEnd}
        hasPreviousPage={prevCursors.length > 0}
        hasNextPage={!!nextCursor}
        layoutBreakpoint={layoutMetrics.breakpoint}
        openPrUrl={openPrUrl}
        showConversationHint={!!onSelectAgentForConversation}
      />
    </Box>
  );
}
