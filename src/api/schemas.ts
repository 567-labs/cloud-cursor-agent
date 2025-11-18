/**
 * TypeScript schemas for the Cursor Cloud Agents API
 * Based on: https://cursor.com/docs/cloud-agent/api/endpoints
 */

/**
 * Agent status types
 */
export type AgentStatus =
  | "CREATING"
  | "RUNNING"
  | "FINISHED"
  | "FAILED"
  | "CANCELLED";

/**
 * Source configuration for an agent
 */
export interface AgentSource {
  /** GitHub repository URL (e.g., https://github.com/your-org/your-repo) */
  repository: string;
  /** Git ref (branch name, tag, or commit hash) to use as the base branch */
  ref?: string;
}

/**
 * Target configuration for an agent
 */
export interface AgentTarget {
  /** Custom branch name for the agent to create */
  branchName?: string;
  /** URL to view agent in Cursor */
  url: string;
  /** GitHub PR URL if PR was created */
  prUrl?: string;
  /** Whether to automatically create a pull request when the agent completes */
  autoCreatePr?: boolean;
  /** Whether to open the pull request as the Cursor GitHub App instead of as the user */
  openAsCursorGithubApp?: boolean;
  /** Whether to skip adding the user as a reviewer to the pull request */
  skipReviewerRequest?: boolean;
}

/**
 * Agent object returned by the API
 */
export interface Agent {
  /** Unique identifier for the cloud agent (e.g., "bc_abc123") */
  id: string;
  /** Name of the agent */
  name: string;
  /** Current status of the agent */
  status: AgentStatus;
  /** Source repository configuration */
  source: AgentSource;
  /** Target configuration */
  target: AgentTarget;
  /** Summary of what the agent accomplished (optional) */
  summary?: string;
  /** ISO 8601 timestamp when the agent was created */
  createdAt: string;
}

/**
 * Response from listing agents
 */
export interface ListAgentsResponse {
  /** Array of agent objects */
  agents: Agent[];
  /** Pagination cursor for the next page (optional) */
  nextCursor?: string;
}

/**
 * Image data for prompts
 */
export interface PromptImage {
  /** Base64 encoded image data */
  data: string;
  /** Image dimensions */
  dimension: {
    width: number;
    height: number;
  };
}

/**
 * Prompt with optional images
 */
export interface Prompt {
  /** The instruction text for the agent */
  text: string;
  /** Array of image objects with base64 data and dimensions (max 5) */
  images?: PromptImage[];
}

/**
 * Request body for launching an agent
 */
export interface LaunchAgentRequest {
  /** The task prompt for the agent, including optional images */
  prompt: Prompt;
  /** Repository source information */
  source: AgentSource;
  /** Target configuration for the agent */
  target?: {
    /** Whether to automatically create a pull request when the agent completes */
    autoCreatePr?: boolean;
    /** Whether to open the pull request as the Cursor GitHub App */
    openAsCursorGithubApp?: boolean;
    /** Whether to skip adding the user as a reviewer */
    skipReviewerRequest?: boolean;
    /** Custom branch name for the agent to create */
    branchName?: string;
  };
  /** The LLM to use (e.g., claude-4-sonnet). If not provided, we'll pick the most appropriate model. */
  model?: string;
  /** Webhook configuration for status change notifications */
  webhook?: {
    /** URL to receive webhook notifications about agent status changes */
    url: string;
    /** Secret key for webhook payload verification (minimum 32 characters) */
    secret?: string;
  };
}

/**
 * Conversation message types
 */
export type MessageType = "user_message" | "assistant_message";

/**
 * A message in the agent conversation
 */
export interface ConversationMessage {
  /** Unique identifier for the message */
  id: string;
  /** Type of message */
  type: MessageType;
  /** Message text content */
  text: string;
  /** Optional images attached to the message */
  images?: PromptImage[];
}

/**
 * Agent conversation response
 */
export interface AgentConversation {
  /** Agent ID */
  id: string;
  /** Array of conversation messages */
  messages: ConversationMessage[];
}

/**
 * API key information
 */
export interface ApiKeyInfo {
  /** Name of the API key */
  apiKeyName: string;
  /** ISO 8601 timestamp when the API key was created */
  createdAt: string;
  /** Email of the user who owns the API key */
  userEmail: string;
}

/**
 * Models response
 */
export interface ModelsResponse {
  /** Array of available model names */
  models: string[];
}

/**
 * Repository information
 */
export interface Repository {
  /** Repository owner */
  owner: string;
  /** Repository name */
  name: string;
  /** Full repository URL */
  repository: string;
}

/**
 * List repositories response
 */
export interface ListRepositoriesResponse {
  /** Array of repository objects */
  repositories: Repository[];
}

/**
 * Delete agent response
 */
export interface DeleteAgentResponse {
  /** ID of the deleted agent */
  id: string;
}

/**
 * Add follow-up response
 */
export interface AddFollowupResponse {
  /** ID of the agent */
  id: string;
}
