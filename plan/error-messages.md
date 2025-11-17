# Error Message Standardization Plan

## Overview

This plan standardizes error messages across the Cloud Agents CLI to ensure consistency, clarity, and actionability. All error messages should follow a unified format and provide clear guidance to users on how to resolve issues.

## Goals

1. **Consistency**: All error messages follow the same format and structure
2. **Clarity**: Error messages are clear and easy to understand
3. **Actionability**: Error messages provide specific guidance on how to fix issues
4. **User-Friendly**: Technical details are hidden unless needed, with plain language used
5. **Context-Aware**: Error messages adapt to the context (CLI vs interactive UI)

## Error Message Format

### Standard Format

```
[Error Type]: [Brief Description]

[Detailed explanation if needed]

[Actionable steps to resolve]
```

### Format Guidelines

- **Error Type**: Use a short, descriptive label (e.g., "Authentication Error", "File Not Found")
- **Brief Description**: One-line summary of what went wrong
- **Detailed Explanation**: Optional, only if needed for clarity
- **Actionable Steps**: Clear instructions on how to fix the issue

### Examples

**Good:**
```
Authentication Error: Invalid API key

Your CURSOR_API_KEY appears to be invalid or expired.

To fix this:
1. Get a new API key from https://cursor.com/settings
2. Set it with: export CURSOR_API_KEY=your_api_key
```

**Bad:**
```
Error: 401 Unauthorized
```

## Error Categories

### 1. Authentication Errors

**Category**: `AUTH_ERROR`

**Error Codes**:
- `AUTH_MISSING_KEY`: API key not provided
- `AUTH_INVALID_KEY`: API key is invalid or expired
- `AUTH_UNAUTHORIZED`: API key doesn't have required permissions

**Standard Messages**:

```typescript
AUTH_MISSING_KEY: {
  title: "Authentication Error",
  message: "CURSOR_API_KEY environment variable is not set",
  details: "The CLI requires an API key to authenticate with the Cursor API.",
  actions: [
    "Get an API key from https://cursor.com/settings",
    "Set it with: export CURSOR_API_KEY=your_api_key",
    "Or add it to your shell profile (~/.bashrc, ~/.zshrc, etc.)"
  ]
}

AUTH_INVALID_KEY: {
  title: "Authentication Error",
  message: "Invalid or expired API key",
  details: "Your CURSOR_API_KEY appears to be invalid or expired.",
  actions: [
    "Verify your API key at https://cursor.com/settings",
    "Generate a new API key if needed",
    "Update it with: export CURSOR_API_KEY=your_new_key"
  ]
}

AUTH_UNAUTHORIZED: {
  title: "Authentication Error",
  message: "API key does not have required permissions",
  details: "Your API key is valid but doesn't have permission to perform this action.",
  actions: [
    "Check your API key permissions at https://cursor.com/settings",
    "Ensure the key has 'Cloud Agents' access enabled"
  ]
}
```

### 2. Network Errors

**Category**: `NETWORK_ERROR`

**Error Codes**:
- `NETWORK_CONNECTION_FAILED`: Cannot connect to API
- `NETWORK_TIMEOUT`: Request timed out
- `NETWORK_DNS_FAILED`: DNS resolution failed
- `NETWORK_RATE_LIMIT`: Rate limit exceeded

**Standard Messages**:

```typescript
NETWORK_CONNECTION_FAILED: {
  title: "Connection Error",
  message: "Failed to connect to Cursor API",
  details: "Unable to establish a connection to api.cursor.com. This is usually a network issue.",
  actions: [
    "Check your internet connection",
    "Verify you can access https://api.cursor.com",
    "Check if you're behind a firewall or proxy",
    "Try again in a few moments"
  ]
}

NETWORK_TIMEOUT: {
  title: "Connection Error",
  message: "Request timed out",
  details: "The API request took too long to complete.",
  actions: [
    "Check your internet connection",
    "Try again in a few moments",
    "If the problem persists, the API may be experiencing issues"
  ]
}

NETWORK_DNS_FAILED: {
  title: "Connection Error",
  message: "Failed to resolve API hostname",
  details: "Unable to resolve api.cursor.com. This may be a DNS or network issue.",
  actions: [
    "Check your internet connection",
    "Verify your DNS settings",
    "Try using a different network",
    "Check if api.cursor.com is accessible"
  ]
}

NETWORK_RATE_LIMIT: {
  title: "Rate Limit Exceeded",
  message: "Too many requests",
  details: "You've exceeded the API rate limit. Please wait before making more requests.",
  actions: [
    "Wait a few moments before trying again",
    "Check the rate limits at https://cursor.com/docs/cloud-agent/api/endpoints",
    "Consider reducing the frequency of your requests"
  ],
  // Include retry-after if available
  retryAfter?: number
}
```

