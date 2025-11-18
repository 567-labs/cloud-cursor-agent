/**
 * API client for Cursor Cloud Agents API
 * Documentation: https://cursor.com/docs/cloud-agent/api/endpoints
 */

import type {
  Agent,
  ListAgentsResponse,
  LaunchAgentRequest,
  AgentConversation,
  ApiKeyInfo,
  ModelsResponse,
  ListRepositoriesResponse,
  DeleteAgentResponse,
  AddFollowupResponse,
} from "./schemas.js";

/**
 * API client error
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * API client for interacting with Cursor Cloud Agents API
 */
export class CloudAgentsApiClient {
  private baseUrl: string;
  private apiKey: string;

  /**
   * Create a new API client instance.
   *
   * @param {string} apiKey - Cursor API key (usually from `CURSOR_API_KEY`).
   * @param {string} [baseUrl="https://api.cursor.com"] - Alternate API host, mainly for testing.
   * @example
   * const client = new CloudAgentsApiClient(process.env.CURSOR_API_KEY!);
   */
  constructor(apiKey: string, baseUrl: string = "https://api.cursor.com") {
    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
      throw new Error(
        "API key is required. Please set CURSOR_API_KEY environment variable.",
      );
    }
    this.apiKey = apiKey.trim();
    this.baseUrl = baseUrl;
  }

  /**
   * Build the HTTP Basic Auth header value used by every request.
   *
   * @returns {string} Encoded header string like `Basic abc123=`.
   * @example
   * // Private helper; example shown for completeness only.
   * const header = client["getAuthHeader"]();
   * // => "Basic Zm9vOg=="
   */
  private getAuthHeader(): string {
    const credentials = `${this.apiKey}:`;
    const encoded = Buffer.from(credentials).toString("base64");
    return `Basic ${encoded}`;
  }

  /**
   * Make an HTTP request to the Cursor Cloud Agents API.
   *
   * @template T
   * @param {string} method - HTTP method such as `GET` or `POST`.
   * @param {string} path - Relative path beginning with `/v0`.
   * @param {unknown} [body] - Optional JSON-serializable payload.
   * @returns {Promise<T>} Parsed JSON body from the API.
   * @example
   * const agent = await client["request"]<Agent>("GET", "/v0/agents/123");
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const requestLabel = `${method.toUpperCase()} ${path}`;
    const headers: Record<string, string> = {
      Authorization: this.getAuthHeader(),
    };

    if (body) {
      headers["Content-Type"] = "application/json";
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        let errorMessage = `API request ${requestLabel} failed with status ${response.status}.`;
        let errorData: unknown;
        const guidance: string[] = [];

        // Handle rate limiting (429)
        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After");
          errorMessage = `Rate limit exceeded during ${requestLabel}.`;
          guidance.push(
            "Wait a few seconds and try again, or reduce how often you call this command.",
          );
          if (retryAfter) {
            guidance.push(
              `Retry after ${retryAfter} seconds as suggested by the API.`,
            );
          }
        }
        // Handle authentication errors (401)
        else if (response.status === 401) {
          errorMessage = `Authentication failed while calling ${requestLabel}.`;
          guidance.push(
            "Check CURSOR_API_KEY (run: echo $CURSOR_API_KEY) and ensure it matches https://cursor.com/settings.",
          );
        }
        // Handle not found (404)
        else if (response.status === 404) {
          errorMessage = `Resource not found for ${requestLabel}.`;
          guidance.push(
            "Verify the agent id or resource identifier you passed to the command.",
          );
        }
        // Handle bad request (400)
        else if (response.status === 400) {
          errorMessage = `Bad request sent to ${requestLabel}.`;
          guidance.push(
            "Double-check your command flags and plan content, then retry with --verbose.",
          );
        }
        // Handle server errors (5xx)
        else if (response.status >= 500) {
          guidance.push("The service had a problem. Wait a moment and retry.");
        }

        try {
          errorData = await response.json();
          if (
            typeof errorData === "object" &&
            errorData !== null &&
            "error" in errorData
          ) {
            const error = (errorData as { error: { message?: string } }).error;
            if (error?.message) {
              errorMessage = error.message;
            }
          } else if (
            typeof errorData === "object" &&
            errorData !== null &&
            "message" in errorData
          ) {
            errorMessage = (errorData as { message: string }).message;
          }
        } catch {
          // If JSON parsing fails, use the status text or our default message
          if (response.statusText && response.status < 400) {
            errorMessage = response.statusText;
          }
        }

        if (guidance.length > 0) {
          errorMessage += ` Next steps: ${guidance.join(" ")}`;
        }

        throw new ApiError(errorMessage, response.status, errorData);
      }

      // Handle 204 No Content responses
      if (response.status === 204) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof Error) {
        // Check for common network errors
        if (
          error.message.includes("fetch failed") ||
          error.message.includes("ECONNREFUSED")
        ) {
          throw new ApiError(
            `Failed to connect to ${this.baseUrl}. Check your internet connection or proxy settings, then retry.`,
            undefined,
            error,
          );
        }
        if (error.message.includes("ENOTFOUND")) {
          throw new ApiError(
            `Failed to resolve ${this.baseUrl}. Confirm DNS works and that you can reach https://api.cursor.com.`,
            undefined,
            error,
          );
        }
        throw new ApiError(
          `Network error during ${requestLabel}: ${error.message}. Try rerunning with --verbose for more detail.`,
          undefined,
          error,
        );
      }
      throw new ApiError(
        `Unknown error occurred while calling ${requestLabel}. Retry shortly or contact support if it keeps happening.`,
        undefined,
        error,
      );
    }
  }

  /**
   * List all cloud agents for the authenticated user.
   * GET /v0/agents
   *
   * @param {number} [limit] - Maximum number of agents to fetch per call.
   * @param {string} [cursor] - Cursor for paginating through large result sets.
   * @returns {Promise<ListAgentsResponse>} Paginated response with agents and next cursor.
   * @example
   * const { agents } = await client.listAgents(25);
   */
  async listAgents(
    limit?: number,
    cursor?: string,
  ): Promise<ListAgentsResponse> {
    const params = new URLSearchParams();
    if (limit !== undefined) {
      params.append("limit", limit.toString());
    }
    if (cursor) {
      params.append("cursor", cursor);
    }

    const queryString = params.toString();
    const path = `/v0/agents${queryString ? `?${queryString}` : ""}`;

    return this.request<ListAgentsResponse>("GET", path);
  }

  /**
   * Retrieve the current status and results of a cloud agent.
   * GET /v0/agents/{id}
   *
   * @param {string} id - Agent identifier (for example, `bc_abc123`).
   * @returns {Promise<Agent>} Full agent object with latest status.
   * @example
   * const agent = await client.getAgentStatus("bc_abc123");
   */
  async getAgentStatus(id: string): Promise<Agent> {
    return this.request<Agent>("GET", `/v0/agents/${id}`);
  }

  /**
   * Start a new cloud agent to work on your repository.
   * POST /v0/agents
   *
   * @param {LaunchAgentRequest} request - Prompt, source repo, and optional target configuration.
   * @returns {Promise<Agent>} Newly created agent record.
   * @example
   * const agent = await client.launchAgent({
   *   prompt: { text: "# Fix bugs" },
   *   source: { repository: "https://github.com/org/repo", ref: "main" },
   * });
   */
  async launchAgent(request: LaunchAgentRequest): Promise<Agent> {
    return this.request<Agent>("POST", "/v0/agents", request);
  }

  /**
   * Retrieve the conversation history of a cloud agent.
   * GET /v0/agents/{id}/conversation
   *
   * @param {string} id - Agent identifier to inspect.
   * @returns {Promise<AgentConversation>} Conversation messages and metadata.
   * @example
   * const convo = await client.getAgentConversation("bc_abc123");
   */
  async getAgentConversation(id: string): Promise<AgentConversation> {
    return this.request<AgentConversation>(
      "GET",
      `/v0/agents/${id}/conversation`,
    );
  }

  /**
   * Add a follow-up instruction to an existing cloud agent.
   * POST /v0/agents/{id}/followup
   *
   * @param {string} id - Agent identifier to send the follow-up to.
   * @param {{ text: string; images?: Array<{ data: string; dimension: { width: number; height: number } }> }} prompt -
   *   Follow-up payload containing plain text and optional inline images.
   * @returns {Promise<AddFollowupResponse>} API response describing the follow-up.
   * @example
   * await client.addFollowup("bc_abc123", { text: "Please re-run the tests." });
   */
  async addFollowup(
    id: string,
    prompt: {
      text: string;
      images?: Array<{
        data: string;
        dimension: { width: number; height: number };
      }>;
    },
  ): Promise<AddFollowupResponse> {
    return this.request<AddFollowupResponse>(
      "POST",
      `/v0/agents/${id}/followup`,
      { prompt },
    );
  }

  /**
   * Delete a cloud agent.
   * DELETE /v0/agents/{id}
   *
   * @param {string} id - Agent identifier to delete.
   * @returns {Promise<DeleteAgentResponse>} Confirmation payload (often empty).
   * @example
   * await client.deleteAgent("bc_abc123");
   */
  async deleteAgent(id: string): Promise<DeleteAgentResponse> {
    return this.request<DeleteAgentResponse>("DELETE", `/v0/agents/${id}`);
  }

  /**
   * Retrieve information about the API key being used for authentication.
   * GET /v0/me
   *
   * @returns {Promise<ApiKeyInfo>} Metadata describing the authenticated user and key.
   * @example
   * const info = await client.getApiKeyInfo();
   */
  async getApiKeyInfo(): Promise<ApiKeyInfo> {
    return this.request<ApiKeyInfo>("GET", "/v0/me");
  }

  /**
   * Retrieve a list of recommended models for cloud agents.
   * GET /v0/models
   *
   * @returns {Promise<ModelsResponse>} Available model identifiers and metadata.
   * @example
   * const models = await client.listModels();
   */
  async listModels(): Promise<ModelsResponse> {
    return this.request<ModelsResponse>("GET", "/v0/models");
  }

  /**
   * Retrieve a list of GitHub repositories accessible to the authenticated user.
   * GET /v0/repositories
   * Note: This endpoint has strict rate limits (1/user/minute, 30/user/hour)
   *
   * @returns {Promise<ListRepositoriesResponse>} Repository records with pagination.
   * @example
   * const repos = await client.listRepositories();
   */
  async listRepositories(): Promise<ListRepositoriesResponse> {
    return this.request<ListRepositoriesResponse>("GET", "/v0/repositories");
  }
}
