import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendMagicLinkViaN8N } from "@/lib/n8n/email";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("app_users")
      .select("company_id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { email, full_name, phone, role, password, company_id } = body;

    if (!email || typeof email !== "string" || !company_id || company_id !== profile.company_id) {
      return NextResponse.json({ error: "Invalid email or company_id" }, { status: 400 });
    }

    if (!["admin", "dispatcher", "worker"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const adminClient = createSupabaseAdminClient();

    if (password && typeof password === "string" && password.length >= 6) {
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: email.trim(),
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name?.trim() || null, phone: phone?.trim() || null },
      });

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 400 });
      }

      if (!newUser.user) {
        return NextResponse.json({ error: "Failed to create user" }, { status: 400 });
      }

      const { error: appUserError } = await adminClient.from("app_users").insert({
        id: newUser.user.id,
        company_id: profile.company_id,
        role,
        full_name: full_name?.trim() || null,
        phone: phone?.trim() || null,
      });

      if (appUserError) {
        return NextResponse.json({ error: appUserError.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: "User created" });
    }

    // Create user manually (without sending Supabase email)
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      email_confirm: false, // User will confirm via magic link
      user_metadata: { full_name: full_name?.trim() || null, phone: phone?.trim() || null },
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    if (!newUser.user) {
      return NextResponse.json({ error: "Failed to create user" }, { status: 400 });
    }

    const invitedId = newUser.user.id;

    // Create app_users profile first
    const { error: appUserError } = await adminClient.from("app_users").insert({
      id: invitedId,
      company_id: profile.company_id,
      role,
      full_name: full_name?.trim() || null,
      phone: phone?.trim() || null,
    });

    if (appUserError) {
      // If profile creation fails, try to clean up the user
      await adminClient.auth.admin.deleteUser(invitedId);
      return NextResponse.json({ error: appUserError.message }, { status: 400 });
    }

    // Get company name for email
    const { data: company } = await adminClient
      .from("companies")
      .select("name")
      .eq("id", profile.company_id)
      .single();

    const companyName = company?.name || "the company";

    // Generate magic link using Supabase Admin API
    const redirectUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const callbackUrl = `${redirectUrl}/auth/callback`;
    console.log("Generating invitation magic link with redirectTo:", callbackUrl);
    
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: email.trim(),
      options: {
        redirectTo: callbackUrl,
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("Failed to generate magic link:", linkError);
      return NextResponse.json(
        { error: linkError?.message || "Failed to generate magic link" },
        { status: 400 }
      );
    }

    // Supabase verify endpoint needs apikey when user clicks the link.
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    let inviteMagicLink = linkData.properties.action_link;
    if (anonKey && inviteMagicLink.includes("supabase.co")) {
      const sep = inviteMagicLink.includes("?") ? "&" : "?";
      inviteMagicLink = `${inviteMagicLink}${sep}apikey=${encodeURIComponent(anonKey)}`;
    }

    console.log("Generated invitation magic link:", inviteMagicLink.substring(0, 100) + "...");

    // Send invitation email via n8n
    try {
      await sendMagicLinkViaN8N({
        email: email.trim(),
        magicLink: inviteMagicLink,
        type: "invite",
        role,
        companyName,
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

    return NextResponse.json({ success: true, message: "Invitation sent" });
  } catch (err: unknown) {
    console.error("Error inviting user:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
