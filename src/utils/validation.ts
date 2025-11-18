/**
 * Input validation utilities
 */

export type ValidationResult = { valid: true } | { valid: false; error: string };

const GITHUB_OWNER_REGEX = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,38})$/;
const GITHUB_REPO_REGEX = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,99})$/;
const INVALID_REF_CHARACTERS = /[\u0000-\u001F\u007F\s~^:?*\[\]\\]/;
const FRONTMATTER_REGEX = /^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n?/;
const PLAN_EXTENSIONS = [".md", ".markdown", ".plan", ".txt"];
const INVALID_PLAN_PATH_CHARS = /[<>:"|?*\u0000]/;
// Accept both formats: bc_abc123 (old) or bc-uuid-format (new UUID format)
const AGENT_ID_REGEX = /^bc[-_][a-z0-9-]{5,}$/i;

const success = (): ValidationResult => ({ valid: true });
const failure = (error: string): ValidationResult => ({ valid: false, error });

/**
 * Validate a GitHub repository URL entered by a user.
 *
 * Accepts HTTPS (`https://github.com/org/repo`) and SSH (`git@github.com:org/repo`) formats
 * and normalizes obvious mistakes such as stray whitespace.
 *
 * @param {string} url - Raw repository URL provided by the user interface.
 * @returns {{ valid: boolean; error?: string }} Result describing whether the value passed basic checks.
 * @example
 * validateRepositoryUrl("https://github.com/buildwithcontext/app");
 * // => { valid: true }
 */
export function validateRepositoryUrl(url: string): ValidationResult {
  if (!url || typeof url !== "string") {
    return failure("Repository URL is required.");
  }

  const trimmed = url.trim();
  if (trimmed.length === 0) {
    return failure("Repository URL cannot be empty.");
  }

  if (/^https?:\/\//i.test(trimmed)) {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(trimmed);
    } catch {
      return failure("Repository URL is not a valid URL. Example: https://github.com/owner/repo");
    }

    if (parsedUrl.protocol !== "https:") {
      return failure("Use an https:// GitHub URL (e.g., https://github.com/owner/repo).");
    }

    if (parsedUrl.hostname.toLowerCase() !== "github.com") {
      return failure("Only github.com repositories are supported.");
    }

    const pathParts = parsedUrl.pathname
      .replace(/^\//, "")
      .replace(/\.git$/i, "")
      .replace(/\/+$/, "")
      .split("/")
      .filter(Boolean);

    if (pathParts.length < 2) {
      return failure("Repository URL must include both the owner and repository name (e.g., github.com/owner/repo).");
    }

    if (pathParts.length > 2) {
      return failure("Repository URL should only include the owner and repository. Remove extra path segments.");
    }

    const [owner, repo] = pathParts;

    if (!GITHUB_OWNER_REGEX.test(owner)) {
      return failure("Owner contains unsupported characters. Use letters, numbers, dots, underscores, or dashes.");
    }

    if (!GITHUB_REPO_REGEX.test(repo)) {
      return failure("Repository name contains unsupported characters. Use letters, numbers, dots, underscores, or dashes.");
    }

    return success();
  }

  const sshMatch = trimmed.match(/^git@github\.com:(.+)$/i);
  if (sshMatch) {
    const repoPart = sshMatch[1].replace(/\.git$/i, "").replace(/\/+$/, "");
    const segments = repoPart.split("/").filter(Boolean);

    if (segments.length !== 2) {
      return failure("SSH URLs must look like git@github.com:owner/repo.");
    }

    const [owner, repo] = segments;

    if (!GITHUB_OWNER_REGEX.test(owner)) {
      return failure("Owner contains unsupported characters. Use letters, numbers, dots, underscores, or dashes.");
    }

    if (!GITHUB_REPO_REGEX.test(repo)) {
      return failure("Repository name contains unsupported characters. Use letters, numbers, dots, underscores, or dashes.");
    }

    return success();
  }

  return failure("Invalid repository URL. Use https://github.com/owner/repo or git@github.com:owner/repo.");
}

/**
 * Validate a git ref value (branch name, tag, or commit hash).
 *
 * Ensures the string exists, is not empty after trimming, and does not include
 * characters that git disallows in ref names.
 *
 * @param {string} ref - Candidate git ref string from user input.
 * @returns {{ valid: boolean; error?: string }} Validation result with an error reason when invalid.
 */
export function validateRef(ref: string): ValidationResult {
  if (!ref || typeof ref !== "string") {
    return failure("Ref is required.");
  }

  const trimmed = ref.trim();

  if (trimmed.length === 0) {
    return failure("Ref cannot be empty.");
  }

  if (trimmed.length > 255) {
    return failure("Ref cannot exceed 255 characters.");
  }

  if (INVALID_REF_CHARACTERS.test(trimmed)) {
    return failure("Ref cannot contain spaces or any of ~ ^ : ? * [ ] \\ characters.");
  }

  if (trimmed.startsWith("/") || trimmed.endsWith("/")) {
    return failure("Ref cannot start or end with a slash.");
  }

  if (trimmed.includes("//")) {
    return failure("Ref cannot contain consecutive slashes.");
  }

  if (trimmed.startsWith(".") || trimmed.endsWith(".") || trimmed.includes("..")) {
    return failure("Ref cannot start, end, or contain consecutive periods.");
  }

  if (trimmed.startsWith("-")) {
    return failure("Ref cannot start with a dash.");
  }

  if (trimmed.includes("@{")) {
    return failure("Ref cannot contain the sequence '@{'.");
  }

  if (trimmed.endsWith(".lock")) {
    return failure("Ref cannot end with '.lock'.");
  }

  return success();
}

/**
 * Validate a file path string gathered from configuration.
 *
 * Currently checks only for presence and non-empty length once trimmed.
 *
 * @param {string} filePath - File path that may be relative or absolute.
 * @returns {{ valid: boolean; error?: string }} Validation result describing whether the path looks usable.
 */
export function validateFilePath(filePath: string): ValidationResult {
  if (!filePath || typeof filePath !== "string") {
    return failure("File path is required.");
  }

  const trimmed = filePath.trim();

  if (trimmed.length === 0) {
    return failure("File path cannot be empty.");
  }

  return success();
}

/**
 * Validate an agent identifier, typically returned from the backend.
 *
 * Ensures the ID exists, trims it, and enforces a basic prefix/length check like `bc_abc123`.
 *
 * @param {string} id - Agent identifier supplied by the user.
 * @returns {{ valid: boolean; error?: string }} Flag describing if the ID matches the expected format.
 */
export function validateAgentId(id: string): ValidationResult {
  if (!id || typeof id !== "string") {
    return failure("Agent ID is required.");
  }

  const trimmed = id.trim();

  if (trimmed.length === 0) {
    return failure("Agent ID cannot be empty.");
  }

  if (!AGENT_ID_REGEX.test(trimmed)) {
    return failure("Agent ID must look like bc_123abc or bc-uuid-format (letters, numbers, and hyphens only, at least 5 characters after bc- or bc_).");
  }

  return success();
}

/**
 * Validate an API key string for obvious problems (empty, too short).
 *
 * These checks help minimize round trips before the key hits the network or backend.
 *
 * @param {string} apiKey - API key captured from local input.
 * @returns {{ valid: boolean; error?: string }} Result noting whether the key is plausibly valid.
 */
export function validateApiKey(apiKey: string): ValidationResult {
  if (!apiKey || typeof apiKey !== "string") {
    return failure("API key is required.");
  }

  const trimmed = apiKey.trim();

  if (trimmed.length === 0) {
    return failure("API key cannot be empty.");
  }

  // Basic length check - API keys are typically longer
  if (trimmed.length < 10) {
    return failure("API key appears to be invalid (too short).");
  }

  return success();
}

/**
 * Validate a branch name (wrapper around validateRef with branch-specific rules)
 */
export function validateBranchName(branch: string): ValidationResult {
  const base = validateRef(branch);
  if (!base.valid) {
    return failure(base.error.replace(/^Ref/i, "Branch name"));
  }

  const trimmed = branch.trim();

  if (trimmed === "HEAD") {
    return failure("Branch name cannot be 'HEAD' because it is reserved by git.");
  }

  if (/^refs\//i.test(trimmed)) {
    return failure("Provide the branch name without the 'refs/' prefix (e.g., use main instead of refs/heads/main).");
  }

  if (!/[A-Za-z]/.test(trimmed)) {
    return failure("Branch name should include at least one letter to keep it descriptive.");
  }

  return success();
}

/**
 * Validate a plan file path
 */
export function validatePlanFilePath(filePath: string): ValidationResult {
  if (!filePath || typeof filePath !== "string") {
    return failure("Plan file path is required.");
  }

  const trimmed = filePath.trim();

  if (trimmed.length === 0) {
    return failure("Plan file path cannot be empty.");
  }

  if (INVALID_PLAN_PATH_CHARS.test(trimmed)) {
    return failure("Plan file path cannot include any of the following characters: < > : \" | ? *");
  }

  if (trimmed.endsWith("/") || trimmed.endsWith("\\")) {
    return failure("Plan file path must point to a file, not a directory.");
  }

  const lowercasePath = trimmed.toLowerCase();
  const hasValidExtension = PLAN_EXTENSIONS.some((ext) => lowercasePath.endsWith(ext));
  if (!hasValidExtension) {
    return failure(`Plan file must end with one of the following extensions: ${PLAN_EXTENSIONS.join(", ")}`);
  }

  return success();
}

/**
 * Validate plan content (post-read)
 */
export function validatePlanContent(content: string): ValidationResult {
  if (!content || typeof content !== "string") {
    return failure("Plan content is required.");
  }

  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return failure("Plan content cannot be empty.");
  }

  const withoutFrontmatter = trimmed.replace(FRONTMATTER_REGEX, "").trim();
  if (withoutFrontmatter.length === 0) {
    return failure("Plan content only contains frontmatter. Add the actual plan under the metadata.");
  }

  if (withoutFrontmatter.length < 20) {
    return failure("Plan content is too short. Add a few sentences or bullet points describing the work.");
  }

  if (/^\s*(todo|tbd|coming soon)\s*$/i.test(withoutFrontmatter)) {
    return failure("Plan content cannot be a placeholder like TODO or TBD. Provide concrete steps.");
  }

  const hasStructure = /(^|\n)\s*(?:#|\d+\.|[-*])\s+\S+/m.test(withoutFrontmatter);
  if (!hasStructure) {
    return failure("Plan content should include at least one heading or bullet so it can be parsed.");
  }

  return success();
}

