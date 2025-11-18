/**
 * API request/response types consumed by the CLI.
 */

import type { Agent, AgentSource, Prompt, PromptImage } from "./agent.js";

export interface ListAgentsResponse {
  agents: Agent[];
  nextCursor?: string;
}

export interface LaunchAgentTargetOptions {
  branchName?: string;
  autoCreatePr?: boolean;
  openAsCursorGithubApp?: boolean;
  skipReviewerRequest?: boolean;
}

export interface WebhookConfig {
  url: string;
  secret?: string;
}

export interface LaunchAgentRequest {
  prompt: Prompt;
  source: AgentSource;
  target?: LaunchAgentTargetOptions;
  model?: string;
  webhook?: WebhookConfig;
}

export interface ApiKeyInfo {
  apiKeyName: string;
  createdAt: string;
  userEmail: string;
}

export interface ModelsResponse {
  models: string[];
}

export interface Repository {
  owner: string;
  name: string;
  repository: string;
}

export interface ListRepositoriesResponse {
  repositories: Repository[];
}

export interface DeleteAgentResponse {
  id: string;
}

export interface AddFollowupResponse {
  id: string;
}

export type FollowupPromptPayload = {
  text: string;
  images?: PromptImage[];
};
