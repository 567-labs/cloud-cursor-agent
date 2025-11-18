#!/usr/bin/env node

/**
 * Cloud Agents CLI
 * Main entry point for the cloud-agent command
 */

import React from "react";
import { render } from "ink";
import { CloudAgentsApiClient, ApiError } from "./src/api/client.js";
import { AgentList } from "./src/components/AgentList.js";
import { AgentStatus } from "./src/components/AgentStatus.js";
import { App } from "./src/components/App.js";
import { detectRepoAndRef, isGitRepository } from "./src/utils/git.js";
import { readPlanFile } from "./src/utils/file.js";
import { selectModel, isValidModel, MODELS } from "./src/utils/model.js";

interface CliArgs {
  command?: string;
  plan?: string;
  repo?: string;
  ref?: string;
  branch?: string;
  "auto-pr"?: boolean;
  "no-auto-pr"?: boolean;
  model?: string;
  verbose?: boolean;
  dir?: string;
  agentId?: string;
  "non-interactive"?: boolean;
  help?: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const parsed: CliArgs = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--plan" && i + 1 < args.length) {
      parsed.plan = args[++i];
    } else if (arg === "--repo" && i + 1 < args.length) {
      parsed.repo = args[++i];
    } else if (arg === "--ref" && i + 1 < args.length) {
      parsed.ref = args[++i];
    } else if (arg === "--branch" && i + 1 < args.length) {
      parsed.branch = args[++i];
    } else if (arg === "--auto-pr") {
      parsed["auto-pr"] = true;
    } else if (arg === "--no-auto-pr") {
      parsed["no-auto-pr"] = true;
    } else if (arg === "--model" && i + 1 < args.length) {
      parsed.model = args[++i];
    } else if (arg === "--verbose" || arg === "-v") {
      parsed.verbose = true;
    } else if (arg === "--dir" && i + 1 < args.length) {
      parsed.dir = args[++i];
    } else if (arg === "--non-interactive" || arg === "--no-interactive") {
      parsed["non-interactive"] = true;
    } else if (arg === "--help" || arg === "-h") {
      parsed.help = true;
    } else if (!arg.startsWith("--") && !parsed.command) {
      parsed.command = arg;
    } else if (!arg.startsWith("--") && parsed.command === "status" && !parsed.agentId) {
      parsed.agentId = arg;
    }
  }

  return parsed;
}

