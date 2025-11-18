/**
 * Configuration-centric types used throughout the CLI.
 */

/**
 * Git detection result (repository + ref).
 */
export interface GitInfo {
  repository: string;
  ref: string;
}

/**
 * Normalized configuration used when launching agents.
 */
export interface LaunchRuntimeConfig {
  repository: string;
  ref: string;
  branchName?: string;
  autoCreatePr: boolean;
  model: string;
}

/**
 * Repository filtering context for list-style commands.
 */
export interface RepositoryFilterConfig {
  workingDir: string;
  repository?: string;
}
