"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { defaultLocale } from "@/lib/i18n-constants";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    async function handleAuthCallback() {
      // Code flow: let the server exchange the code (server has env vars at runtime on Vercel)
      const code = searchParams.get("code");
      if (code) {
        window.location.href = `/api/auth/exchange?code=${encodeURIComponent(code)}`;
        return;
      }

      const supabase = createSupabaseBrowserClient();

      // Check for tokens in hash fragment (client-side flow)
      if (typeof window !== "undefined") {
        const hash = window.location.hash;
        if (hash) {
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          const error = params.get("error");
          const errorDescription = params.get("error_description");

          if (error) {
            // Don't log as error - this is expected for expired links
            const errorMsg = errorDescription 
              ? decodeURIComponent(errorDescription.replace(/\+/g, " "))
              : error === "access_denied" 
                ? "This magic link has expired. Please request a new one."
                : error || "Authentication failed";
            router.push(`/${defaultLocale}/login?error=${encodeURIComponent(errorMsg)}`);
            return;
          }

          if (accessToken && refreshToken) {
            console.log("Setting session from hash tokens...");
            // Set the session using the tokens from the hash
            const { error: sessionError, data } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              console.error("Error setting session:", sessionError);
              router.push(`/${defaultLocale}/login?error=${encodeURIComponent(sessionError.message || "Failed to set session")}`);
              return;
            }

            if (data.session) {
              console.log("Session set successfully from hash tokens");
              // Check if user has profile and redirect accordingly
              const { data: profile } = await supabase
                .from("app_users")
                .select("id, company_id")
                .eq("id", data.session.user.id)
                .single();

              if (!profile) {
                router.push(`/${defaultLocale}/onboarding`);
              } else {
                router.push(`/${defaultLocale}`);
              }
            } else {
              router.push(`/${defaultLocale}/login?error=` + encodeURIComponent("No session created"));
            }
            return;
          }
        }
      }

      // No code or tokens found
      console.error("No authentication code or tokens found");
      router.push(`/${defaultLocale}/login?error=` + encodeURIComponent("Missing authentication code"));
    }

    handleAuthCallback();
  }, [router, searchParams]);

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <div>Completing sign in...</div>
    </div>
  );
}
