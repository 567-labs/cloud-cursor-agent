/**
 * Build script for cloud-agent CLI
 * Uses Bun's built-in bundler to create a single executable
 */

declare module "bun" {
  export type BuildLogLevel = "info" | "warn" | "error";

  export interface BuildLog {
    level: BuildLogLevel;
    message: string;
    name?: string;
    location?: {
      file?: string;
      line?: number;
      column?: number;
    };
  }

  export interface BuildOptions {
    entrypoints: string[];
    outdir?: string;
    target?: "bun" | "node" | "browser";
    format?: "esm" | "cjs";
    minify?: boolean;
    sourcemap?: "none" | "inline" | "external";
    external?: string[];
  }

  export interface BuildResult {
    success: boolean;
    logs: BuildLog[];
  }

  export function build(options: BuildOptions): Promise<BuildResult>;
}

import { build } from "bun";
import { chmod } from "fs/promises";
import { join } from "path";

import type { BuildLog, BuildResult } from "bun";

async function buildCli() {
  try {
    const result: BuildResult = await build({
      entrypoints: ["cloud-agent.tsx"],
      outdir: ".",
      target: "node",
      format: "esm",
      minify: false,
      sourcemap: "external",
      external: ["yoga-wasm-web", "react-devtools-core", "ink", "react"],
    });

    if (!result.success) {
      console.error("Build failed:");
      result.logs.forEach((log: BuildLog) => {
        console.error(log);
      });
      throw new Error("Build failed");
    }

    // Bun outputs files based on entrypoint names
    // cloud-agent.tsx -> cloud-agent.js
    // We need to rename it to cli.js
    const outputFile = "cloud-agent.js";
    const finalFile = "cli.js";

    const fs = await import("fs/promises");
    try {
      // Check if output file exists
      await fs.access(outputFile);
      // Rename to cli.js
      await fs.rename(outputFile, finalFile);
    } catch (err) {
      // Check if cli.js already exists (maybe from previous build)
      try {
        await fs.access(finalFile);
        console.log("Note: cli.js already exists, keeping existing file");
      } catch {
        throw new Error(`Build output file not found: ${outputFile}`);
      }
    }

    // Make the output file executable
    await chmod(join(process.cwd(), finalFile), 0o755);

    // Add shebang to the file
    const fileContent = await fs.readFile(finalFile, "utf-8");
    if (!fileContent.startsWith("#!/usr/bin/env node")) {
      await fs.writeFile(finalFile, "#!/usr/bin/env node\n" + fileContent);
    }

    console.log("✓ Build complete: cli.js");
    console.log("  The CLI is ready to use. Make sure CURSOR_API_KEY is set.");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

buildCli();
