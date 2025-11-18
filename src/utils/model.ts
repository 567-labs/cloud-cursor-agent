/**
 * Model selection utilities
 * Analyzes plan content to determine the appropriate model
 */

/**
 * Available models
 */
export const MODELS = {
  FAST: "composer-1",
  SMART: "gpt-5.1-codex",
} as const;

/**
 * Keywords that indicate a complex task requiring the smart model
 */
const COMPLEX_KEYWORDS = [
  "architecture",
  "architectural",
  "refactor",
  "refactoring",
  "redesign",
  "restructure",
  "migrate",
  "migration",
  "rewrite",
  "reimplement",
  "complex",
  "complicated",
  "multi-step",
  "multiple steps",
  "several",
  "many",
  "extensive",
  "comprehensive",
  "overhaul",
  "major",
  "significant",
  "large",
  "big",
  "system",
  "framework",
  "infrastructure",
  "performance",
  "optimization",
  "optimize",
  "scalability",
  "scalable",
  "security",
  "authentication",
  "authorization",
  "encryption",
  "testing",
  "test suite",
  "integration",
  "end-to-end",
  "e2e",
  "algorithm",
  "data structure",
  "database",
  "schema",
  "api design",
  "design pattern",
  "pattern",
];

/**
 * Keywords that indicate a simple task suitable for the fast model
 */
const SIMPLE_KEYWORDS = [
  "fix",
  "bug",
  "typo",
  "error",
  "small",
  "minor",
  "simple",
  "quick",
  "add",
  "update",
  "change",
  "modify",
  "adjust",
  "tweak",
  "correct",
  "correcting",
  "remove",
  "delete",
  "cleanup",
  "clean up",
  "format",
  "formatting",
  "style",
  "lint",
  "linting",
];

/**
 * Analyze plan content to determine the appropriate model.
 * 
 * Uses heuristics based on keywords and plan complexity:
 * - Fast model (composer-1): Simple tasks like bug fixes, small changes, typo fixes
 * - Smart model (gpt-5.1-codex): Complex tasks like refactors, architecture changes, multi-step tasks
 * 
 * @param {string} planContent - Markdown or plain text plan describing the requested work.
 * @returns {string} The recommended model name from {@link MODELS}.
 * @example
 * selectModel("# Plan\\n- Fix typo");
 * // => MODELS.FAST
 */
export function selectModel(planContent: string): string {
  const content = planContent.toLowerCase();
  
  // Count occurrences of complex and simple keywords
  const complexCount = COMPLEX_KEYWORDS.reduce((count, keyword) => {
    return count + (content.includes(keyword) ? 1 : 0);
  }, 0);
  
  const simpleCount = SIMPLE_KEYWORDS.reduce((count, keyword) => {
    return count + (content.includes(keyword) ? 1 : 0);
  }, 0);
  
  // Count number of bullet points or steps (indicates complexity)
  const stepCount = (planContent.match(/^[-*]\s/gm) || []).length;
  
  // Count number of lines (longer plans tend to be more complex)
  const lineCount = planContent.split("\n").filter(line => line.trim().length > 0).length;
  
  // Use smart model if:
  // - More complex keywords than simple keywords
  // - More than 5 steps/bullet points
  // - More than 20 lines of content
  // - Contains specific complex indicators
  if (
    complexCount > simpleCount ||
    stepCount > 5 ||
    lineCount > 20 ||
    content.includes("refactor") ||
    content.includes("architecture") ||
    content.includes("migrate") ||
    content.includes("rewrite")
  ) {
    return MODELS.SMART;
  }
  
  // Default to fast model for simple tasks
  return MODELS.FAST;
}

/**
 * Validate that a model name is one of the supported models.
 * 
 * @param {string} model - Arbitrary model identifier coming from user input.
 * @returns {boolean} `true` if the model is supported, `false` otherwise.
 * @example
 * isValidModel("composer-1");
 * // => true
 */
export function isValidModel(model: string): boolean {
  return Object.values(MODELS).includes(model as typeof MODELS[keyof typeof MODELS]);
}

