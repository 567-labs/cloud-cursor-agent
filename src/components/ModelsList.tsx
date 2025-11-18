/**
 * ModelsList component
 * Displays available models for cloud agents
 */

import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { CloudAgentsApiClient, ApiError } from "../api/client.js";
import { Spinner } from "./Spinner.js";
import type { ModelsResponse } from "../api/schemas.js";

interface ModelsListProps {
  apiClient: CloudAgentsApiClient;
  onBack: () => void;
}

export function ModelsList({ apiClient, onBack }: ModelsListProps) {
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadModels() {
      try {
        setLoading(true);
        setError(null);
        const response: ModelsResponse = await apiClient.listModels();
        setModels(response.models);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to load models");
        }
      } finally {
        setLoading(false);
      }
    }

    loadModels();
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
        <Spinner text="Loading models..." />
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

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold>Available Models</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color="gray">{"─".repeat(separatorWidth)}</Text>
      </Box>

      {models.length === 0 ? (
        <Box marginBottom={1}>
          <Text color="gray">No models available.</Text>
        </Box>
      ) : (
        <Box flexDirection="column" marginBottom={1}>
          {models.map((model, index) => (
            <Box key={index} marginBottom={0}>
              <Text>
                <Text color="gray"> • </Text>
                <Text>{model}</Text>
              </Text>
            </Box>
          ))}
        </Box>
      )}

      <Box marginTop={1} marginBottom={1}>
        <Text color="gray">{"─".repeat(separatorWidth)}</Text>
      </Box>

      <Box marginTop={1}>
        <Text color="gray" dimColor>
          Tip: Use --model &lt;name&gt; with the launch command to specify a
          model, or omit it to auto-select.
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text color="gray">Press 'q' to go back</Text>
      </Box>
    </Box>
  );
}
