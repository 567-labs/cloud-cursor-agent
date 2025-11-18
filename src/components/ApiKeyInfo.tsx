/**
 * ApiKeyInfo component
 * Displays API key information
 */

import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { CloudAgentsApiClient, ApiError } from "../api/client.js";
import { Spinner } from "./Spinner.js";
import type { ApiKeyInfo } from "../api/schemas.js";

interface ApiKeyInfoProps {
  apiClient: CloudAgentsApiClient;
  onBack: () => void;
}

export function ApiKeyInfo({ apiClient, onBack }: ApiKeyInfoProps) {
  const [info, setInfo] = useState<ApiKeyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInfo() {
      try {
        setLoading(true);
        setError(null);
        const keyInfo = await apiClient.getApiKeyInfo();
        setInfo(keyInfo);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to load API key information");
        }
      } finally {
        setLoading(false);
      }
    }

    loadInfo();
  }, [apiClient]);

  useInput((input, key) => {
    if (input === "q" || key.escape) {
      onBack();
    }
  });

  const terminalWidth = process.stdout.columns || 80;
  const separatorWidth = terminalWidth - 4;

  if (loading) {
    return (
      <Box padding={1}>
        <Spinner text="Loading API key information..." />
      </Box>
    );
  }

  if (error) {
    return (
      <Box padding={1} flexDirection="column">
        <Text color="red">✗ Error: {error}</Text>
        <Box marginTop={1}>
          <Text color="gray">Press 'q' to go back</Text>
        </Box>
      </Box>
    );
  }

  if (!info) {
    return (
      <Box padding={1} flexDirection="column">
        <Text color="gray">No API key information available</Text>
        <Box marginTop={1}>
          <Text color="gray">Press 'q' to go back</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold>API Key Information</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color="gray">{"─".repeat(separatorWidth)}</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Box marginBottom={1}>
          <Text>
            <Text color="gray" dimColor>
              Name:{" "}
            </Text>
            <Text>{info.apiKeyName}</Text>
          </Text>
        </Box>
        <Box marginBottom={1}>
          <Text>
            <Text color="gray" dimColor>
              Email:{" "}
            </Text>
            <Text>{info.userEmail}</Text>
          </Text>
        </Box>
        <Box marginBottom={1}>
          <Text>
            <Text color="gray" dimColor>
              Created:{" "}
            </Text>
            <Text>{info.createdAt}</Text>
          </Text>
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text color="gray">Press 'q' to go back</Text>
      </Box>
    </Box>
  );
}
