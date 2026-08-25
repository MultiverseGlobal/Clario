export interface EcosystemApp {
  id: string;
  name: string;
  codename?: string;
  tagline: string;
  category: "context" | "agentic" | "creative" | "growth" | "system" | "experimental";
  iconName: string;
  accentColor: string;
  glowColor: string;
  status: "live" | "building" | "planned" | "archived";
  defaultUrl: string;
  localPort?: number;
  description: string;
  features: string[];
  permissions: string[];
  sessionStatus?: "connected" | "standby" | "unlinked";
  lastSync?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  handle: string;
  avatarUrl?: string;
  sovereignRole: "Ecosystem Architect" | "Admin" | "Master Key";
  isMasterAccount: boolean;
  preferences: {
    theme: "dark" | "light" | "obsidian";
    autoSyncContext: boolean;
    streamToUniversalVault: boolean;
    defaultAiModel: string;
    neuralHaptics: boolean;
  };
  connectedAppsCount: number;
  lastActive: string;
}

export interface VaultContextItem {
  id: string;
  sourceAppId: string;
  sourceAppName: string;
  category: "knowledge" | "memory" | "lead" | "asset" | "workflow" | "session";
  title: string;
  summary: string;
  tags: string[];
  createdAt: string;
  syncedAcross: string[];
  data: Record<string, any>;
}

export interface OAuthClient {
  clientId: string;
  clientSecret: string;
  name: string;
  redirectUris: string[];
  allowedScopes: string[];
}
