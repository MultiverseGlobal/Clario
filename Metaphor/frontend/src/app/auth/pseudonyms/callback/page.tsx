"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const handleAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      let next = searchParams.get("next") || "/dashboard";
      if (!session) {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) {
            console.error("Failed to set session", error);
            router.push("/login?error=" + encodeURIComponent(error.message));
            return;
          }
        } else {
          router.push("/login?error=no_session");
          return;
        }
      }

      const onboarded = localStorage.getItem("metaphor_onboarded") === "true";
      if (!onboarded && next === "/dashboard") {
        next = "/onboarding?step=connect";
      }

      router.push(next);
    };

    handleAuth();
  }, [router, searchParams, supabase.auth]);

  return null;
}

export default function PseudonymsCallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Suspense fallback={null}>
        <CallbackContent />
      </Suspense>
      <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
