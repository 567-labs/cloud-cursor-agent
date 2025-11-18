#!/usr/bin/env node

/**
 * Cloud Agents CLI
 * Main entry point for the cloud-agent command
 */

import React from "react";
import { render } from "ink";
import { Command } from "commander";
import { CloudAgentsApiClient } from "./src/api/client.js";
import { App } from "./src/components/App.js";
import { detectRepoAndRef } from "./src/utils/git.js";
import { registerCommands } from "./src/commands/index.js";
import type { CommandContext } from "./src/cli/types.js";

async function main() {
  const program = new Command();

  program
    .name("cloud-agent")
    .description("CLI tool for managing Cursor Cloud Agents")
    .version("1.0.0");

  const args = process.argv.slice(2);
  const isHelp = args.includes("--help") || args.includes("-h");
  const isNonInteractive = args.includes("--non-interactive") || args.includes("--no-interactive");
  
  // Register commands with dummy context for help display (commands won't execute for help)
  const dummyContext: CommandContext = {
    apiClient: null as any, // Won't be used - only for help text
    workingDir: process.cwd(),
  };
  registerCommands(program, dummyContext);
  
  // Show help without requiring API key
  if (isHelp || (args.length === 0 && isNonInteractive)) {
    program.help();
    return;
  }

  // Check for API key
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
  const workingDir = process.cwd();

  // Create command context with real API client
  const context: CommandContext = {
    apiClient,
    workingDir,
  };

  // Re-register commands with real context (commands are stored in program, so this updates them)
  // Note: Commander.js stores command handlers, so we need to update them
  // For now, we'll re-register which overwrites the previous registration
  const realProgram = new Command();
  realProgram.name("cloud-agent").description("CLI tool for managing Cursor Cloud Agents").version("1.0.0");
  registerCommands(realProgram, context);

  // Handle interactive mode (no command) - show main menu
  const hasCommand = args.length > 0 && !args[0].startsWith("-") && ["launch", "list", "status"].includes(args[0]);
  
  // Only show interactive menu if:
  // 1. No command provided
  // 2. Not non-interactive mode
  // 3. stdin is a TTY (interactive terminal)
  const isTTY = process.stdin.isTTY;
  
  if (!hasCommand) {
    if (!isNonInteractive && isTTY) {
      // Show interactive menu
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
    } else {
      // Show help for non-TTY or non-interactive mode
      realProgram.help();
      return;
    }
  }

  // Parse arguments with real program (has actual command handlers)
  await realProgram.parseAsync(process.argv);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
