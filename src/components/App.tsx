/**
 * App component
 * Main application component that handles navigation between views
 */

import React, { useState } from "react";
import { Box, useApp } from "ink";
import { MainMenu } from "./MainMenu.js";
import { AgentList } from "./AgentList.js";
import { AgentStatus } from "./AgentStatus.js";
import { ApiKeyInfo } from "./ApiKeyInfo.js";
import { ModelsList } from "./ModelsList.js";
import { InstallAgentsMd } from "./InstallAgentsMd.js";
import { useTerminalDimensions } from "../hooks/useTerminalDimensions.js";
import type { CloudAgentsApiClient } from "../api/client.js";
import type { CommandContext } from "../cli/types.js";

type View =
  | "menu"
  | "list"
  | "status"
  | "apiKeyInfo"
  | "models"
  | "installAgentsMd";

interface AppProps {
  apiClient: CloudAgentsApiClient;
  context?: CommandContext;
  initialView?: View;
  initialAgentId?: string;
  repositoryFilter?: string;
}

export function App({
  apiClient,
  context,
  initialView = "menu",
  initialAgentId,
  repositoryFilter,
}: AppProps) {
  const [view, setView] = useState<View>(initialView);
  const [agentId, setAgentId] = useState<string | undefined>(initialAgentId);
  const [currentRepositoryFilter, setCurrentRepositoryFilter] = useState<
    string | undefined
  >(undefined);
  const { exit } = useApp();
  const { terminalWidth } = useTerminalDimensions();

  return (
    <Box width={terminalWidth}>
      {view === "menu" && (
        <MainMenu
          onSelectListAgentsAll={() => {
            setCurrentRepositoryFilter(undefined);
            setView("list");
          }}
          onSelectListAgentsRepo={() => {
            setCurrentRepositoryFilter(repositoryFilter);
            setView("list");
          }}
          onSelectApiKeyInfo={() => setView("apiKeyInfo")}
          onSelectListModels={() => setView("models")}
          onSelectInstallAgentsMd={() => setView("installAgentsMd")}
          onExit={() => exit()}
        />
      )}
      {view === "list" && (
        <AgentList
          apiClient={apiClient}
          onBack={() => setView("menu")}
          repositoryFilter={currentRepositoryFilter}
        />
      )}
      {view === "status" && agentId && (
        <AgentStatus
          apiClient={apiClient}
          agentId={agentId}
          onBack={() => setView("menu")}
        />
      )}
      {view === "apiKeyInfo" && (
        <ApiKeyInfo apiClient={apiClient} onBack={() => setView("menu")} />
      )}
      {view === "models" && (
        <ModelsList apiClient={apiClient} onBack={() => setView("menu")} />
      )}
      {view === "installAgentsMd" && context && (
        <InstallAgentsMd context={context} onBack={() => setView("menu")} />
      )}
    </Box>
  );
}
