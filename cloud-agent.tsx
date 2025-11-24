#!/usr/bin/env node

/**
 * Cloud Agents CLI
 * Main entry point for the cloud-agent command
 */

import React from "react";
import { render } from "ink";
import { Command } from "commander";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { CloudAgentsApiClient } from "./src/api/client.js";
import { App } from "./src/components/App.js";
import { detectRepoAndRef } from "./src/utils/git.js";
import { registerCommands } from "./src/commands/index.js";
import type { CommandContext } from "./src/cli/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, "package.json"), "utf-8"));
const VERSION =
  typeof pkg.version === "string" && pkg.version.length > 0
    ? pkg.version
    : "0.0.0";

function printApiKeyError(): void {
  console.error("Error: CURSOR_API_KEY environment variable is not set");
  console.error("");
  console.error("Please set it with:");
  console.error("  export CURSOR_API_KEY=your_api_key");
  console.error("");
  console.error("You can obtain an API key from:");
  console.error("  https://cursor.com/settings");
}

function createProgram(
  version: string,
  context?: CommandContext | null
): Command {
  const program = new Command()
    .name("cloud-agent")
    .description("CLI tool for managing Cursor Cloud Agents")
    .version(version);

  if (context) {
    registerCommands(program, context);
  }

  return program;
}

async function showInteractiveMenu(
  apiClient: CloudAgentsApiClient,
  context: CommandContext
): Promise<void> {
  const gitInfo = await detectRepoAndRef(context.workingDir);
  const repositoryFilter = gitInfo?.repository;

  const { waitUntilExit } = render(
    <App
      apiClient={apiClient}
      context={context}
      initialView="menu"
      repositoryFilter={repositoryFilter}
    />
  );

  await waitUntilExit();
}

async function main() {
  const args = process.argv.slice(2);
  const isHelp = args.includes("--help") || args.includes("-h");
  const isNonInteractive =
    args.includes("--non-interactive") || args.includes("--no-interactive");

  if (isHelp || (args.length === 0 && isNonInteractive)) {
    createProgram(VERSION).help();
    return;
  }

  const apiKey = process.env.CURSOR_API_KEY;
  if (!apiKey) {
    printApiKeyError();
    process.exit(1);
  }

  const apiClient = new CloudAgentsApiClient(apiKey);
  const workingDir = process.cwd();

  const context: CommandContext = {
    apiClient,
    workingDir,
  };

  const program = createProgram(VERSION, context);

  const hasCommand =
    args.length > 0 &&
    !args[0].startsWith("-") &&
    program.commands.some((cmd) => cmd.name() === args[0]);

  const isTTY = process.stdin.isTTY;

  if (!hasCommand) {
    if (!isNonInteractive && isTTY) {
      await showInteractiveMenu(apiClient, context);
      return;
    } else {
      program.help();
      return;
    }
  }

  await program.parseAsync(process.argv);
}

main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error("Error:", error.message || error);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
  } else {
    console.error("Error:", error);
  }
  process.exit(1);
});
