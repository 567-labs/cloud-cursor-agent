/**
 * Agent list input handling hook
 *
 * Handles all keyboard input for the agent list component, including navigation,
 * filtering, grouping, pagination, and agent actions. This hook centralizes
 * all input handling logic for better maintainability.
 *
 * @module hooks/useAgentListInput
 */

import { useInput } from "ink";
import type { Agent, AgentStatus } from "../api/schemas.js";
import { openInBrowser } from "../utils/browser.js";

/**
 * Input key type from Ink's useInput hook.
 */
export type InputKey = {
  upArrow?: boolean;
  downArrow?: boolean;
  leftArrow?: boolean;
  rightArrow?: boolean;
  return?: boolean;
};

/**
 * Handlers for agent list input actions.
 */
export interface AgentListInputHandlers {
  /** Navigate back */
  onBack: () => void;
  /** Refresh the agent list */
  onRefresh: () => void;
  /** Set status filter */
  setStatusFilter: (filter: AgentStatus | null) => void;
  /** Toggle grouping mode */
  toggleGrouping: () => void;
  /** Toggle PR/Agent URL preference */
  toggleOpenPrUrl: () => void;
  /** Navigate to previous page */
  onPreviousPage: () => void;
  /** Navigate to next page */
  onNextPage: () => void;
  /** Move selection up */
  onMoveUp: () => void;
  /** Move selection down */
  onMoveDown: () => void;
  /** Handle Enter key (expand/collapse or open browser) */
  onEnter: (selectedAgent: Agent | undefined) => Promise<void>;
  /** Set expanded agent ID */
  setExpandedAgentId: (id: string | null) => void;
  /** Set selected index */
  setSelectedIndex: (index: number) => void;
  /** Set opening browser state */
  setOpeningBrowser: (id: string | null) => void;
  /** Set error message */
  setError: (error: string | null) => void;
  /** Handle conversation view request */
  onViewConversation?: (selectedAgent: Agent | undefined) => void;
}

/**
 * State values needed for input handling.
 */
export interface AgentListInputState {
  /** Current selected index */
  selectedIndex: number;
  /** Currently expanded agent ID */
  expandedAgentId: string | null;
  /** Last Enter key press timestamp */
  lastEnterPress: number;
  /** Whether to open PR URL */
  openPrUrl: boolean;
  /** Flattened array of agents for selection */
  flattenedAgents: Agent[];
  /** Whether previous page is available */
  hasPreviousPage: boolean;
  /** Whether next page is available */
  hasNextPage: boolean;
}

/**
 * Hook for handling keyboard input in agent list.
 *
 * Handles:
 * - Navigation (arrow keys, j/k)
 * - Filtering (1-5, a)
 * - Grouping toggle (g)
 * - URL preference toggle (t)
 * - Pagination (left/right arrows)
 * - Expansion/collapse (Enter)
 * - Browser opening (double Enter)
 *
 * @param handlers - Action handlers
 * @param state - Current state values
 *
 * @example
 * ```tsx
 * function AgentList() {
 *   const handlers = {
 *     onBack: () => navigateBack(),
 *     onRefresh: () => refresh(),
 *     // ... other handlers
 *   };
 *
 *   const state = {
 *     selectedIndex: 0,
 *     expandedAgentId: null,
 *     // ... other state
 *   };
 *
 *   useAgentListInput(handlers, state);
 *
 *   // Component renders...
 * }
 * ```
 */
export function useAgentListInput(
  handlers: AgentListInputHandlers,
  state: AgentListInputState
): void {
  const {
    onBack,
    onRefresh,
    setStatusFilter,
    toggleGrouping,
    toggleOpenPrUrl,
    onPreviousPage,
    onNextPage,
    onMoveUp,
    onMoveDown,
    onEnter,
    setExpandedAgentId,
    setSelectedIndex,
    setOpeningBrowser,
    setError,
    onViewConversation,
  } = handlers;

  const {
    selectedIndex,
    expandedAgentId,
    lastEnterPress,
    openPrUrl,
    flattenedAgents,
    hasPreviousPage,
    hasNextPage,
  } = state;

  useInput(async (input: string, key: InputKey) => {
    if (input === "q") {
      onBack();
    } else if (input === "r") {
      setExpandedAgentId(null);
      onRefresh();
      setSelectedIndex(0);
    } else if (input === "1") {
      setStatusFilter("RUNNING");
      setSelectedIndex(0);
      setExpandedAgentId(null);
    } else if (input === "2") {
      setStatusFilter("CREATING");
      setSelectedIndex(0);
      setExpandedAgentId(null);
    } else if (input === "3") {
      setStatusFilter("FINISHED");
      setSelectedIndex(0);
      setExpandedAgentId(null);
    } else if (input === "4") {
      setStatusFilter("FAILED");
      setSelectedIndex(0);
      setExpandedAgentId(null);
    } else if (input === "5") {
      setStatusFilter("CANCELLED");
      setSelectedIndex(0);
      setExpandedAgentId(null);
    } else if (input === "a" || input === "A") {
      setStatusFilter(null);
      setSelectedIndex(0);
      setExpandedAgentId(null);
    } else if (input === "g" || input === "G") {
      toggleGrouping();
      setSelectedIndex(0);
      setExpandedAgentId(null);
    } else if (input === "t" || input === "T") {
      toggleOpenPrUrl();
    } else if (input === "c" || input === "C") {
      // View conversation for selected agent
      if (onViewConversation) {
        const selectedAgent = flattenedAgents[selectedIndex];
        onViewConversation(selectedAgent);
      }
    } else if (key.leftArrow && hasPreviousPage) {
      // Go to previous page
      setExpandedAgentId(null);
      onPreviousPage();
      setSelectedIndex(0);
    } else if (key.rightArrow && hasNextPage) {
      // Go to next page
      setExpandedAgentId(null);
      onNextPage();
      setSelectedIndex(0);
    } else if ((key.upArrow || input === "k") && selectedIndex > 0) {
      setExpandedAgentId(null); // Collapse when navigating
      onMoveUp();
    } else if (key.downArrow || input === "j") {
      if (selectedIndex < flattenedAgents.length - 1) {
        setExpandedAgentId(null); // Collapse when navigating
        onMoveDown();
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
          const urlToOpen =
            openPrUrl && selectedAgent.target.prUrl
              ? selectedAgent.target.prUrl
              : selectedAgent.target.url;
          await openInBrowser(urlToOpen);
          setTimeout(() => setOpeningBrowser(null), 1000);
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Failed to open browser"
          );
          setTimeout(() => setOpeningBrowser(null), 2000);
        }
      } else {
        // Single Enter: Toggle expansion (show/hide status details)
        await onEnter(selectedAgent);
      }
    }
  });
}
