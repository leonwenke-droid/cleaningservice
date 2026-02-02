import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendMagicLinkViaN8N } from "@/lib/n8n/email";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email } = body;

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const adminClient = createSupabaseAdminClient();
    const redirectUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    // Generate magic link using Supabase Admin API
    const callbackUrl = `${redirectUrl}/auth/callback`;
    console.log("Generating magic link with redirectTo:", callbackUrl);
    
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: email.trim(),
      options: {
        redirectTo: callbackUrl,
      },
    });

    if (error || !data?.properties?.action_link) {
      console.error("Failed to generate magic link:", error);
      return NextResponse.json(
        { error: error?.message || "Failed to generate magic link" },
        { status: 400 }
      );
    }

    // Supabase's verify endpoint requires the anon key when the user clicks the link
    // (the browser request has no header). Append it so the redirect works on Vercel.
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    let magicLink = data.properties.action_link;
    if (anonKey && magicLink.includes("supabase.co")) {
      const separator = magicLink.includes("?") ? "&" : "?";
      magicLink = `${magicLink}${separator}apikey=${encodeURIComponent(anonKey)}`;
    }

    console.log("Generated magic link (full):", magicLink);
    console.log("Generated magic link (first 200 chars):", magicLink.substring(0, 200));

    // Check if the link contains the redirect URL
    if (magicLink.includes(callbackUrl)) {
      console.log("✅ Magic link contains callback URL");
    } else {
      console.warn("⚠️ Magic link does NOT contain expected callback URL:", callbackUrl);
    }

    // Send email via n8n
    try {
      await sendMagicLinkViaN8N({
        email: email.trim(),
        magicLink,
        type: "login",
      });
    } catch (n8nError) {
      console.error("n8n webhook error:", n8nError);
      // If n8n workflow is not active, return a helpful error
      if (n8nError instanceof Error && n8nError.message.includes("not active")) {
        return NextResponse.json(
          { 
            error: "Email service is not configured. Please activate the n8n workflow.",
            details: n8nError.message 
          },
          { status: 503 }
        );
      }
      // For other errors, still return success but log the issue
      // Magic link is still valid - user can manually use it if needed
      console.warn("Email sending failed, but magic link was generated:", n8nError);
    }

    return NextResponse.json({
      success: true,
      message: "Magic link sent",
    });
  } catch (err: unknown) {
    console.error("Error sending magic link:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
