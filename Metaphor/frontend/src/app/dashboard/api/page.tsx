"use client";

import React, { useEffect, useState } from "react";
import { Key, Copy, Check, Terminal, ExternalLink, Shield, Plus, Lock, Trash2, Activity } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { fetchFromMetaphor, BACKEND_URL } from "@/app/api";
import { ChatGPTIcon, ClaudeIcon, CursorIcon, GeminiIcon, AntigravityIcon } from "@/components/ui/BrandIcons";

import { CardSkeleton } from "@/components/ui/SkeletonLoader";

type McpToken = {
  id: string;
  preview: string;
  client_id: string;
  scope: string;
  created_at: string;
  last_used: string | null;
};

type AuditLog = {
  id: string;
  client_name: string;
  call_type: string;
  name: string;
  query_summary: string | null;
  status_code: number;
  response_time_ms: number;
  timestamp: string;
};

export default function ApiAccessPage() {
  const [tokens, setTokens] = useState<McpToken[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const tokenData = await fetchFromMetaphor("/mcp/oauth/tokens").catch(() => []);
      setTokens(tokenData || []);
      const logsData = await fetchFromMetaphor("/mcp/audit-logs").catch(() => []);
      setAuditLogs(logsData || []);
    } catch (e) {
      console.error("Failed to load MCP tokens/audit logs", e);
    } finally {
      setLoading(false);
    }
  };


  const handleRegisterClient = async () => {
    setIsGenerating(true);
    try {
      const reg = await fetchFromMetaphor("/mcp/oauth/register", {
        client_name: "Dashboard Client",
        redirect_uris: ["http://localhost:8080/callback"]
      }, "POST");
      
      const auth = await fetchFromMetaphor(`/mcp/oauth/authorize?client_id=${reg.client_id}&redirect_uri=http://localhost:8080/callback&response_type=code&code_challenge=S256_CHALLENGE_HASH&code_challenge_method=S256`, undefined, "GET");
      
      if (auth && auth.code) {
        await fetchFromMetaphor("/mcp/oauth/token", {
          grant_type: "authorization_code",
          client_id: reg.client_id,
          redirect_uri: "http://localhost:8080/callback",
          code: auth.code,
          code_verifier: "S256_CHALLENGE_HASH"
        }, "POST");
      }
      await loadData();
    } catch (e) {
      console.error("Failed to register MCP client token", e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevokeToken = async (tokenId: string) => {
    try {
      await fetchFromMetaphor(`/mcp/oauth/tokens/${tokenId}`, undefined, "DELETE");
      setTokens(prev => prev.filter(t => t.id !== tokenId));
    } catch (e) {
      console.error("Failed to revoke MCP token", e);
    }
  };

  const handleCopy = (id: string, textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getMcpCommand = (preview: string) => `${BACKEND_URL}/mcp`;

  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in duration-150 max-w-4xl mx-auto p-8 overflow-y-auto">
      
      <header className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight mb-2 flex items-center gap-2">
            <Key className="w-6 h-6 text-primary" /> API Access & Remote MCP
          </h1>
          <p className="text-sm text-muted max-w-2xl">
            Connect external AI consumers (ChatGPT, Claude Desktop, Cursor) to Metaphor via OAuth 2.1 Protected Resource protocol backed by WorkOS AuthKit.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-full text-xs font-semibold border border-emerald-500/20">
          <Shield className="w-3.5 h-3.5" /> WorkOS AuthKit Protected Resource
        </div>
      </header>

      <div className="space-y-8 pb-32">
        {/* 1-Click AI Client Connectors */}

        <Card noPadding className="overflow-hidden">
          <div className="p-6 border-b border-border-subtle bg-surface-1/50 flex items-center justify-between">
            <div>
              <h2 className="text-base font-medium text-foreground mb-1">Connect External AI Assistants</h2>
              <p className="text-xs text-muted">Add Metaphor OS as a Remote MCP server to any AI client after onboarding.</p>
            </div>
          </div>
          
          <div className="divide-y divide-border-subtle bg-surface-1">
            {[
              { id: "chatgpt", name: "ChatGPT", icon: <ChatGPTIcon className="w-5 h-5" />, type: "Custom MCP Connector", desc: "In Settings → Plugins → Add Custom Connector", data: `${BACKEND_URL}/mcp`, label: "Copy URL" },
              { id: "claude", name: "Claude Desktop", icon: <ClaudeIcon className="w-5 h-5" />, type: "claude_desktop_config.json", desc: "Add to `mcpServers.metaphor`", data: JSON.stringify({ mcpServers: { metaphor: { url: `${BACKEND_URL}/mcp` } } }, null, 2), label: "Copy Config" },
              { id: "cursor", name: "Cursor IDE", icon: <CursorIcon className="w-5 h-5" />, type: ".cursor/mcp.json", desc: "Add to Cursor Features → MCP Servers", data: `${BACKEND_URL}/mcp`, label: "Copy URL" },
              { id: "gemini", name: "Gemini", icon: <GeminiIcon className="w-5 h-5" />, type: "Gemini Extension", desc: "Add to Gemini extensions configuration", data: `${BACKEND_URL}/mcp`, label: "Copy URL" },
              { id: "antigravity", name: "Antigravity IDE", icon: <AntigravityIcon className="w-5 h-5" />, type: "MCP Settings", desc: "Add to Antigravity MCP config", data: `${BACKEND_URL}/mcp`, label: "Copy URL" }
            ].map((ai) => (
              <div key={ai.id} className="p-4 flex items-center justify-between hover:bg-surface-2/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-background border border-border-subtle text-foreground shadow-sm">
                    {ai.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      {ai.name} 
                      <span className="text-[10px] uppercase tracking-wider text-muted font-bold px-2 py-0.5 rounded-full bg-surface-2 border border-border-subtle">{ai.type}</span>
                    </h3>
                    <p className="text-xs text-muted mt-1">{ai.desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(ai.id + "_copy", ai.data)}
                  className="px-4 py-2 bg-surface-2 border border-border-subtle hover:bg-foreground hover:text-background hover:border-foreground text-foreground text-xs font-medium rounded-lg flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  {copiedId === ai.id + "_copy" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === ai.id + "_copy" ? "Copied!" : ai.label}</span>
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* Server Endpoint Card */}
        <Card noPadding className="overflow-hidden">
          <div className="p-6 border-b border-border-subtle bg-surface-1/50 flex items-center justify-between">
            <div>
              <h2 className="text-base font-medium text-foreground mb-1">MCP Server Connection URL</h2>
              <p className="text-xs text-muted">Paste this URL into ChatGPT, Claude Desktop, or Cursor. Clients discover WorkOS AuthKit automatically.</p>
            </div>
          </div>
          <div className="p-6 bg-surface-1">
            <div className="relative group">
              <pre className="p-4 bg-background border border-border-subtle text-foreground rounded-xl text-xs font-mono overflow-x-auto">
                <code>{BACKEND_URL}/mcp</code>
              </pre>
              <button 
                onClick={() => handleCopy("mcp_url", `${BACKEND_URL}/mcp`)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-surface-2 hover:bg-foreground hover:text-background rounded-md text-muted transition-colors shadow-sm cursor-pointer"
              >
                {copiedId === "mcp_url" ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </Card>


        
        {/* Connection Tokens */}
        <Card noPadding className="overflow-hidden">
          <div className="p-6 border-b border-border-subtle bg-surface-1/50 flex items-center justify-between">
            <div>
              <h2 className="text-base font-medium text-foreground mb-1">Active OAuth 2.1 MCP Tokens</h2>
              <p className="text-xs text-muted">Scoped access tokens authorized for your Metaphor workspace graph.</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-xs font-semibold border border-emerald-500/20">
              <Shield className="w-3 h-3" /> OAuth 2.1 PKCE
            </div>
          </div>
          
          <div className="divide-y divide-border-subtle">
            {tokens.length === 0 && (
              <div className="p-8 text-center text-muted text-sm">
                No active MCP tokens. Click "Issue OAuth 2.1 Token" or connect a tool during onboarding.
              </div>
            )}
            
            {tokens.map(t => (
              <div key={t.id} className="p-6 bg-surface-1">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Lock className="w-4 h-4 text-muted" /> Token: {t.preview}
                    <span className="text-xs text-muted font-normal">({t.client_id})</span>
                  </div>
                  <button
                    onClick={() => handleRevokeToken(t.id)}
                    className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600 font-medium px-3 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Revoke Immediately
                  </button>
                </div>

                <div className="relative group">
                  <pre className="p-4 bg-background border border-border-subtle text-foreground rounded-xl text-xs font-mono overflow-x-auto">
                    <code>{getMcpCommand(t.preview)}</code>
                  </pre>
                  <button 
                    onClick={() => handleCopy(t.id, getMcpCommand(t.preview))}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-surface-2 hover:bg-foreground hover:text-background rounded-md text-muted transition-colors shadow-sm cursor-pointer"
                  >
                    {copiedId === t.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Live MCP Audit Log History */}
        <Card noPadding className="overflow-hidden">
          <div className="p-6 border-b border-border-subtle bg-surface-1/50 flex items-center justify-between">
            <div>
              <h2 className="text-base font-medium text-foreground mb-1 flex items-center gap-2">
                <Activity className="w-4 h-4 text-foreground" /> MCP Access Audit Logs
              </h2>
              <p className="text-xs text-muted">Live record of resources and tools queried by external AI clients.</p>
            </div>
            <span className="text-xs text-muted font-mono">{auditLogs.length} Events</span>
          </div>

          <div className="divide-y divide-border-subtle max-h-80 overflow-y-auto">
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-muted text-sm">
                No MCP queries recorded yet. Connected AI clients will log queries here.
              </div>
            ) : (
              auditLogs.map(log => (
                <div key={log.id} className="p-4 flex items-center justify-between bg-surface-1 text-xs">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                      log.call_type === "tool" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    }`}>
                      {log.call_type}
                    </span>
                    <span className="font-mono text-foreground font-semibold">{log.name}</span>
                    {log.query_summary && (
                      <span className="text-muted truncate max-w-xs">{log.query_summary}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-muted">
                    <span>{log.response_time_ms.toFixed(1)}ms</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

      </div>
    </div>
  );
}
