import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendMagicLinkViaN8N } from "@/lib/n8n/email";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { companyName, adminEmail } = body;

    if (!companyName || typeof companyName !== "string" || !companyName.trim()) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }

    if (!adminEmail || typeof adminEmail !== "string" || !adminEmail.trim()) {
      return NextResponse.json({ error: "Admin email is required" }, { status: 400 });
    }

    const adminClient = createSupabaseAdminClient();
    const companyId = randomUUID();

    // Step 1: Create company
    const { error: companyError } = await adminClient.from("companies").insert({
      id: companyId,
      name: companyName.trim(),
    });

    if (companyError) {
      return NextResponse.json({ error: companyError.message }, { status: 400 });
    }

    // Step 2: Create user in Supabase Auth
    const redirectUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      adminEmail.trim(),
      {
        data: {
          company_id: companyId,
          role: "admin",
        },
        redirectTo: `${redirectUrl}/auth/callback`,
      }
    );

    if (inviteError) {
      // Rollback: delete company if invite fails
      await adminClient.from("companies").delete().eq("id", companyId);
      return NextResponse.json({ error: inviteError.message || "Failed to create user" }, { status: 400 });
    }

    const invitedUserId = inviteData?.user?.id;
    if (!invitedUserId) {
      // Rollback: delete company if no user ID returned
      await adminClient.from("companies").delete().eq("id", companyId);
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 400 }
      );
    }

    // Step 2b: Generate magic link and send via n8n
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: adminEmail.trim(),
      options: {
        redirectTo: `${redirectUrl}/auth/callback`,
      },
    });

    if (linkData?.properties?.action_link) {
      try {
        await sendMagicLinkViaN8N({
          email: adminEmail.trim(),
          magicLink: linkData.properties.action_link,
          type: "invite",
          role: "admin",
          companyName: companyName.trim(),
        });
      } catch (n8nError) {
        console.error("Failed to send email via n8n:", n8nError);
        // Continue - user can still use the magic link if they get it another way
      }
    }

    // Step 3: Create app_users profile row
    const { error: appUserError } = await adminClient.from("app_users").insert({
      id: invitedUserId,
      company_id: companyId,
      role: "admin",
      email: adminEmail.trim(),
    });

    if (appUserError) {
      // Rollback: delete company and auth user if profile creation fails
      await adminClient.from("companies").delete().eq("id", companyId);
      await adminClient.auth.admin.deleteUser(invitedUserId);
      return NextResponse.json({ error: appUserError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      company_id: companyId,
      message: "Company registered. Admin invitation sent.",
    });
  } catch (err: unknown) {
    console.error("Error registering company:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
