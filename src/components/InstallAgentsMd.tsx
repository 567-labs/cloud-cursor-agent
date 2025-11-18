/**
 * Install Agents MD component
 * Executes install-agents-md command and displays result
 */

import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import type { CommandContext } from "../cli/types.js";
import { executeInstallAgentsMd } from "../commands/install-agents-md.js";

interface InstallAgentsMdProps {
  context: CommandContext;
  onBack: () => void;
}

export function InstallAgentsMd({ context, onBack }: InstallAgentsMdProps) {
  const [status, setStatus] = useState<"running" | "success" | "error">(
    "running"
  );
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    async function install() {
      try {
        await executeInstallAgentsMd(context, { force: false });
        setStatus("success");
        setMessage(
          "✓ Successfully updated AGENTS.md with CLI usage instructions"
        );
        setTimeout(() => {
          onBack();
        }, 2000);
      } catch (error) {
        setStatus("error");
        if (error instanceof Error) {
          setMessage(`Error: ${error.message}`);
        } else {
          setMessage("Error: Failed to install agents.md instructions");
        }
        setTimeout(() => {
          onBack();
        }, 3000);
      }
    }

    install();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box flexDirection="column" paddingX={2} paddingY={2}>
      <Box marginBottom={1}>
        <Text bold>Install Agents MD</Text>
      </Box>
      <Box marginBottom={1}>
        <Text>
          {status === "running" && "Installing CLI usage instructions..."}
          {status === "success" && <Text color="green">{message}</Text>}
          {status === "error" && <Text color="red">{message}</Text>}
        </Text>
      </Box>
    </Box>
  );
}