### 3. Validation Errors

**Category**: `VALIDATION_ERROR`

**Error Codes**:
- `VALIDATION_REPO_URL`: Invalid repository URL
- `VALIDATION_REF`: Invalid git ref
- `VALIDATION_FILE_PATH`: Invalid file path
- `VALIDATION_AGENT_ID`: Invalid agent ID
- `VALIDATION_MISSING_REQUIRED`: Missing required parameter

**Standard Messages**:

```typescript
VALIDATION_REPO_URL: {
  title: "Validation Error",
  message: "Invalid repository URL",
  details: "The repository URL format is incorrect.",
  actions: [
    "Use format: https://github.com/org/repo",
    "Or SSH format: git@github.com:org/repo",
    "Ensure the repository exists and is accessible"
  ],
  providedValue?: string
}

VALIDATION_REF: {
  title: "Validation Error",
  message: "Invalid git ref",
  details: "The git ref (branch, tag, or commit) is invalid.",
  actions: [
    "Ensure the ref exists in the repository",
    "Use a valid branch name, tag, or commit hash",
    "Avoid special characters in branch names"
  ],
  providedValue?: string
}

VALIDATION_FILE_PATH: {
  title: "Validation Error",
  message: "Invalid file path",
  details: "The file path is invalid or cannot be accessed.",
  actions: [
    "Check that the file exists",
    "Use an absolute path or a path relative to the current directory",
    "Ensure you have read permissions for the file"
  ],
  providedValue?: string
}

VALIDATION_AGENT_ID: {
  title: "Validation Error",
  message: "Invalid agent ID",
  details: "The agent ID format is incorrect.",
  actions: [
    "Agent IDs should start with 'bc_'",
    "Example: bc_abc123def456",
    "Check the agent ID from the list command"
  ],
  providedValue?: string
}

VALIDATION_MISSING_REQUIRED: {
  title: "Validation Error",
  message: "Missing required parameter",
  details: "A required parameter was not provided.",
  actions: [
    "Check the command usage with: cloud-agent --help",
    "Ensure all required flags are provided"
  ],
  missingParam: string
}
```

### 4. File System Errors

**Category**: `FILE_ERROR`

**Error Codes**:
- `FILE_NOT_FOUND`: File doesn't exist
- `FILE_READ_ERROR`: Cannot read file
- `FILE_PERMISSION_DENIED`: No read permission
- `FILE_EMPTY`: File is empty

**Standard Messages**:

```typescript
FILE_NOT_FOUND: {
  title: "File Error",
  message: "File not found",
  details: "The specified file does not exist.",
  actions: [
    "Check that the file path is correct",
    "Use an absolute path or a path relative to the current directory",
    "Verify the file exists with: ls <file-path>"
  ],
  filePath: string
}

FILE_READ_ERROR: {
  title: "File Error",
  message: "Failed to read file",
  details: "An error occurred while reading the file.",
  actions: [
    "Check that the file exists",
    "Ensure you have read permissions",
    "Verify the file is not corrupted"
  ],
  filePath: string,
  originalError?: string
}

FILE_PERMISSION_DENIED: {
  title: "File Error",
  message: "Permission denied",
  details: "You don't have permission to read this file.",
  actions: [
    "Check file permissions with: ls -l <file-path>",
    "Request read access from the file owner",
    "Or run the command with appropriate permissions"
  ],
  filePath: string
}

FILE_EMPTY: {
  title: "File Error",
  message: "File is empty",
  details: "The specified file contains no content.",
  actions: [
    "Ensure the file has content",
    "Check that the file was saved correctly"
  ],
  filePath: string
}
```

### 5. Git Detection Errors

**Category**: `GIT_ERROR`

**Error Codes**:
- `GIT_NOT_REPOSITORY`: Not a git repository
- `GIT_NO_REMOTE`: No remote configured
- `GIT_INVALID_REMOTE`: Invalid remote URL
- `GIT_DETECTION_FAILED`: Git detection failed

**Standard Messages**:

```typescript
GIT_NOT_REPOSITORY: {
  title: "Git Error",
  message: "Not a git repository",
  details: "The current directory is not a git repository.",
  actions: [
    "Navigate to a git repository directory",
    "Or provide --repo and --ref flags explicitly",
    "Example: cloud-agent launch --plan plan.md --repo https://github.com/org/repo --ref main"
  ],
  workingDir: string
}

GIT_NO_REMOTE: {
  title: "Git Error",
  message: "No remote configured",
  details: "The git repository doesn't have a remote origin configured.",
  actions: [
    "Add a remote with: git remote add origin <url>",
    "Or provide --repo and --ref flags explicitly"
  ],
  workingDir: string
}

GIT_INVALID_REMOTE: {
  title: "Git Error",
  message: "Invalid remote URL",
  details: "The git remote URL format is not supported.",
  actions: [
    "Ensure the remote URL is in HTTPS or SSH format",
    "Or provide --repo flag explicitly",
    "Example: --repo https://github.com/org/repo"
  ],
  remoteUrl: string
}

GIT_DETECTION_FAILED: {
  title: "Git Error",
  message: "Failed to detect git information",
  details: "Unable to automatically detect repository and ref from git.",
  actions: [
    "Provide --repo and --ref flags explicitly",
    "Example: cloud-agent launch --plan plan.md --repo https://github.com/org/repo --ref main",
    "Or ensure you're in a properly configured git repository"
  ],
  workingDir: string
}
```

### 6. API Errors

**Category**: `API_ERROR`

**Error Codes**:
- `API_BAD_REQUEST`: Invalid request (400)
- `API_NOT_FOUND`: Resource not found (404)
- `API_SERVER_ERROR`: Server error (500+)
- `API_UNKNOWN`: Unknown API error

**Standard Messages**:

```typescript
API_BAD_REQUEST: {
  title: "API Error",
  message: "Invalid request",
  details: "The API request was malformed or contained invalid parameters.",
  actions: [
    "Check your input parameters",
    "Verify repository URL and ref are correct",
    "Check the API documentation: https://cursor.com/docs/cloud-agent/api/endpoints"
  ],
  apiMessage?: string
}

API_NOT_FOUND: {
  title: "API Error",
  message: "Resource not found",
  details: "The requested resource (agent, repository, etc.) was not found.",
  actions: [
    "Verify the resource ID is correct",
    "Check that the resource exists",
    "Ensure you have access to the resource"
  ],
  resourceType?: string,
  resourceId?: string
}

API_SERVER_ERROR: {
  title: "API Error",
  message: "Server error",
  details: "The API server encountered an error processing your request.",
  actions: [
    "Try again in a few moments",
    "Check the Cursor status page for service issues",
    "If the problem persists, contact support"
  ],
  statusCode: number
}

API_UNKNOWN: {
  title: "API Error",
  message: "Unexpected API error",
  details: "An unexpected error occurred while communicating with the API.",
  actions: [
    "Try again in a few moments",
    "Check your internet connection",
    "If the problem persists, contact support"
  ],
  statusCode?: number,
  apiMessage?: string
}
```

### 7. Command Errors

**Category**: `COMMAND_ERROR`

**Error Codes**:
- `COMMAND_UNKNOWN`: Unknown command
- `COMMAND_MISSING_ARG`: Missing required argument
- `COMMAND_INVALID_USAGE`: Invalid command usage

**Standard Messages**:

```typescript
COMMAND_UNKNOWN: {
  title: "Command Error",
  message: "Unknown command",
  details: "The command you entered is not recognized.",
  actions: [
    "Check available commands with: cloud-agent --help",
    "See usage examples in the help text"
  ],
  command: string
}

COMMAND_MISSING_ARG: {
  title: "Command Error",
  message: "Missing required argument",
  details: "A required argument is missing for this command.",
  actions: [
    "Check command usage with: cloud-agent <command> --help",
    "Ensure all required arguments are provided"
  ],
  command: string,
  missingArg: string
}

COMMAND_INVALID_USAGE: {
  title: "Command Error",
  message: "Invalid command usage",
  details: "The command was used incorrectly.",
  actions: [
    "Check command usage with: cloud-agent --help",
    "Review the examples in the help text"
  ],
  command: string,
  details?: string
}
```

## Implementation Strategy

### Phase 1: Create Error Message Utility

**File**: `src/utils/errors.ts`

Create a centralized error message utility that:
- Defines all error types and messages
- Provides formatting functions for different contexts (CLI vs UI)
- Handles error code mapping
- Provides consistent formatting

**Key Functions**:
```typescript
export function formatError(error: CliError, context: 'cli' | 'ui'): string
export function getErrorActions(error: CliError): string[]
export function createError(code: ErrorCode, context?: Record<string, unknown>): CliError
```

### Phase 2: Update API Client

**File**: `src/api/client.ts`

- Map HTTP status codes to error codes
- Use standardized error messages
- Include actionable steps in errors
- Preserve API-provided error messages when available

### Phase 3: Update Components

**Files**: All component files