async function main() {
  const args = parseArgs();

  // Show help without requiring API key
  if (args.help || (!args.command && args["non-interactive"])) {
    showHelp();
    return;
  }

  const apiKey = process.env.CURSOR_API_KEY;

  if (!apiKey) {
    console.error("Error: CURSOR_API_KEY environment variable is not set");
    console.error("");
    console.error("Please set it with:");
    console.error("  export CURSOR_API_KEY=your_api_key");
    console.error("");
    console.error("You can obtain an API key from:");
    console.error("  https://cursor.com/settings");
    process.exit(1);
  }

  const apiClient = new CloudAgentsApiClient(apiKey);

  // Quick launch mode: cloud-agent launch --plan plan.md
  if (args.command === "launch" && args.plan) {
    try {
      // Import validation functions
      const {
        validateRepositoryUrl,
        validatePlanFilePath,
        validatePlanContent,
        validateBranchName,
        validateRef,
      } = await import("./src/utils/validation.js");

      // Validate plan file path (skip validation for stdin "-")
      if (args.plan !== "-") {
        const planPathValidation = validatePlanFilePath(args.plan);
        if (!planPathValidation.valid) {
          console.error(`Error: ${planPathValidation.error}`);
          process.exit(1);
        }
      }

      // Read plan file
      const planContent = await readPlanFile(args.plan);

      // Validate plan content
      const planContentValidation = validatePlanContent(planContent);
      if (!planContentValidation.valid) {
        console.error(`Error: ${planContentValidation.error}`);
        process.exit(1);
      }

      // Detect or use provided repository and ref
      const workingDir = args.dir || process.cwd();
      let repository: string;
      let ref: string;

      // Validate provided repository if given
      if (args.repo) {
        const repoValidation = validateRepositoryUrl(args.repo);
        if (!repoValidation.valid) {
          console.error(`Error: ${repoValidation.error}`);
          process.exit(1);
        }
      }

      // Validate provided ref if given
      if (args.ref) {
        const refValidation = validateRef(args.ref);
        if (!refValidation.valid) {
          console.error(`Error: ${refValidation.error}`);
          process.exit(1);
        }
      }

      if (args.repo && args.ref) {
        repository = args.repo;
        ref = args.ref;
      } else {
        // Check if we're in a git repository before attempting detection
        if (!isGitRepository(workingDir)) {
          console.error("Error: Not in a git repository.");
          console.error("");
          console.error("Please provide --repo and --ref flags:");
          console.error("  cloud-agent launch --plan plan.md --repo https://github.com/org/repo --ref main");
          console.error("");
          console.error("Or navigate to a git repository with a remote configured.");
          process.exit(1);
        }

        const gitInfo = await detectRepoAndRef(workingDir);
        if (!gitInfo) {
          console.error("Error: Could not detect git repository information.");
          console.error("");
          console.error("Please provide --repo and --ref flags:");
          console.error("  cloud-agent launch --plan plan.md --repo https://github.com/org/repo --ref main");
          console.error("");
          console.error("Or ensure your git repository has a remote 'origin' configured.");
          process.exit(1);
        }
        repository = args.repo || gitInfo.repository;
        ref = args.ref || gitInfo.ref;

        // Validate auto-detected ref if not already validated
        if (!args.ref) {
          const refValidation = validateRef(ref);
          if (!refValidation.valid) {
            console.error(`Error: Auto-detected ref "${ref}" is invalid: ${refValidation.error}`);
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
        if (args.verbose) {
          console.error("Launching agent...");
          console.error("──────────────────");
          console.error(`Repository: ${repository} (auto-detected)`);
          console.error(`Ref: ${ref} (auto-detected)`);
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
            ref,
          },
        };

        // Validate branch name if provided
        if (args.branch) {
          const branchValidation = validateBranchName(args.branch);
          if (!branchValidation.valid) {
            console.error(`Error: ${branchValidation.error}`);
            process.exit(1);
          }
        }

        // Set up target options
        // auto-pr is default unless --no-auto-pr is specified
        const shouldCreatePr = !args["no-auto-pr"];
        
        if (args.branch || shouldCreatePr) {
          request.target = {};
          if (args.branch) {
            request.target.branchName = args.branch;
          }
          if (shouldCreatePr) {
            request.target.autoCreatePr = true;
          }
        }

        // Determine model to use
        let selectedModel: string;
        if (args.model) {
          // Validate provided model
          if (!isValidModel(args.model)) {
            console.error(`Error: Invalid model "${args.model}"`);
            console.error(`Supported models: ${Object.values(MODELS).join(", ")}`);
            process.exit(1);
          }
          selectedModel = args.model;
        } else {
          // Automatically select model based on plan content
          selectedModel = selectModel(planContent);
          if (args.verbose) {
            console.error(`Model: ${selectedModel} (auto-selected)`);
          }
        }
        request.model = selectedModel;

        const agent = await apiClient.launchAgent(request);

        if (args.verbose) {
          console.error("✓ Agent launched successfully!");
          console.error("");
        }

        // Output only the URL (primary workflow)
        console.log(agent.target.url);
      } catch (err) {
        if (err instanceof ApiError) {
          console.error(`Error: ${err.message}`);
          if (args.verbose && err.response) {
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
    return;
  }

  // List command: cloud-agent list
  if (args.command === "list") {
    // Detect repository for filtering
    const workingDir = args.dir || process.cwd();
    const gitInfo = await detectRepoAndRef(workingDir);
    const repositoryFilter = gitInfo?.repository;

    if (args["non-interactive"]) {
      // Non-interactive mode: output plain text
      try {
        const response = await apiClient.listAgents(100); // Get up to 100 agents
        
        // Filter by repository if detected
        let agents = response.agents;
        if (repositoryFilter) {
          const normalizeRepo = (url: string) => {
            if (!url) return "";
            return url
              .replace(/^https?:\/\//, "") // Remove http:// or https:// prefix
              .replace(/\.git$/, "")
              .replace(/\/$/, "") // Remove trailing slash
              .toLowerCase()
              .trim();
          };
          const normalizedFilter = normalizeRepo(repositoryFilter);
          agents = response.agents.filter((agent) => {
            return normalizeRepo(agent.source.repository) === normalizedFilter;
          });
        }

        if (agents.length === 0) {
          if (repositoryFilter) {
            console.log(`No agents found for ${repositoryFilter}.`);
          } else {
            console.log("No agents found.");
          }
          console.log("");
          console.log("Make a cloud agent via command:");
          console.log("  cloud-agent launch --plan plan.md");
          return;
        }
        
        if (repositoryFilter) {
          console.log(`Found ${agents.length} agent(s) for ${repositoryFilter}:\n`);
        } else {
          console.log(`Found ${agents.length} agent(s):\n`);
        }
        
        for (const agent of agents) {
          const statusSymbol = getStatusSymbol(agent.status);
          console.log(agent.id);
          console.log(`  Status:     ${statusSymbol} ${agent.status}`);
          console.log(`  Name:       ${agent.name}`);
          console.log(`  Repository: ${agent.source.repository}`);
          if (agent.source.ref) {
            console.log(`  Ref:        ${agent.source.ref}`);
          }
          if (agent.target.branchName) {
            console.log(`  Branch:     ${agent.target.branchName}`);
          }
          console.log(`  URL:        ${agent.target.url}`);
          if (agent.target.prUrl) {
            console.log(`  PR:         ${agent.target.prUrl}`);
          }
          console.log("");
        }
        if (response.nextCursor && !repositoryFilter) {
          console.log("(More agents available - use interactive mode to paginate)");
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error(`Error: ${error.message}`);
        } else {
          console.error("Error: Failed to list agents");
        }
        process.exit(1);
      }
      return;
    }
    
    // Interactive mode
    const { waitUntilExit } = render(
      <AgentList 
        apiClient={apiClient} 
        onBack={() => process.exit(0)}
        repositoryFilter={repositoryFilter}
      />
    );
    await waitUntilExit();
    return;
  }

  // Status command: cloud-agent status <id>
  if (args.command === "status") {
    if (!args.agentId) {
      console.error("Error: Agent ID is required");
      console.error("Usage: cloud-agent status <agent-id>");
      process.exit(1);
    }

    // Validate agent ID format
    const { validateAgentId } = await import("./src/utils/validation.js");
    const agentIdValidation = validateAgentId(args.agentId);
    if (!agentIdValidation.valid) {
      console.error(`Error: ${agentIdValidation.error}`);
      console.error("");
      console.error("Agent ID must look like bc_123abc (letters and numbers only, at least 5 characters after bc_).");
      process.exit(1);
    }

    if (args["non-interactive"]) {
      // Non-interactive mode: output plain text
      try {
        const agent = await apiClient.getAgentStatus(args.agentId);
        const statusSymbol = getStatusSymbol(agent.status);
        console.log(`Agent: ${agent.id}`);
        console.log(`Name: ${agent.name}`);
        console.log(`Status: ${statusSymbol} ${agent.status}`);
        console.log(`Repository: ${agent.source.repository}`);
        if (agent.source.ref) {
          console.log(`Ref: ${agent.source.ref}`);
        }
        if (agent.target.branchName) {
          console.log(`Branch: ${agent.target.branchName}`);
        }
        console.log(`URL: ${agent.target.url}`);
        if (agent.target.prUrl) {
          console.log(`PR URL: ${agent.target.prUrl}`);
        }
        if (agent.summary) {
          console.log(`\nSummary:\n${agent.summary}`);
        }
        console.log(`Created: ${new Date(agent.createdAt).toLocaleString()}`);
      } catch (error) {
        if (error instanceof Error) {
          console.error(`Error: ${error.message}`);
        } else {
          console.error("Error: Failed to get agent status");
        }
        process.exit(1);
      }
      return;
    }

    // Interactive mode
    const { waitUntilExit } = render(
      <AgentStatus
        apiClient={apiClient}
        agentId={args.agentId}
        onBack={() => process.exit(0)}
      />
    );
    await waitUntilExit();
    return;
  }


  // Interactive mode: cloud-agent (no command) - show main menu
  if (!args.command) {
    // Detect repository for filtering
    const workingDir = args.dir || process.cwd();
    const gitInfo = await detectRepoAndRef(workingDir);
    const repositoryFilter = gitInfo?.repository;

    const { waitUntilExit } = render(
      <App 
        apiClient={apiClient}
        initialView="menu"
        repositoryFilter={repositoryFilter}
      />
    );
    await waitUntilExit();
    return;
  }

  // Unknown command
  console.error(`Unknown command: ${args.command}`);
  console.error("");
  showHelp();
  process.exit(1);
}

function getStatusSymbol(status: string): string {
  switch (status) {
    case "CREATING":
      return "[●]";
    case "RUNNING":
      return "[▶]";
    case "FINISHED":
      return "[✓]";
    case "FAILED":
      return "[✗]";
    case "CANCELLED":
      return "[○]";
    default:
      return "[?]";
  }
}

function showHelp() {
  console.log("Cloud Agents CLI");
  console.log("");
  console.log("Usage:");
  console.log("  cloud-agent [command] [options]");
  console.log("");
  console.log("Commands:");
  console.log("  launch --plan <file>    Launch an agent from a plan file");
  console.log("  list                   List all agents");
  console.log("  status <id>            Show agent status");
  console.log("");
  console.log("Options:");
  console.log("  --plan <file>          Plan file to use as prompt (required for launch)");
  console.log("                        Use \"-\" to read from stdin (supports heredoc syntax)");
  console.log("  --repo <url>           Repository URL (auto-detected if not provided)");
  console.log("  --ref <ref>            Git ref (branch/tag/commit) (auto-detected if not provided)");
  console.log("  --branch <name>        Target branch name");
  console.log("  --no-auto-pr           Disable automatic PR creation (PR creation is default)");
  console.log("  --model <name>         Model to use (composer-1 or gpt-5.1-codex)");
  console.log("                        If not provided, model is auto-selected based on plan");
  console.log("  --verbose, -v          Show verbose output");
  console.log("  --dir <path>           Working directory for git detection");
  console.log("  --non-interactive      Disable interactive mode (output plain text)");
  console.log("  --help, -h             Show this help message");
  console.log("");
  console.log("Examples:");
  console.log("  bun run cloud-agent.tsx launch --plan plan.md");
  console.log("  bun run cloud-agent.tsx launch --plan plan.md --repo https://github.com/org/repo --ref main");
  console.log("  bun run cloud-agent.tsx launch --plan - <<'EOF'");
  console.log("  refactor(AgentList): extract status order constant");
  console.log("  - Extract DEFAULT_STATUS_ORDER constant");
  console.log("  EOF");
  console.log("  bun run cloud-agent.tsx list");
  console.log("  bun run cloud-agent.tsx list --non-interactive  # Plain text output");
  console.log("  bun run cloud-agent.tsx status bc_abc123");
  console.log("  bun run cloud-agent.tsx status bc_abc123 --non-interactive  # Plain text output");
  console.log("  bun run cloud-agent.tsx  # Interactive agent list");
  console.log("  bun run cloud-agent.tsx --non-interactive  # Show help instead of interactive list");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

