/**
 * CrossAppBus — Supabase Realtime event bus connecting all 5 apps.
 *
 * Any app can PUBLISH an event to the shared channel.
 * Any app can SUBSCRIBE and react to events from other apps.
 *
 * Channel: `os:${userId}` — one channel per user, all apps share it.
 *
 * Event envelope:
 *   { from: AppId, type: EventType, payload: any, ts: number }
 *
 * Supported event types:
 *   atlas:lead_created     — Atlas created a new lead from voice
 *   atlas:deal_won         — Atlas moved deal to Closed Won
 *   orion:voice_captured   — Orion captured a voice note
 *   orion:briefing_request — Orion requests a morning briefing
 *   clario:job_complete    — Clario finished a video analysis job
 *   metaphor:draft_ready   — Metaphor generated a new draft
 *   metaphor:node_created  — A node was added to the graph
 *
 * Usage:
 *   const bus = CrossAppBus.getInstance(supabaseClient, userId);
 *   bus.publish({ from: 'atlas', type: 'atlas:lead_created', payload: { leadId } });
 *   bus.subscribe('clario:job_complete', (payload) => { ... });
 */

import { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";

export type AppId = "orion" | "atlas" | "clario" | "metaphor" | "id";

export type CrossAppEventType =
  | "atlas:lead_created"
  | "atlas:deal_won"
  | "orion:voice_captured"
  | "orion:briefing_request"
  | "clario:job_complete"
  | "metaphor:draft_ready"
  | "metaphor:node_created"
  | "system:handoff";

export interface CrossAppEvent {
  from: AppId;
  type: CrossAppEventType;
  payload: Record<string, unknown>;
  ts: number;
}

type EventHandler = (payload: Record<string, unknown>, event: CrossAppEvent) => void;

export class CrossAppBus {
  private static instances: Map<string, CrossAppBus> = new Map();

  private channel: RealtimeChannel | null = null;
  private handlers: Map<CrossAppEventType | "*", EventHandler[]> = new Map();
  private userId: string;
  private supabase: SupabaseClient;

  private constructor(supabase: SupabaseClient, userId: string) {
    this.supabase = supabase;
    this.userId = userId;
    this.connect();
  }

  static getInstance(supabase: SupabaseClient, userId: string | null): CrossAppBus {
    const key = userId || 'local_system';
    if (!CrossAppBus.instances.has(key)) {
      CrossAppBus.instances.set(key, new CrossAppBus(supabase, key));
    }
    return CrossAppBus.instances.get(key)!;
  }

  private connect() {
    this.channel = this.supabase.channel(`os:${this.userId}`, {
      config: { broadcast: { self: false } },
    });

    this.channel.on("broadcast", { event: "cross_app" }, ({ payload }) => {
      const event = payload as CrossAppEvent;

      // Fire handlers for this specific event type
      (this.handlers.get(event.type) || []).forEach((h) => h(event.payload, event));

      // Fire wildcard handlers
      (this.handlers.get("*") || []).forEach((h) => h(event.payload, event));
    });

    this.channel.subscribe();
  }

  /** Publish an event to all subscribed apps */
  publish(event: Omit<CrossAppEvent, "ts">) {
    if (!this.channel) return;
    this.channel.send({
      type: "broadcast",
      event: "cross_app",
      payload: { ...event, ts: Date.now() },
    });
  }

  /** Subscribe to a specific event type, or "*" for all events */
  subscribe(type: CrossAppEventType | "*", handler: EventHandler): () => void {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(type) || [];
      this.handlers.set(type, handlers.filter((h) => h !== handler));
    };
  }

  disconnect() {
    this.channel?.unsubscribe();
    this.channel = null;
    CrossAppBus.instances.delete(this.userId);
  }
}

/**
 * React hook for using CrossAppBus in any web app component.
 *
 * Usage:
 *   const { publish, useEvent } = useCrossAppBus(supabase, userId);
 *   useEvent("clario:job_complete", (payload) => { toast("Analysis complete!") });
 *   publish({ from: "metaphor", type: "metaphor:draft_ready", payload: { draftId } });
 */
import { useEffect } from "react";

export function useCrossAppBus(supabase: SupabaseClient, userId: string | null) {
  const getBus = () => {
    return CrossAppBus.getInstance(supabase, userId);
  };

  const publish = (event: Omit<CrossAppEvent, "ts">) => {
    getBus()?.publish(event);
  };

  const useEvent = (type: CrossAppEventType | "*", handler: EventHandler) => {
    useEffect(() => {
      const unsubscribe = CrossAppBus.getInstance(supabase, userId).subscribe(type, handler);
      return unsubscribe;
    }, [userId, type]);
  };

  return { publish, useEvent };
}
