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
export interface ApiErrorOptions {
  statusCode?: number;
  response?: unknown;
  method?: string;
  path?: string;
  hint?: string;
  requestId?: string | null;
  retryAfterSeconds?: number | null;
  cause?: unknown;
}

export class ApiError extends Error {
  public statusCode?: number;
  public response?: unknown;
  public method?: string;
  public path?: string;
  public hint?: string;
  public requestId?: string | null;
  public retryAfterSeconds?: number | null;
  public cause?: unknown;

  constructor(message: string, options: ApiErrorOptions = {}) {
    super(message);
    this.name = "ApiError";
    this.statusCode = options.statusCode;
    this.response = options.response;
    this.method = options.method;
    this.path = options.path;
    this.hint = options.hint;
    this.requestId = options.requestId;
    this.retryAfterSeconds = options.retryAfterSeconds ?? null;
    this.cause = options.cause;
  }
}

/**
 * API client for interacting with Cursor Cloud Agents API
 */
export class CloudAgentsApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(apiKey: string, baseUrl: string = "https://api.cursor.com") {
    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
      throw new Error("API key is required. Please set CURSOR_API_KEY environment variable.");
    }
    this.apiKey = apiKey.trim();
    this.baseUrl = baseUrl;
  }

  /**
   * Get Basic Auth header value
   * Format: Basic <base64(apiKey + ':')>
   */
  private getAuthHeader(): string {
    const credentials = `${this.apiKey}:`;
    const encoded = Buffer.from(credentials).toString("base64");
    return `Basic ${encoded}`;
  }

  /**
   * Make an HTTP request to the API
   */
    private async request<T>(
      method: string,
      path: string,
      body?: unknown
    ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
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

      const requestLabel = `${method.toUpperCase()} ${path}`;

      try {
        const response = await fetch(url, options);

        if (!response.ok) {
          const requestId = response.headers.get("x-request-id");
          const retryAfterHeader = response.headers.get("Retry-After");
          const retryAfterSeconds = retryAfterHeader
            ? Number.parseInt(retryAfterHeader, 10) || null
            : null;
          const contentType = response.headers.get("content-type") ?? "";
          const expectsJson = contentType.includes("application/json");

          let errorData: unknown = null;
          let extractedMessage: string | undefined;

          if (response.status !== 204) {
            try {
              if (expectsJson) {
                errorData = await response.json();
              } else {
                const text = await response.text();
                errorData = text || null;
              }
            } catch (parseError) {
              errorData = { parseError: (parseError as Error).message };
            }
          }

          if (typeof errorData === "object" && errorData !== null) {
            if ("error" in errorData && typeof (errorData as any).error === "object") {
              const apiError = (errorData as { error?: { message?: string } }).error;
              extractedMessage = apiError?.message;
            } else if ("message" in errorData && typeof (errorData as any).message === "string") {
              extractedMessage = (errorData as { message: string }).message;
            }
          } else if (typeof errorData === "string" && errorData.trim().length > 0) {
            extractedMessage = errorData.trim();
          }

          let errorMessage =
            extractedMessage ??
            `API request failed (${response.status} ${response.statusText || ""}) while calling ${requestLabel}`.trim();

          let hint: string | undefined;

          if (response.status === 429) {
            hint =
              retryAfterSeconds !== null
                ? `Wait ${retryAfterSeconds} seconds and try again.`
                : "Please wait before retrying. The API has rate-limited the request.";
            errorMessage = "Rate limit exceeded.";
          } else if (response.status === 401) {
            hint = "Check that CURSOR_API_KEY is set and valid.";
            errorMessage = "Authentication failed.";
          } else if (response.status === 403) {
            hint = "Your API key might not have permission to perform this action.";
            errorMessage = extractedMessage ?? "Access forbidden for this API call.";
          } else if (response.status === 404) {
            hint = "Make sure the resource exists or the ID is correct.";
            errorMessage = extractedMessage ?? "Resource not found.";
          } else if (response.status === 400 || response.status === 422) {
            hint = "Double-check the request body and options you provided.";
            errorMessage = extractedMessage ?? "The API rejected the request payload.";
          } else if (response.status >= 500) {
            hint = "This is likely a temporary API issue. Try again shortly.";
            errorMessage = extractedMessage ?? "The API is currently unavailable.";
          }

          throw new ApiError(errorMessage, {
            statusCode: response.status,
            response: errorData,
            method,
            path,
            hint,
            requestId,
            retryAfterSeconds,
          });
        }

        // Handle 204 No Content responses
        if (response.status === 204) {
          return {} as T;
        }

        try {
          return (await response.json()) as T;
        } catch (parseError) {
          throw new ApiError("Failed to parse API response as JSON.", {
            method,
            path,
            cause: parseError,
            hint: "Please retry the command. If the problem persists, contact support.",
          });
        }
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        if (error instanceof Error) {
          const causeMessage = error.message || "Unknown network error";

          if (
            causeMessage.includes("fetch failed") ||
            causeMessage.includes("ECONNREFUSED") ||
            causeMessage.includes("ECONNRESET")
          ) {
            throw new ApiError("Failed to connect to the API server.", {
              method,
              path,
              hint: "Check your internet connection or VPN settings.",
              cause: error,
            });
          }
          if (causeMessage.includes("ENOTFOUND") || causeMessage.includes("DNS")) {
            throw new ApiError("Unable to resolve the API hostname.", {
              method,
              path,
              hint: "Verify your network connection and DNS configuration.",
              cause: error,
            });
          }
          if (causeMessage.includes("ETIMEDOUT") || causeMessage.includes("timeout")) {
            throw new ApiError("The request to the API timed out.", {
              method,
              path,
              hint: "Try again in a few moments or check your network speed.",
              cause: error,
            });
          }

          throw new ApiError(`Network error while calling ${requestLabel}: ${causeMessage}`, {
            method,
            path,
            cause: error,
          });
        }

        throw new ApiError(`Unknown error occurred while calling ${requestLabel}`, {
          method,
          path,
          cause: error,
        });
      }
    }

  /**
   * List all cloud agents for the authenticated user
   * GET /v0/agents
   */
  async listAgents(
    limit?: number,
    cursor?: string
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
   * Retrieve the current status and results of a cloud agent
   * GET /v0/agents/{id}
   */
  async getAgentStatus(id: string): Promise<Agent> {
    return this.request<Agent>("GET", `/v0/agents/${id}`);
  }

  /**
   * Start a new cloud agent to work on your repository
   * POST /v0/agents
   */
  async launchAgent(request: LaunchAgentRequest): Promise<Agent> {
    return this.request<Agent>("POST", "/v0/agents", request);
  }

  /**
   * Retrieve the conversation history of a cloud agent
   * GET /v0/agents/{id}/conversation
   */
  async getAgentConversation(id: string): Promise<AgentConversation> {
    return this.request<AgentConversation>(
      "GET",
      `/v0/agents/${id}/conversation`
    );
  }

  /**
   * Add a follow-up instruction to an existing cloud agent
   * POST /v0/agents/{id}/followup
   */
  async addFollowup(
    id: string,
    prompt: { text: string; images?: Array<{ data: string; dimension: { width: number; height: number } }> }
  ): Promise<AddFollowupResponse> {
    return this.request<AddFollowupResponse>(
      "POST",
      `/v0/agents/${id}/followup`,
      { prompt }
    );
  }

  /**
   * Delete a cloud agent
   * DELETE /v0/agents/{id}
   */
  async deleteAgent(id: string): Promise<DeleteAgentResponse> {
    return this.request<DeleteAgentResponse>("DELETE", `/v0/agents/${id}`);
  }

  /**
   * Retrieve information about the API key being used for authentication
   * GET /v0/me
   */
  async getApiKeyInfo(): Promise<ApiKeyInfo> {
    return this.request<ApiKeyInfo>("GET", "/v0/me");
  }

  /**
   * Retrieve a list of recommended models for cloud agents
   * GET /v0/models
   */
  async listModels(): Promise<ModelsResponse> {
    return this.request<ModelsResponse>("GET", "/v0/models");
  }

  /**
   * Retrieve a list of GitHub repositories accessible to the authenticated user
   * GET /v0/repositories
   * Note: This endpoint has strict rate limits (1/user/minute, 30/user/hour)
   */
  async listRepositories(): Promise<ListRepositoriesResponse> {
    return this.request<ListRepositoriesResponse>("GET", "/v0/repositories");
  }
}

