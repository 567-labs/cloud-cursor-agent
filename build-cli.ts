/**
 * Build script for cloud-agent CLI
 * Uses Bun's built-in bundler to create a single executable
 */

import { build } from "bun";
import { chmod } from "fs/promises";
import { join } from "path";

async function buildCli() {
  try {
    const result = await Bun.build({
      entrypoints: ["cloud-agent.tsx"],
      outdir: ".",
      target: "node",
      format: "esm",
      minify: false,
      sourcemap: "external",
      external: ["react-devtools-core"],
      // Bun automatically handles JSX and TypeScript
    });

    if (!result.success) {
      console.error("Build failed:");
      result.logs.forEach((log) => {
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
