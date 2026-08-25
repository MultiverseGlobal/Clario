"use client";

import React, { useState, useEffect, Suspense } from "react";

import { useSearchParams } from "next/navigation";
import { Shield, Check, Lock, ExternalLink, ArrowRight, CheckCircle2 } from "lucide-react";
import { MetaphorLogo } from "@/components/ui/MetaphorLogo";
import { ChatGPTIcon, ClaudeIcon, CursorIcon } from "@/components/ui/BrandIcons";
import { fetchFromMetaphor } from "@/app/api";


function OAuthAuthorizeContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams?.get("client_id") || "chatgpt";
  const redirectUri = searchParams?.get("redirect_uri") || "";
  const state = searchParams?.get("state") || "";
  const codeChallenge = searchParams?.get("code_challenge") || "";
  const codeChallengeMethod = searchParams?.get("code_challenge_method") || "S256";
  const scope = searchParams?.get("scope") || "read:workspace";

  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clientString = `${clientId} ${redirectUri}`.toLowerCase();
  
  const clientName = clientString.includes("claude") 
    ? "Claude Desktop" 
    : clientString.includes("cursor") 
    ? "Cursor IDE" 
    : clientString.includes("atlas")
    ? "Atlas"
    : clientString.includes("william")
    ? "William"
    : "ChatGPT";

  const handleAuthorize = async () => {
    setIsAuthorizing(true);
    setErrorMessage(null);
    try {
      if (!redirectUri) {
        throw new Error("Missing redirect_uri parameter from consumer AI client.");
      }

      const res = await fetchFromMetaphor("/mcp/oauth/authorize", {
        client_id: clientId,
        redirect_uri: redirectUri,
        state: state,
        code_challenge: codeChallenge,
        code_challenge_method: codeChallengeMethod
      }, "POST");

      setAuthorized(true);

      if (res && res.redirect_url) {
        setTimeout(() => {
          window.location.href = res.redirect_url;
        }, 800);
      }
    } catch (e: any) {
      console.error("Authorization failed", e);
      setErrorMessage(e.message || "Failed to issue authorization consent code.");
    } finally {
      setIsAuthorizing(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-surface-1 border border-border-strong rounded-2xl p-8 shadow-2xl space-y-6">
        
        {/* Brand Header & Visual Connection */}
        <div className="flex items-center justify-center gap-4 py-2">
          <div className="w-12 h-12 rounded-2xl bg-surface-2 border border-border-subtle flex items-center justify-center text-foreground shadow-xs">
            <MetaphorLogo size={24} />
          </div>
          <ArrowRight className="w-5 h-5 text-muted" />
          <div className="w-12 h-12 rounded-2xl bg-surface-2 border border-border-subtle flex items-center justify-center text-foreground shadow-xs">
            {clientId.toLowerCase().includes("claude") ? (
              <ClaudeIcon className="w-6 h-6 text-foreground" />
            ) : clientId.toLowerCase().includes("cursor") ? (
              <CursorIcon className="w-6 h-6 text-foreground" />
            ) : clientId.toLowerCase().includes("atlas") ? (
              <span className="font-bold text-lg font-serif">A</span>
            ) : clientId.toLowerCase().includes("william") ? (
              <span className="font-bold text-lg font-serif">W</span>
            ) : (
              <ChatGPTIcon className="w-6 h-6 text-foreground" />
            )}
          </div>
        </div>


        <div className="text-center space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Connect Metaphor OS to {clientName}
          </h1>
          <p className="text-xs text-muted">
            Authorize <span className="text-foreground font-medium">{clientName}</span> to securely access your workspace memory.
          </p>
        </div>

        {/* Workspace Account Card */}
        <div className="p-4 bg-surface-2 rounded-xl border border-border-subtle space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">Workspace Graph</span>
            <span className="text-foreground font-medium">Multiverse (Default)</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">Protocol Security</span>
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <Shield className="w-3 h-3" /> OAuth 2.1 PKCE
            </span>
          </div>
        </div>

        {/* Permissions Requested */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
            Permissions Granted:
          </h3>
          <ul className="space-y-2.5 text-xs text-foreground font-medium">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Query knowledge graph & semantic memory</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Read workspace documentation, ADRs & specs</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Execute context tools inside {clientName}</span>
            </li>
          </ul>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
            {errorMessage}
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2 space-y-3">
          <button
            onClick={handleAuthorize}
            disabled={isAuthorizing || authorized}
            className="w-full py-3.5 px-4 bg-foreground text-background font-medium text-xs rounded-xl hover:opacity-90 active:scale-[0.99] transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {authorized ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                Authorized! Redirecting back to {clientName}...
              </>
            ) : isAuthorizing ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-background border-t-transparent animate-spin" />
                Authorizing Connection...
              </>
            ) : (
              <>
                Authorize & Connect {clientName}
              </>
            )}
          </button>
          
          <p className="text-[11px] text-muted text-center leading-relaxed">
            You can revoke access anytime in Metaphor <span className="text-foreground font-medium">Settings &gt; API Access</span>.
          </p>
        </div>

      </div>
    </div>
  );
}

export default function OAuthAuthorizePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full bg-background flex items-center justify-center text-xs text-muted font-mono">
        Loading Metaphor Authorization...
      </div>
    }>
      <OAuthAuthorizeContent />
    </Suspense>
  );
}

