/**
 * Pseudonyms ID Ecosystem SDK
 * Drop this helper into Metaphor OS, Atlas io, Clario, or Orion to authenticate and sync shared state.
 */

export interface EcosystemSession {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export class PseudonymsClient {
  private hubUrl: string;
  private appId: string;

  constructor(appId: string, hubUrl: string = "http://localhost:3005") {
    this.appId = appId;
    this.hubUrl = hubUrl;
  }

  /**
   * Redirect user to Master Pseudonyms ID OAuth Login
   */
  login(redirectUri: string) {
    if (typeof window === "undefined") return;
    const authUrl = `${this.hubUrl}/oauth/authorize?client_id=${this.appId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
    window.location.href = authUrl;
  }

  /**
   * Exchange OAuth code for an Ecosystem JWT
   */
  async exchangeCode(code: string): Promise<EcosystemSession | null> {
    try {
      const res = await fetch(`${this.hubUrl}/api/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grant_type: "authorization_code", client_id: this.appId, code }),
      });
      const data = await res.json();
      return {
        accessToken: data.access_token,
        user: data.user,
      };
    } catch (e) {
      console.error("[PseudonymsID SDK] Token exchange failed:", e);
      return null;
    }
  }

  /**
   * Read the Universal Shared Context Vault
   */
  async getVaultContext() {
    const res = await fetch(`${this.hubUrl}/api/ecosystem/context`);
    return await res.json();
  }

  /**
   * Broadcast memory, lead, asset, or knowledge node to all ecosystem tools
   */
  async broadcastContext(item: {
    category: "knowledge" | "memory" | "lead" | "asset" | "workflow";
    title: string;
    summary: string;
    tags?: string[];
    data?: Record<string, any>;
  }) {
    const res = await fetch(`${this.hubUrl}/api/ecosystem/context`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceAppId: this.appId,
        sourceAppName: this.appId.toUpperCase(),
        ...item,
      }),
    });
    return await res.json();
  }
}
