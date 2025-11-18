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

export async function executeLaunch(
  context: CommandContext,
  options: LaunchOptions
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
        process.exit(1);
      }
    }

    // Read plan file
    const planContent = await readPlanFile(plan);

    // Validate plan content
    const planContentValidation = validatePlanContent(planContent);
    if (!planContentValidation.valid) {
      console.error(`Error: ${planContentValidation.error}`);
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
        process.exit(1);
      }
    }

    // Validate provided ref if given
    if (ref) {
      const refValidation = validateRef(ref);
      if (!refValidation.valid) {
        console.error(`Error: ${refValidation.error}`);
        process.exit(1);
      }
    }

    if (repo && ref) {
      repository = repo;
      gitRef = ref;
    } else {
      // Check if we're in a git repository before attempting detection
      if (!isGitRepository(workingDirectory)) {
        console.error("Error: Not in a git repository.");
        console.error("");
        console.error("Please provide --repo and --ref flags:");
        console.error("  cloud-agent launch --plan plan.md --repo https://github.com/org/repo --ref main");
        console.error("");
        console.error("Or navigate to a git repository with a remote configured.");
        process.exit(1);
      }

      const gitInfo = await detectRepoAndRef(workingDirectory);
      if (!gitInfo) {
        console.error("Error: Could not detect git repository information.");
        console.error("");
        console.error("Please provide --repo and --ref flags:");
        console.error("  cloud-agent launch --plan plan.md --repo https://github.com/org/repo --ref main");
        console.error("");
        console.error("Or ensure your git repository has a remote 'origin' configured.");
        process.exit(1);
      }
      repository = repo || gitInfo.repository;
      gitRef = ref || gitInfo.ref;

      // Validate auto-detected ref if not already validated
      if (!ref) {
        const refValidation = validateRef(gitRef);
        if (!refValidation.valid) {
          console.error(`Error: Auto-detected ref "${gitRef}" is invalid: ${refValidation.error}`);
          console.error("");
          console.error("Please provide a valid --ref flag:");
          console.error("  cloud-agent launch --plan plan.md --repo https://github.com/org/repo --ref main");
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
          console.error(`Supported models: ${Object.values(MODELS).join(", ")}`);
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
        console.error(`Error: ${err.message}`);
        if (verbose && err.response) {
          console.error("API Response:", JSON.stringify(err.response, null, 2));
        }
      } else if (err instanceof Error) {
        console.error(`Error: ${err.message}`);
      } else {
        console.error("Error: Failed to launch agent");
      }
      process.exit(1);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error("Error: Unknown error occurred");
    }
    process.exit(1);
  }
}


