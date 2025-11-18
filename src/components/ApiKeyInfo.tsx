/**
 * ApiKeyInfo component
 * Displays API key information
 */

import React, { useEffect, useState, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import { CloudAgentsApiClient, ApiError } from "../api/client.js";
import { Spinner } from "./Spinner.js";
import { useTerminalDimensions } from "../hooks/useTerminalDimensions.js";
import { clampWidth } from "../utils/formatting.js";
import type { ApiKeyInfo } from "../api/schemas.js";

interface ApiKeyInfoProps {
  apiClient: CloudAgentsApiClient;
  onBack: () => void;
}

export function ApiKeyInfo({ apiClient, onBack }: ApiKeyInfoProps) {
  const { terminalWidth, terminalHeight } = useTerminalDimensions();
  const [info, setInfo] = useState<ApiKeyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate separator width accounting for padding
  const separatorWidth = useMemo(
    () => clampWidth(terminalWidth - 4, 20),
    [terminalWidth]
  );

  // Calculate available height accounting for header (2 lines), separator (1 line),
  // footer (1 line), and padding (2 lines) = 6 lines total
  // This component is simple and unlikely to overflow, but we track it for consistency
  const availableHeight = useMemo(
    () => Math.max(5, terminalHeight - 6),
    [terminalHeight]
  );

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

  if (loading) {
    return (
      <Box padding={1} width={terminalWidth}>
        <Spinner text="Loading API key information..." />
      </Box>
    );
  }

  if (error) {
    return (
      <Box padding={1} flexDirection="column" width={terminalWidth}>
        <Text color="red">✗ Error: {error}</Text>
        <Box marginTop={1}>
          <Text color="gray">Press 'q' to go back</Text>
        </Box>
      </Box>
    );
  }

  if (!info) {
    return (
      <Box padding={1} flexDirection="column" width={terminalWidth}>
        <Text color="gray">No API key information available</Text>
        <Box marginTop={1}>
          <Text color="gray">Press 'q' to go back</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1} width={terminalWidth}>
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
