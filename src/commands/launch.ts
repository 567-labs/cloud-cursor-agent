/**
 * Launch command - Launch an agent from a plan file
 */

import { ApiError } from "../api/client.js";
import type { CommandContext } from "../cli/types.js";
import { detectRepoAndRef, isGitRepository } from "../utils/git.js";
import { readPlanFile } from "../utils/file.js";
import { selectModel, isValidModel, MODELS } from "../utils/model.js";
import {
  validateRepositoryUrl,
  validatePlanFilePath,
  validatePlanContent,
  validateBranchName,
  validateRef,
} from "../utils/validation.js";

interface LaunchOptions {
  plan: string;
  repo?: string;
  ref?: string;
  branch?: string;
  "no-auto-pr"?: boolean;
  model?: string;
  verbose?: boolean;
  dir?: string;
}

/**
 * Launch a cloud agent using CLI-provided options and plan files.
 *
 * @param {CommandContext} context - Shared CLI context with API client and working directory.
 * @param {LaunchOptions} options - Plan path, repo/ref overrides, and behavior flags.
 * @returns {Promise<void>} Resolves once the agent is launched or an error is raised.
 * @example
 * await executeLaunch(context, { plan: "plan.md", repo: "https://github.com/org/repo", ref: "main" });
 */
export async function executeLaunch(
  context: CommandContext,
  options: LaunchOptions,
): Promise<void> {
  const { apiClient, workingDir } = context;
  const {
    plan,
    repo,
    ref,
    branch,
    "no-auto-pr": noAutoPr,
    model,
    verbose,
    dir,
  } = options;

  try {
    // Validate plan file path (skip validation for stdin "-")
    if (plan !== "-") {
      const planPathValidation = validatePlanFilePath(plan);
      if (!planPathValidation.valid) {
        console.error(`Error: ${planPathValidation.error}`);
        console.error(
          "Next steps: make sure the plan file exists or pass --plan - to read from stdin.",
        );
        process.exit(1);
      }
    }

    // Read plan file
    const planContent = await readPlanFile(plan);

    // Validate plan content
    const planContentValidation = validatePlanContent(planContent);
    if (!planContentValidation.valid) {
      console.error(`Error: ${planContentValidation.error}`);
      console.error(
        "Tip: include a short goal plus at least one bullet list under Tasks so the agent knows what to do.",
      );
      process.exit(1);
    }

    // Detect or use provided repository and ref
    const workingDirectory = dir || workingDir;
    let repository: string;
    let gitRef: string;

    // Validate provided repository if given
    if (repo) {
      const repoValidation = validateRepositoryUrl(repo);
      if (!repoValidation.valid) {
        console.error(`Error: ${repoValidation.error}`);
        console.error(
          "Expected format: https://github.com/org/repo (full HTTPS URL).",
        );
        process.exit(1);
      }
    }

    // Validate provided ref if given
    if (ref) {
      const refValidation = validateRef(ref);
      if (!refValidation.valid) {
        console.error(`Error: ${refValidation.error}`);
        console.error(
          "Try a branch name like main or copy the output of git rev-parse HEAD.",
        );
        process.exit(1);
      }
    }

    if (repo && ref) {
      repository = repo;
      gitRef = ref;
    } else {
      // Check if we're in a git repository before attempting detection
      if (!isGitRepository(workingDirectory)) {
        console.error(
          `Error: Not in a git repository (checked ${workingDirectory}).`,
        );
        console.error("");
        console.error("Please provide --repo and --ref flags:");
        console.error(
          "  cloud-agent launch --plan plan.md --repo https://github.com/org/repo --ref main",
        );
        console.error("");
        console.error(
          "Or navigate to a git repository that has a remote named origin.",
        );
        process.exit(1);
      }

      const gitInfo = await detectRepoAndRef(workingDirectory);
      if (!gitInfo) {
        console.error(
          "Error: Could not detect git repository information (remote 'origin' missing?).",
        );
        console.error("");
        console.error("Please provide --repo and --ref flags:");
        console.error(
          "  cloud-agent launch --plan plan.md --repo https://github.com/org/repo --ref main",
        );
        console.error("");
        console.error(
          "Or ensure your git repository has a remote 'origin' configured and tracking the branch you want to launch.",
        );
        process.exit(1);
      }
      repository = repo || gitInfo.repository;
      gitRef = ref || gitInfo.ref;

      // Validate auto-detected ref if not already validated
      if (!ref) {
        const refValidation = validateRef(gitRef);
        if (!refValidation.valid) {
          console.error(
            `Error: Auto-detected ref "${gitRef}" is invalid: ${refValidation.error}`,
          );
          console.error("");
          console.error("Please provide a valid --ref flag:");
          console.error(
            "  cloud-agent launch --plan plan.md --repo https://github.com/org/repo --ref main",
          );
          console.error("");
          console.error(
            "You can run git rev-parse HEAD to copy a commit SHA if your branch name has special characters.",
          );
          process.exit(1);
        }
      }
    }

    // Quick launch mode - bypass Ink to avoid React ref issues
    // Launch agent directly and output URL
    try {
      if (verbose) {
        console.error("Launching agent...");
        console.error("──────────────────");
        console.error(`Repository: ${repository} (auto-detected)`);
        console.error(`Ref: ${gitRef} (auto-detected)`);
        console.error("");
      }

      const request: {
        prompt: { text: string };
        source: { repository: string; ref: string };
        target?: {
          branchName?: string;
          autoCreatePr?: boolean;
        };
        model?: string;
      } = {
        prompt: {
          text: planContent,
        },
        source: {
          repository,
          ref: gitRef,
        },
      };

      // Validate branch name if provided
      if (branch) {
        const branchValidation = validateBranchName(branch);
        if (!branchValidation.valid) {
          console.error(`Error: ${branchValidation.error}`);
          console.error(
            "Use a short branch name with letters, numbers, or dashes. Example: feature-improve-docs.",
          );
          process.exit(1);
        }
      }

      // Set up target options
      // auto-pr is default unless --no-auto-pr is specified
      const shouldCreatePr = !noAutoPr;

      if (branch || shouldCreatePr) {
        request.target = {};
        if (branch) {
          request.target.branchName = branch;
        }
        if (shouldCreatePr) {
          request.target.autoCreatePr = true;
        }
      }

      // Determine model to use
      let selectedModel: string;
      if (model) {
        // Validate provided model
        if (!isValidModel(model)) {
          console.error(`Error: Invalid model "${model}"`);
          console.error(
            `Supported models: ${Object.values(MODELS).join(", ")}`,
          );
          console.error(
            "Leave --model unset to auto-pick, or pass one of the names above.",
          );
          process.exit(1);
        }
        selectedModel = model;
      } else {
        // Automatically select model based on plan content
        selectedModel = selectModel(planContent);
        if (verbose) {
          console.error(`Model: ${selectedModel} (auto-selected)`);
        }
      }
      request.model = selectedModel;

      const agent = await apiClient.launchAgent(request);

      if (verbose) {
        console.error("✓ Agent launched successfully!");
        console.error("");
      }

      // Output only the URL (primary workflow)
      console.log(agent.target.url);
    } catch (err) {
      if (err instanceof ApiError) {
        console.error("Launch failed: the API rejected the request.");
        console.error(`Reason: ${err.message}`);
        if (err.statusCode) {
          console.error(`HTTP status: ${err.statusCode}.`);
        }
        console.error(
          "Next steps: confirm CURSOR_API_KEY is set, the repo/ref are correct, and re-run with --verbose for the full API payload.",
        );
        if (verbose && err.response) {
          console.error("API Response:", JSON.stringify(err.response, null, 2));
        }
      } else if (err instanceof Error) {
        console.error(`Unexpected error while launching agent: ${err.message}`);
        console.error("Try running again with --verbose to see more details.");
      } else {
        console.error("Error: Failed to launch agent for an unknown reason.");
        console.error("Check your network connection and try again.");
      }
      process.exit(1);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Launch aborted: ${error.message}`);
      console.error("Fix the issue above, then re-run the command.");
    } else {
      console.error("Error: Unknown error occurred during launch setup.");
      console.error("Try again with --verbose to capture more context.");
    }
    process.exit(1);
  }
}
