export function getBackendUrl(): string {
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host !== "localhost" && host !== "127.0.0.1") {
      return "https://metaphor-backend.onrender.com/api/v1";
    }
  }
  return "http://localhost:8000/api/v1";
}

export const BACKEND_URL = getBackendUrl();

import { createClient } from "@/utils/supabase/client";

const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 15000; // 15 seconds

export function clearApiCache() {
  apiCache.clear();
}

// Cache Supabase session client-side to avoid a round-trip on every request
let _sessionCache: { token: string | null; expiry: number } | null = null;

async function getCachedSession(): Promise<string | null> {
  const now = Date.now();
  if (_sessionCache && now < _sessionCache.expiry) {
    return _sessionCache.token;
  }
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  _sessionCache = { token: session?.access_token ?? null, expiry: now + 30_000 };
  return _sessionCache.token;
}

// Simple client-side API helper with lightweight GET caching
export async function fetchFromMetaphor(endpoint: string, body?: any, method?: string, allowAnonymous: boolean = false, skipCache: boolean = false) {
  const reqMethod = (method || (body ? "POST" : "GET")).toUpperCase();
  const cacheKey = `${reqMethod}:${endpoint}`;

  // Skip caching for /authorize endpoints — stale failures would silently block the user
  const isCacheable = reqMethod === "GET" && !endpoint.includes("/authorize") && !skipCache;

  // In-memory cache lookup for GET requests
  if (isCacheable) {
    const cached = apiCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  let apiKey = null;
  let token = null;

  if (typeof window !== 'undefined') {
    apiKey = localStorage.getItem("metaphor_api_key");
    token = await getCachedSession();
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  
  if (apiKey) {
    headers["X-API-Key"] = apiKey;
  }
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const options: RequestInit = {
    method: reqMethod,
    headers
  };

  if (body) {
    options.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  const backendUrl = getBackendUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);
  const res = await fetch(`${backendUrl}${endpoint}`, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeoutId));
  
  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 401 && token && (errText.includes("JWT does not exist") || errText.includes("validation error") || errText.includes("token is invalid"))) {
      if (typeof window !== 'undefined') {
        const supabase = createClient();
        await supabase.auth.signOut().catch(() => {});
        localStorage.removeItem("metaphor_api_key");
      }
    }
    throw new Error(`Backend request failed (${res.status}): ${errText}`);
  }


  // Clear cache on mutating operations
  if (reqMethod !== "GET") {
    apiCache.clear();
  }

  const resData = await res.json();
  if (isCacheable) {
    apiCache.set(cacheKey, { data: resData, timestamp: Date.now() });
  }

  return resData;
}
