/**
 * Test utilities
 * 
 * Common utilities and helpers for writing tests.
 */

// Only import React and Testing Library when needed (lazy imports in functions)
// This prevents ReactDOM from loading for pure utility tests

/**
 * Custom render function that includes any providers or context needed for tests
 */
export async function renderWithProviders(
  ui: any,
  options?: any
) {
  const { render } = await import("@testing-library/react");
  return render(ui, options);
}

/**
 * Mock implementation of Ink's useStdout hook
 */
export function mockUseStdout() {
  return {
    stdout: {
      columns: 100,
      rows: 30,
      on: () => {},
      off: () => {},
    },
  };
}

/**
 * Mock implementation of Ink's useInput hook
 */
export function mockUseInput() {
  return () => {};
}

/**
 * Create a mock agent for testing
 */
export function createMockAgent(overrides?: Partial<import("../api/schemas.js").Agent>): import("../api/schemas.js").Agent {
  return {
    id: "bc_test123",
    name: "Test Agent",
    status: "RUNNING",
    source: {
      repository: "https://github.com/user/repo",
      ref: "main",
    },
    target: {
      url: "https://cursor.com/agents?id=bc_test123",
      prUrl: "https://github.com/user/repo/pull/1",
      branchName: "test-branch",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create multiple mock agents for testing
 */
export function createMockAgents(count: number, overrides?: Partial<import("../api/schemas.js").Agent>[]): import("../api/schemas.js").Agent[] {
  return Array.from({ length: count }, (_, i) =>
    createMockAgent({
      id: `bc_test${i}`,
      name: `Test Agent ${i}`,
      status: (["RUNNING", "FINISHED", "FAILED", "CREATING", "CANCELLED"] as const)[i % 5],
      ...overrides?.[i],
    })
  );
}

/**
 * Mock API client for testing
 */
export function createMockApiClient() {
  return {
    listAgents: async () => ({
      agents: [],
      nextCursor: undefined,
    }),
    getAgentStatus: async () => createMockAgent(),
    launchAgent: async () => createMockAgent(),
    getAgentConversation: async () => ({ messages: [] }),
    cancelAgent: async () => ({}),
    deleteAgent: async () => ({}),
    addFollowup: async () => ({}),
  } as unknown as import("../api/client.js").CloudAgentsApiClient;
}

