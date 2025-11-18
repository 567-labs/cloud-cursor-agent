/**
 * CLI types and interfaces
 */

import type { CloudAgentsApiClient } from "../api/client.js";
import type { AgentStatus } from "../types/agent.js";

/**
 * Context passed to command handlers
 */
export interface CommandContext {
  /** API client instance */
  apiClient: CloudAgentsApiClient;
  /** Working directory for git detection */
  workingDir: string;
}

export interface LaunchCommandOptions {
  plan: string;
  repo?: string;
  ref?: string;
  branch?: string;
  "no-auto-pr"?: boolean;
  model?: string;
  verbose?: boolean;
  dir?: string;
}

export interface ListCommandOptions {
  "non-interactive"?: boolean;
  dir?: string;
}

export interface StatusCommandOptions {
  agentId: string;
  "non-interactive"?: boolean;
}

export interface WatchCommandOptions {
  agentId: string;
  interval?: number;
  verbose?: boolean;
}

export interface CancelCommandOptions {
  agentId: string;
}

export interface FollowupCommandOptions {
  agentId: string;
  prompt: string;
}

export interface ConversationCommandOptions {
  agentId: string;
  "non-interactive"?: boolean;
}

export interface OpenCommandOptions {
  agentId: string;
  pr?: boolean;
}

export interface DeleteCommandOptions {
  agentId: string;
  force?: boolean;
}

export interface BatchDeleteCommandOptions {
  status?: AgentStatus | "terminal";
  repo?: string;
  "dry-run"?: boolean;
  force?: boolean;
  limit?: number;
  dir?: string;
}

