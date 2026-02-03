import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require";
import { sendMagicLinkViaN8N } from "@/lib/n8n/email";

export async function POST(request: Request) {
  try {
    const { profile } = await requireAdmin();

    const body = await request.json().catch(() => ({}));
    const { email, role } = body;

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (!role || !["dispatcher", "worker"].includes(role)) {
      return NextResponse.json(
        { error: "Role must be 'dispatcher' or 'worker'" },
        { status: 400 }
      );
    }

    const adminClient = createSupabaseAdminClient();

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").trim();
    const redirectUrl = !siteUrl
      ? "http://localhost:3000"
      : /^https?:\/\//i.test(siteUrl)
        ? siteUrl
        : siteUrl.startsWith("localhost")
          ? `http://${siteUrl}`
          : `https://${siteUrl}`;

    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email.trim(),
      {
        data: {
          company_id: profile.company_id,
          role,
        },
        redirectTo: `${redirectUrl}/auth/callback`,
      }
    );

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message || "Failed to create user" }, { status: 400 });
    }

    const invitedUserId = inviteData?.user?.id;
    if (!invitedUserId) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 400 }
      );
    }

    // Generate magic link and send via n8n
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: email.trim(),
      options: {
        redirectTo: `${redirectUrl}/auth/callback`,
      },
    });

    if (linkData?.properties?.action_link) {
      try {
        await sendMagicLinkViaN8N({
          email: email.trim(),
          magicLink: linkData.properties.action_link,
          type: "invite",
          role,
        });
      } catch (n8nError) {
        console.error("Failed to send email via n8n:", n8nError);
        // Continue - user can still use the magic link if they get it another way
      }
    }

    // Create app_users profile row with same company_id as admin
    const { error: appUserError } = await adminClient.from("app_users").insert({
      id: invitedUserId,
      company_id: profile.company_id, // Ensure same company
      role,
      email: email.trim(),
    });

    if (appUserError) {
      // Rollback: delete auth user if profile creation fails
      await adminClient.auth.admin.deleteUser(invitedUserId);
      return NextResponse.json({ error: appUserError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Employee invitation sent",
    });
  } catch (err: unknown) {
    if (err instanceof Response) {
      return err;
    }
    console.error("Error inviting employee:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
