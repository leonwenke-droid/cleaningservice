import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { createSupabaseServerClient } from "@/lib/supabase/server";

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

    // Check if user already has a company
    const { data: existingProfile } = await supabase
      .from("app_users")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (existingProfile) {
      return NextResponse.json({ error: "You already belong to a company" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const companyName = body?.name;

    if (!companyName || typeof companyName !== "string" || !companyName.trim()) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }

    const companyId = randomUUID();

    // Step 1: Create company
    const { error: companyError } = await supabase.from("companies").insert({
      id: companyId,
      name: companyName.trim(),
    });

    if (companyError) {
      return NextResponse.json({ error: companyError.message }, { status: 400 });
    }

    // Step 2: Create app_users row (user becomes admin of the new company)
    const { error: appUserError } = await supabase.from("app_users").insert({
      id: user.id,
      company_id: companyId,
      role: "admin",
      full_name: user.user_metadata?.full_name || null,
      phone: user.user_metadata?.phone || null,
    });

    if (appUserError) {
      // Rollback: delete company if app_users insert fails
      await supabase.from("companies").delete().eq("id", companyId);
      return NextResponse.json({ error: appUserError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      company_id: companyId,
      message: "Company created successfully",
    });
  } catch (err: unknown) {
    console.error("Error creating company:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
