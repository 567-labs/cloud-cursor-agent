import { test, expect, describe } from "bun:test";
import {
  validateRepositoryUrl,
  validateRef,
  validateFilePath,
  validateAgentId,
  validateApiKey,
  validateBranchName,
  validatePlanFilePath,
  validatePlanContent,
} from "./validation.js";

describe("validateRepositoryUrl", () => {
  test("returns error for empty or missing URL", () => {
    // Empty string is falsy, so it returns "required" error
    expect(validateRepositoryUrl("")).toEqual({
      valid: false,
      error: "Repository URL is required.",
    });
    expect(validateRepositoryUrl(null as any)).toEqual({
      valid: false,
      error: "Repository URL is required.",
    });
  });

  test("validates HTTPS GitHub URLs", () => {
    expect(validateRepositoryUrl("https://github.com/owner/repo")).toEqual({
      valid: true,
    });
    expect(validateRepositoryUrl("https://github.com/owner/repo.git")).toEqual({
      valid: true,
    });
  });

  test("rejects non-HTTPS protocols", () => {
    expect(validateRepositoryUrl("http://github.com/owner/repo")).toEqual({
      valid: false,
      error:
        "Use an https:// GitHub URL (e.g., https://github.com/owner/repo).",
    });
  });

  test("rejects non-GitHub hosts", () => {
    expect(validateRepositoryUrl("https://gitlab.com/owner/repo")).toEqual({
      valid: false,
      error: "Only github.com repositories are supported.",
    });
  });

  test("validates SSH GitHub URLs", () => {
    expect(validateRepositoryUrl("git@github.com:owner/repo")).toEqual({
      valid: true,
    });
    expect(validateRepositoryUrl("git@github.com:owner/repo.git")).toEqual({
      valid: true,
    });
  });

  test("validates owner and repo names", () => {
    expect(
      validateRepositoryUrl("https://github.com/valid-owner/valid-repo")
    ).toEqual({ valid: true });
    expect(
      validateRepositoryUrl("https://github.com/invalid owner/repo")
    ).toEqual({
      valid: false,
      error: expect.stringContaining("Owner contains unsupported characters"),
    });
  });

  test("rejects URLs with extra path segments", () => {
    expect(
      validateRepositoryUrl("https://github.com/owner/repo/extra/path")
    ).toEqual({
      valid: false,
      error:
        "Repository URL should only include the owner and repository. Remove extra path segments.",
    });
  });

  test("trims whitespace", () => {
    expect(validateRepositoryUrl("  https://github.com/owner/repo  ")).toEqual({
      valid: true,
    });
  });
});

describe("validateRef", () => {
  test("returns error for empty ref", () => {
    // Empty string is falsy, so it returns "required" error
    expect(validateRef("")).toEqual({
      valid: false,
      error: "Ref is required.",
    });
  });

  test("validates valid ref names", () => {
    expect(validateRef("main")).toEqual({ valid: true });
    expect(validateRef("feature/login")).toEqual({ valid: true });
    expect(validateRef("v1.0.0")).toEqual({ valid: true });
  });

  test("rejects refs with invalid characters", () => {
    expect(validateRef("ref with spaces")).toEqual({
      valid: false,
      error: expect.stringContaining("cannot contain spaces"),
    });
    expect(validateRef("ref~invalid")).toEqual({
      valid: false,
      error: expect.stringContaining("cannot contain"),
    });
  });

  test("rejects refs starting or ending with slash", () => {
    expect(validateRef("/ref")).toEqual({
      valid: false,
      error: "Ref cannot start or end with a slash.",
    });
    expect(validateRef("ref/")).toEqual({
      valid: false,
      error: "Ref cannot start or end with a slash.",
    });
  });

  test("rejects refs with consecutive slashes", () => {
    expect(validateRef("ref//invalid")).toEqual({
      valid: false,
      error: "Ref cannot contain consecutive slashes.",
    });
  });

  test("rejects refs starting or ending with period", () => {
    expect(validateRef(".ref")).toEqual({
      valid: false,
      error: "Ref cannot start, end, or contain consecutive periods.",
    });
    expect(validateRef("ref.")).toEqual({
      valid: false,
      error: "Ref cannot start, end, or contain consecutive periods.",
    });
  });

  test("rejects refs ending with .lock", () => {
    expect(validateRef("ref.lock")).toEqual({
      valid: false,
      error: "Ref cannot end with '.lock'.",
    });
  });

  test("rejects refs longer than 255 characters", () => {
    const longRef = "a".repeat(256);
    expect(validateRef(longRef)).toEqual({
      valid: false,
      error: "Ref cannot exceed 255 characters.",
    });
  });
});

