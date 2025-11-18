/**
 * Tests for install-agents-md command
 */

import { test, expect, beforeEach, afterEach } from "bun:test";
import { readFile, writeFile, access } from "fs/promises";
import { resolve, join } from "path";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { executeInstallAgentsMd } from "./install-agents-md.js";
import { createMockApiClient } from "../test/utils.jsx";
import type { CommandContext } from "../cli/types.js";

describe("install-agents-md", () => {
  let tempDir: string;
  let context: CommandContext;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "install-agents-md-test-"));
    context = {
      apiClient: createMockApiClient(),
      workingDir: tempDir,
    };
  });

  afterEach(async () => {
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  test("creates AGENTS.md file if it doesn't exist", async () => {
    const targetFile = join(tempDir, "AGENTS.md");

    await executeInstallAgentsMd(context, { file: "AGENTS.md" });

    // Check file exists
    await expect(access(targetFile)).resolves.not.toThrow();

    // Check content includes expected sections
    const content = await readFile(targetFile, "utf-8");
    expect(content).toContain("## CLI Usage for AI Agents");
    expect(content).toContain("## How to Think About Making Plans");
    expect(content).toContain("## How to Kick Off Plans");
    expect(content).toContain("### Launch Command");
  });

  test("appends to existing AGENTS.md file", async () => {
    const targetFile = join(tempDir, "AGENTS.md");
    const existingContent = "# Existing Content\n\nSome existing text.\n";

    await writeFile(targetFile, existingContent, "utf-8");

    await executeInstallAgentsMd(context, { file: "AGENTS.md" });

    const content = await readFile(targetFile, "utf-8");
    expect(content).toContain(existingContent.trim());
    expect(content).toContain("## CLI Usage for AI Agents");
  });

  test("replaces existing CLI Usage section if present", async () => {
    const targetFile = join(tempDir, "AGENTS.md");
    const existingContent = `# Cloud Agents Documentation

## CLI Usage for AI Agents

Old content here

## Other Section
Some other content
`;

    await writeFile(targetFile, existingContent, "utf-8");

    await executeInstallAgentsMd(context, { file: "AGENTS.md" });

    const content = await readFile(targetFile, "utf-8");
    expect(content).toContain("## CLI Usage for AI Agents");
    expect(content).not.toContain("Old content here");
    expect(content).toContain("## Other Section");
    expect(content).toContain("Some other content");
  });

  test("uses custom file path when provided", async () => {
    const customFile = join(tempDir, "custom-agents.md");

    await executeInstallAgentsMd(context, { file: "custom-agents.md" });

    await expect(access(customFile)).resolves.not.toThrow();
    const content = await readFile(customFile, "utf-8");
    expect(content).toContain("## CLI Usage for AI Agents");
  });

  test("includes launch command documentation when available", async () => {
    await executeInstallAgentsMd(context, {});

    const content = await readFile(join(tempDir, "AGENTS.md"), "utf-8");
    expect(content).toContain("### Launch Command");
    expect(content).toContain("bun run cloud-agent.tsx launch --plan");
  });

  test("includes watch command documentation when available", async () => {
    await executeInstallAgentsMd(context, {});

    const content = await readFile(join(tempDir, "AGENTS.md"), "utf-8");
    expect(content).toContain("### Watch Command");
    expect(content).toContain("bun run cloud-agent.tsx watch");
  });

  test("includes planning guidance", async () => {
    await executeInstallAgentsMd(context, {});

    const content = await readFile(join(tempDir, "AGENTS.md"), "utf-8");
    expect(content).toContain("## How to Think About Making Plans");
    expect(content).toContain("Plan Structure");
    expect(content).toContain("Parallelization Rules");
  });

  test("includes important notes for AI agents", async () => {
    await executeInstallAgentsMd(context, {});

    const content = await readFile(join(tempDir, "AGENTS.md"), "utf-8");
    expect(content).toContain("### Important Notes for AI Agents");
    expect(content).toContain("--non-interactive");
    expect(content).toContain("Parallelization");
  });
});
