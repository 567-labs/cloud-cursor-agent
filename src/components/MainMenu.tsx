/**
 * MainMenu component
 * Interactive menu for navigating the CLI
 */

import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { useApp } from "ink";
import { useTerminalDimensions } from "../hooks/useTerminalDimensions.js";

interface MainMenuProps {
  onSelectListAgentsAll: () => void;
  onSelectListAgentsRepo: () => void;
  onSelectApiKeyInfo: () => void;
  onSelectListModels: () => void;
  onExit: () => void;
}

export function MainMenu({
  onSelectListAgentsAll,
  onSelectListAgentsRepo,
  onSelectApiKeyInfo,
  onSelectListModels,
  onExit,
}: MainMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { exit } = useApp();
  const { terminalWidth } = useTerminalDimensions();

  const options = [
    { label: "List Agents (This Repo)", action: onSelectListAgentsRepo },
    { label: "List Agents (All)", action: onSelectListAgentsAll },
    { label: "API Key Info", action: onSelectApiKeyInfo },
    { label: "List Models", action: onSelectListModels },
    {
      label: "Exit",
      action: () => {
        exit();
        onExit();
      },
    },
  ];

  useInput((input, key) => {
    if (key.upArrow || input === "k") {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
    } else if (key.downArrow || input === "j") {
      setSelectedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
    } else if (key.return) {
      options[selectedIndex].action();
    } else if (input === "q" || key.escape) {
      exit();
      onExit();
    }
  });

  return (
    <Box
      flexDirection="column"
      width={terminalWidth}
      paddingX={2}
      paddingY={2}
      alignItems="flex-start"
    >
      <Box marginBottom={1}>
        <Text bold>Cursor Cloud Agents</Text>
      </Box>
      <Box marginBottom={1} width={Math.min(terminalWidth - 4, 50)}>
        <Text color="gray">{"─".repeat(Math.min(terminalWidth - 4, 50))}</Text>
      </Box>
      <Box flexDirection="column" marginTop={1} alignItems="flex-start">
        {options.map((option, index) => (
          <Box key={index} marginBottom={0}>
            <Text>
              {selectedIndex === index ? (
                <>
                  <Text color="cyan">&gt; </Text>
                  <Text color="cyan">{option.label}</Text>
                </>
              ) : (
                <>
                  <Text color="gray"> </Text>
                  <Text color="gray">{option.label}</Text>
                </>
              )}
            </Text>
          </Box>
        ))}
      </Box>
      <Box marginTop={2}>
        <Text color="gray">Use ↑↓ or j/k to navigate, Enter to select</Text>
      </Box>
    </Box>
  );
}
