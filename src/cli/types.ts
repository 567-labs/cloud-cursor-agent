/**
 * CLI types and interfaces
 */

import type { CloudAgentsApiClient } from "../api/client.js";

/**
 * Context passed to command handlers
 */
export interface CommandContext {
  /** API client instance */
  apiClient: CloudAgentsApiClient;
  /** Working directory for git detection */
  workingDir: string;
}
