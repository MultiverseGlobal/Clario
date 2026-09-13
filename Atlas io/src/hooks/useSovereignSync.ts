import { useState, useEffect } from "react";

export function useSovereignSync() {
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    const fetchContext = async () => {
      try {
        const url = import.meta.env.VITE_METAPHOR_API_URL || "https://metaphor-backend.onrender.com";
        const res = await fetch(`${url}/api/v1/system/active-context`);
        if (res.ok) {
          const data = await res.json();
          if (data.project_id) {
            setProjectId(data.project_id);
          }
        }
      } catch (e) {
        // Ignore fetch errors if Metaphor is offline
      }
    };

    fetchContext();
    const interval = setInterval(fetchContext, 60000); // Changed from 3s to 60s to prevent spamming
    return () => clearInterval(interval);
  }, []);

  return { projectId };
}

