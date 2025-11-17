# Dynamic Size Screen Plan

## Overview

Improve the `AgentList` Ink view so it reacts smoothly to terminal resizes, adapts its layout to both narrow and wide panes, and keeps pagination logic stable when the number of visible rows changes. This plan leans on existing Ink APIs (`useStdout`, `useStdoutDimensions`) and keeps the UX readable at a 80-column baseline while avoiding breakage down to ~50 columns.

---

## Phase 1: Real-Time Terminal Dimensions

**Goal:** Track live terminal width and height to drive layout decisions instead of sampling `process.stdout` once.

### Tasks

1. **Adopt Ink hooks for resize events**
   - Use `const { stdout } = useStdout()` plus `stdout?.columns` fallback, or switch to `useStdoutDimensions()` if available in the current Ink version.
   - Sync dimensions into component state (`terminalWidth`, `terminalHeight`) with an effect that listens to the `resize` event and cleans up on unmount.
2. **Recompute derived metrics on change**
   - Replace module-level constants with memoized values derived from state: `agentsPerView`, `availableHeight`, truncation widths, separator sizes, and border widths.
   - Ensure `loadAgents` receives the latest `agentsPerView` by including it in the hook dependencies and refreshing when the height changes materially (e.g., debounce updates so it does not spam the API while a user drags the window).

---

## Phase 2: Responsive Layout Rules

**Goal:** Prevent overflow and negative widths by defining clear breakpoints for content blocks.

### Tasks

1. **Define safe width floors**
   - Clamp every `terminalWidth - N` expression with `Math.max(8, terminalWidth - N)` so truncation helpers never see negative numbers.
   - Ensure bordered boxes (`width={...}`) default to `undefined` when the computed width drops below 10 so Ink can wrap naturally.
2. **Column distribution strategy**
   - Compute `availableContentWidth = terminalWidth - chromePadding`.
   - For `>= 100` columns: split name/repo columns 45%/35% with the remainder for spacing.
   - For `70-100`: switch to 60%/40% with tighter margins.
   - For `< 70`: stack repository and URLs beneath the name, remove horizontal padding, and let long strings wrap instead of truncating aggressively.
3. **Separator and decoration updates**
   - Base separator lengths on `availableContentWidth` so borders neither overflow nor shrink to nothing on narrow panes.
   - Replace the hard-coded `"─".repeat(separatorWidth)` with a helper that returns a minimum of 5 characters.

---

## Phase 3: Pagination & Navigation Stability

**Goal:** Keep selection, pagination, and fetch cadence coherent when `agentsPerView` changes due to a resize.

### Tasks

1. **Resize-aware paging**
   - When `agentsPerView` changes, reload the current cursor page and clamp `selectedIndex` to the new flattened list length.
   - Maintain the `prevCursors` stack but clear it if the new page size is larger than the cached pages can satisfy (prevents jumping to empty pages).
2. **Soft loading strategy**
   - Track an `inFlightCursor` to avoid overlapping fetches triggered by quick resize events; cancel or ignore stale responses.
   - Consider precomputing `Math.ceil(agentsPerView * 1.5)` fetch sizes so a user gaining vertical space does not immediately see empty slots.

---

## Phase 4: Visual & UX Polish

**Goal:** Help users understand the layout controls and ensure information stays legible across sizes.

### Tasks

1. **Adaptive footer guidance**
   - Show the detected breakpoint label (e.g., “Compact layout” vs “Wide layout”) alongside pagination controls so users know why the view changed.
2. **URL wrapping behavior**
   - Allow preview/PR URLs to wrap using Ink’s default behavior (drop truncation once widths fall below 60 columns) so links stay copyable.
3. **Testing matrix**
   - Manually test at 50, 80, 120, and 160 columns, plus very short heights (~15 rows) to confirm pagination math and arrow navigation still work.

---

## Deliverables

1. Updated `AgentList.tsx` implementing the responsive logic above.
2. Optional helper utilities (`useTerminalSize`, `clampWidth`, etc.) if they improve readability.
3. QA notes documenting tested terminal dimensions and edge cases (tiny panes, rapid resize, empty states).