describe("validateFilePath", () => {
  test("returns error for empty path", () => {
    // Empty string is falsy, so it returns "required" error
    expect(validateFilePath("")).toEqual({
      valid: false,
      error: "File path is required.",
    });
  });

  test("validates valid file paths", () => {
    expect(validateFilePath("./plan.md")).toEqual({ valid: true });
    expect(validateFilePath("/absolute/path/file.txt")).toEqual({
      valid: true,
    });
  });

  test("trims whitespace", () => {
    expect(validateFilePath("  plan.md  ")).toEqual({ valid: true });
  });
});

describe("validateAgentId", () => {
  test("returns error for empty ID", () => {
    // Empty string is falsy, so it returns "required" error
    expect(validateAgentId("")).toEqual({
      valid: false,
      error: "Agent ID is required.",
    });
  });

  test("validates old format agent IDs", () => {
    expect(validateAgentId("bc_abc123")).toEqual({ valid: true });
    expect(validateAgentId("bc_test456")).toEqual({ valid: true });
  });

  test("validates new UUID format agent IDs", () => {
    expect(validateAgentId("bc-abc123-def456")).toEqual({ valid: true });
    expect(validateAgentId("bc-0f67d001-fb58-458f-a525-7d834a1b7c2e")).toEqual({
      valid: true,
    });
  });

  test("rejects invalid agent IDs", () => {
    expect(validateAgentId("invalid")).toEqual({
      valid: false,
      error: expect.stringContaining("Agent ID must look like"),
    });
    expect(validateAgentId("bc_")).toEqual({
      valid: false,
      error: expect.stringContaining("Agent ID must look like"),
    });
  });

  test("is case-insensitive", () => {
    expect(validateAgentId("BC_ABC123")).toEqual({ valid: true });
    expect(validateAgentId("BC-ABC123")).toEqual({ valid: true });
  });
});

describe("validateApiKey", () => {
  test("returns error for empty key", () => {
    expect(validateApiKey("")).toEqual({
      valid: false,
      error: "API key is required.",
    });
  });

  test("rejects keys shorter than 10 characters", () => {
    expect(validateApiKey("short")).toEqual({
      valid: false,
      error: "API key appears to be invalid (too short).",
    });
  });

  test("validates keys longer than 10 characters", () => {
    expect(validateApiKey("sk-proj-1234567890")).toEqual({ valid: true });
  });

  test("trims whitespace", () => {
    expect(validateApiKey("  sk-proj-1234567890  ")).toEqual({
      valid: true,
    });
  });
});

describe("validateBranchName", () => {
  test("validates valid branch names", () => {
    expect(validateBranchName("feature/login")).toEqual({ valid: true });
    expect(validateBranchName("main")).toEqual({ valid: true });
  });

  test("rejects HEAD as branch name", () => {
    expect(validateBranchName("HEAD")).toEqual({
      valid: false,
      error: "Branch name cannot be 'HEAD' because it is reserved by git.",
    });
  });

  test("rejects refs/ prefix", () => {
    expect(validateBranchName("refs/heads/main")).toEqual({
      valid: false,
      error: expect.stringContaining("without the 'refs/' prefix"),
    });
  });

  test("requires at least one letter", () => {
    expect(validateBranchName("123456")).toEqual({
      valid: false,
      error: expect.stringContaining("should include at least one letter"),
    });
  });

  test("inherits ref validation rules", () => {
    expect(validateBranchName("branch with spaces")).toEqual({
      valid: false,
      error: expect.stringContaining("Branch name"),
    });
  });
});

