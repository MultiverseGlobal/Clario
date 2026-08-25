import { useEffect, useState } from "react";


export type MetaphorNotification = {
  id: string;
  type: "handoff_received" | "handoff_resolved";
  title: string;
  description: string;
  timestamp: number;
};

export function useMetaphorSSE() {
  const [notifications, setNotifications] = useState<MetaphorNotification[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("metaphor_access_token");
    if (!token) return;

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
    // Connect to the remote MCP SSE endpoint
    const url = `${API_BASE}/mcp/sse?token=${token}&client_name=metaphor_dashboard`;
    
    const eventSource = new EventSource(url);

    const addNotification = (notif: Omit<MetaphorNotification, "id" | "timestamp">) => {
      setNotifications(prev => [
        { ...notif, id: Math.random().toString(36).substr(2, 9), timestamp: Date.now() },
        ...prev
      ].slice(0, 5)); // Keep only latest 5
    };

    eventSource.addEventListener("handoff_received", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        addNotification({
          type: "handoff_received",
          title: `[${data.source_ai?.toUpperCase()}] Hand-off Received`,
          description: `Action: ${data.action}`,
        });
      } catch (err) {
        console.error("Failed to parse handoff_received event", err);
      }
    });

    eventSource.addEventListener("handoff_resolved", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        addNotification({
          type: "handoff_resolved",
          title: `[${data.source_ai?.toUpperCase()}] Hand-off Resolved`,
          description: `Status: ${data.status}`,
        });
      } catch (err) {
        console.error("Failed to parse handoff_resolved event", err);
      }
    });

    eventSource.onerror = (err) => {
      console.error("SSE connection error", err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return notifications;
}
