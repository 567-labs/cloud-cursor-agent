/**
 * QuickLaunch component
 * Non-interactive component for background agent launches
 * Outputs only the agent URL and exits immediately
 */

import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import { CloudAgentsApiClient, ApiError } from "../api/client.js";
import type { LaunchAgentRequest } from "../types/api.js";

interface QuickLaunchProps {
  /** API client instance */
  apiClient: CloudAgentsApiClient;
  /** Plan file content */
  planContent: string;
  /** Repository URL */
  repository: string;
  /** Git ref (branch, tag, or commit) */
  ref: string;
  /** Optional branch name for target */
  branchName?: string;
  /** Whether to auto-create PR */
  autoCreatePr?: boolean;
  /** Optional model name */
  model?: string;
  /** Verbose mode - show more output */
  verbose?: boolean;
}

export function QuickLaunch({
  apiClient,
  planContent,
  repository,
  ref,
  branchName,
  autoCreatePr,
  model,
  verbose = false,
}: QuickLaunchProps) {
  const [error, setError] = useState<string | null>(null);
  const [agentUrl, setAgentUrl] = useState<string | null>(null);
  const [shouldExit, setShouldExit] = useState(false);

  useEffect(() => {
    async function launch() {
      try {
        if (verbose) {
          console.error("Launching agent...");
          console.error("──────────────────");
          console.error(`Repository: ${repository} (auto-detected)`);
          console.error(`Ref: ${ref} (auto-detected)`);
          console.error("");
        }

        const request: LaunchAgentRequest = {
          prompt: {
            text: planContent,
          },
          source: {
            repository,
            ref,
          },
          target: {
            branchName,
            autoCreatePr,
          },
          model: model || undefined,
        };

        const agent = await apiClient.launchAgent(request);

        if (verbose) {
          console.error("✓ Agent launched successfully!");
          console.error("");
        }

        setAgentUrl(agent.target.url);
        
        // Exit after a short delay to ensure URL is displayed
        setTimeout(() => {
          setShouldExit(true);
          process.exit(0);
        }, 100);
      } catch (err) {
        let errorMessage = "Failed to launch agent: Unknown error";
        
        if (err instanceof ApiError) {
          errorMessage = err.message;
        } else if (err instanceof Error) {
          errorMessage = err.message || errorMessage;
        }
        
        setError(errorMessage);
        
        // Exit on error after displaying it
        setTimeout(() => {
          setShouldExit(true);
          process.exit(1);
        }, 100);
      }
    }

    launch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box>
      {error && <Text color="red">{error}</Text>}
      {agentUrl && <Text color="cyan">{agentUrl}</Text>}
      {!error && !agentUrl && <Text>Launching agent...</Text>}
    </Box>
  );
}