describe("validatePlanFilePath", () => {
  test("returns error for empty path", () => {
    expect(validatePlanFilePath("")).toEqual({
      valid: false,
      error: "Plan file path is required.",
    });
  });

  test("validates paths with valid extensions", () => {
    expect(validatePlanFilePath("plan.md")).toEqual({ valid: true });
    expect(validatePlanFilePath("plan.markdown")).toEqual({ valid: true });
    expect(validatePlanFilePath("plan.plan")).toEqual({ valid: true });
    expect(validatePlanFilePath("plan.txt")).toEqual({ valid: true });
  });

  test("rejects paths without valid extensions", () => {
    expect(validatePlanFilePath("plan.js")).toEqual({
      valid: false,
      error: expect.stringContaining(
        "must end with one of the following extensions"
      ),
    });
  });

  test("rejects paths ending with directory separators", () => {
    expect(validatePlanFilePath("plan.md/")).toEqual({
      valid: false,
      error: "Plan file path must point to a file, not a directory.",
    });
  });

  test("rejects paths with invalid characters", () => {
    expect(validatePlanFilePath("plan<file>.md")).toEqual({
      valid: false,
      error: expect.stringContaining(
        "cannot include any of the following characters"
      ),
    });
  });

  test("is case-insensitive for extensions", () => {
    expect(validatePlanFilePath("plan.MD")).toEqual({ valid: true });
    expect(validatePlanFilePath("plan.MARKDOWN")).toEqual({ valid: true });
  });
});

describe("validatePlanContent", () => {
  test("returns error for empty content", () => {
    expect(validatePlanContent("")).toEqual({
      valid: false,
      error: "Plan content is required.",
    });
  });

  test("returns error for content with only frontmatter", () => {
    expect(validatePlanContent("---\ntitle: Plan\n---\n")).toEqual({
      valid: false,
      error:
        "Plan content only contains frontmatter. Add the actual plan under the metadata.",
    });
  });

  test("returns error for content that is too short", () => {
    expect(validatePlanContent("Short")).toEqual({
      valid: false,
      error:
        "Plan content is too short. Add a few sentences or bullet points describing the work.",
    });
  });

  test("returns error for placeholder content", () => {
    expect(validatePlanContent("TODO")).toEqual({
      valid: false,
      error:
        "Plan content is too short. Add a few sentences or bullet points describing the work.",
    });
    expect(validatePlanContent("TBD")).toEqual({
      valid: false,
      error:
        "Plan content is too short. Add a few sentences or bullet points describing the work.",
    });
  });

  test("returns error for content without structure", () => {
    expect(
      validatePlanContent("This is just a paragraph without any structure")
    ).toEqual({
      valid: false,
      error:
        "Plan content should include at least one heading or bullet so it can be parsed.",
    });
  });

  test("validates content with headings", () => {
    expect(
      validatePlanContent(
        "# Plan\n\nThis is a detailed plan with multiple sentences."
      )
    ).toEqual({
      valid: true,
    });
  });

  test("validates content with bullets", () => {
    expect(
      validatePlanContent(
        "- Step 1\n- Step 2\n- Step 3\n\nDetailed description."
      )
    ).toEqual({ valid: true });
  });

  test("validates content with numbered list", () => {
    expect(
      validatePlanContent("1. Step 1\n2. Step 2\n\nDetailed description.")
    ).toEqual({ valid: true });
  });

  test("strips frontmatter before validation", () => {
    expect(
      validatePlanContent(
        "---\ntitle: Plan\n---\n# Plan\n\nThis is a detailed plan."
      )
    ).toEqual({ valid: true });
  });
});
