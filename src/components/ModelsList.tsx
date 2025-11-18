/**
 * ModelsList component
 * Displays available models for cloud agents
 */

import React, { useEffect, useState, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import { CloudAgentsApiClient, ApiError } from "../api/client.js";
import { Spinner } from "./Spinner.js";
import { useTerminalDimensions } from "../hooks/useTerminalDimensions.js";
import { clampWidth } from "../utils/formatting.js";
import type { ModelsResponse } from "../api/schemas.js";

interface ModelsListProps {
  apiClient: CloudAgentsApiClient;
  onBack: () => void;
}

export function ModelsList({ apiClient, onBack }: ModelsListProps) {
  const { terminalWidth, terminalHeight } = useTerminalDimensions();
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate separator width accounting for padding
  const separatorWidth = useMemo(
    () => clampWidth(terminalWidth - 4, 20),
    [terminalWidth]
  );

  // Calculate available height accounting for header (2 lines), separator (1 line),
  // tip text (2 lines), footer (1 line), and padding (2 lines) = 8 lines total
  const availableHeight = useMemo(
    () => Math.max(5, terminalHeight - 8),
    [terminalHeight]
  );

  // Limit displayed models to fit within available height (1 line per model)
  const displayedModels = useMemo(
    () => models.slice(0, Math.max(1, availableHeight)),
    [models, availableHeight]
  );

  const hasMoreModels = models.length > displayedModels.length;

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

  if (loading) {
    return (
      <Box padding={1} width={terminalWidth}>
        <Spinner text="Loading models..." />
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

  return (
    <Box flexDirection="column" padding={1} width={terminalWidth}>
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
          {displayedModels.map((model, index) => (
            <Box key={index} marginBottom={0}>
              <Text>
                <Text color="gray"> • </Text>
                <Text>{model}</Text>
              </Text>
            </Box>
          ))}
          {hasMoreModels && (
            <Box marginTop={1}>
              <Text color="gray" dimColor>
                ... and {models.length - displayedModels.length} more model
                {models.length - displayedModels.length === 1 ? "" : "s"}
              </Text>
            </Box>
          )}
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
