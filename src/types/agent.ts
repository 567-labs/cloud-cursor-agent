/**
 * Agent domain types shared across the CLI.
 */

/**
 * Agent lifecycle status as reported by the API.
 */
export type AgentStatus = "CREATING" | "RUNNING" | "FINISHED" | "FAILED" | "CANCELLED";

/**
 * Source repository configuration for an agent.
 */
export interface AgentSource {
  repository: string;
  ref?: string;
}

/**
 * Target configuration details surfaced by the API.
 */
export interface AgentTarget {
  branchName?: string;
  url: string;
  prUrl?: string;
  autoCreatePr?: boolean;
  openAsCursorGithubApp?: boolean;
  skipReviewerRequest?: boolean;
}

/**
 * Image attachment for prompts.
 */
export interface PromptImage {
  data: string;
  dimension: {
    width: number;
    height: number;
  };
}

/**
 * Primary instruction payload for agents.
 */
export interface Prompt {
  text: string;
  images?: PromptImage[];
}

/**
 * High-level agent metadata record.
 */
export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  source: AgentSource;
  target: AgentTarget;
  summary?: string;
  createdAt: string;
}

/**
 * Conversation message types returned by the API.
 */
export type MessageType = "user_message" | "assistant_message";

export interface ConversationMessage {
  id: string;
  type: MessageType;
  text: string;
}

export interface AgentConversation {
  id: string;
  messages: ConversationMessage[];
}