- Replace inline error messages with standardized ones
- Use error utility for consistent formatting
- Display actionable steps in UI components
- Ensure errors are user-friendly

### Phase 4: Update CLI Entry Point

**File**: `cloud-agent.tsx`

- Use standardized error messages
- Format errors appropriately for CLI context
- Provide clear help text in error messages

### Phase 5: Update Utilities

**Files**: `src/utils/file.ts`, `src/utils/git.ts`, `src/utils/validation.ts`

- Use standardized error messages
- Provide actionable steps
- Include context in error messages

## Error Display Contexts

### CLI Context (Non-Interactive)

**Format**:
```
Error: [Title]
[Message]

[Details if needed]

To fix this:
[Action 1]
[Action 2]
[Action 3]
```

**Example**:
```
Error: Authentication Error
CURSOR_API_KEY environment variable is not set

The CLI requires an API key to authenticate with the Cursor API.

To fix this:
1. Get an API key from https://cursor.com/settings
2. Set it with: export CURSOR_API_KEY=your_api_key
3. Or add it to your shell profile (~/.bashrc, ~/.zshrc, etc.)
```

### Interactive UI Context

**Format**:
```
✗ [Title]
[Message]

[Details if needed]

Press 'q' to go back
```

**Example**:
```
✗ Authentication Error
Invalid or expired API key

Your CURSOR_API_KEY appears to be invalid or expired.

Press 'q' to go back
```

For interactive UI, actionable steps can be shown in a collapsible section or on a separate screen.

## Error Codes Enum

```typescript
export enum ErrorCode {
  // Authentication
  AUTH_MISSING_KEY = 'AUTH_MISSING_KEY',
  AUTH_INVALID_KEY = 'AUTH_INVALID_KEY',
  AUTH_UNAUTHORIZED = 'AUTH_UNAUTHORIZED',
  
  // Network
  NETWORK_CONNECTION_FAILED = 'NETWORK_CONNECTION_FAILED',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_DNS_FAILED = 'NETWORK_DNS_FAILED',
  NETWORK_RATE_LIMIT = 'NETWORK_RATE_LIMIT',
  
  // Validation
  VALIDATION_REPO_URL = 'VALIDATION_REPO_URL',
  VALIDATION_REF = 'VALIDATION_REF',
  VALIDATION_FILE_PATH = 'VALIDATION_FILE_PATH',
  VALIDATION_AGENT_ID = 'VALIDATION_AGENT_ID',
  VALIDATION_MISSING_REQUIRED = 'VALIDATION_MISSING_REQUIRED',
  
  // File System
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  FILE_PERMISSION_DENIED = 'FILE_PERMISSION_DENIED',
  FILE_EMPTY = 'FILE_EMPTY',
  
  // Git
  GIT_NOT_REPOSITORY = 'GIT_NOT_REPOSITORY',
  GIT_NO_REMOTE = 'GIT_NO_REMOTE',
  GIT_INVALID_REMOTE = 'GIT_INVALID_REMOTE',
  GIT_DETECTION_FAILED = 'GIT_DETECTION_FAILED',
  
  // API
  API_BAD_REQUEST = 'API_BAD_REQUEST',
  API_NOT_FOUND = 'API_NOT_FOUND',
  API_SERVER_ERROR = 'API_SERVER_ERROR',
  API_UNKNOWN = 'API_UNKNOWN',
  
  // Command
  COMMAND_UNKNOWN = 'COMMAND_UNKNOWN',
  COMMAND_MISSING_ARG = 'COMMAND_MISSING_ARG',
  COMMAND_INVALID_USAGE = 'COMMAND_INVALID_USAGE',
}
```

## Testing Checklist

- [ ] All error messages follow the standard format
- [ ] Error messages are clear and actionable
- [ ] Error messages display correctly in CLI context
- [ ] Error messages display correctly in interactive UI context
- [ ] Error codes are consistent across the codebase
- [ ] API errors preserve original messages when available
- [ ] Network errors provide helpful troubleshooting steps
- [ ] Validation errors show what was wrong and how to fix it
- [ ] File errors include file paths and permission guidance
- [ ] Git errors provide fallback options (manual flags)
- [ ] Authentication errors include setup instructions
- [ ] Rate limit errors include retry information

## Migration Guide

1. **Identify all error messages** in the codebase
2. **Map to error codes** using the enum
3. **Replace inline messages** with error utility calls
4. **Test each error path** to ensure messages display correctly
5. **Update documentation** with new error message format

## Future Enhancements

- Error logging for debugging
- Error reporting mechanism
- Localized error messages (i18n)
- Error analytics to identify common issues
- Interactive error resolution (suggest fixes automatically)

