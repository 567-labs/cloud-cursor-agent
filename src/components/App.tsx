/**
 * App component
 * Main application component that handles navigation between views
 */

import React, { useState } from "react";
import { Box, useApp } from "ink";
import { MainMenu } from "./MainMenu.js";
import { AgentList } from "./AgentList.js";
import { AgentStatus } from "./AgentStatus.js";
import type { CloudAgentsApiClient } from "../api/client.js";

type View = "menu" | "list" | "status";

interface AppProps {
  apiClient: CloudAgentsApiClient;
  initialView?: View;
  initialAgentId?: string;
  repositoryFilter?: string;
}

export function App({
  apiClient,
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

  const terminalWidth = process.stdout.columns || 80;

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
    </Box>
  );
}
