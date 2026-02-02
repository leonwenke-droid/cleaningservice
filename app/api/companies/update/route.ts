import { NextResponse } from "next/server";

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

    const { data: profile, error: profileError } = await supabase
      .from("app_users")
      .select("company_id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Only admins can update company details" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const companyName = body?.name;

    if (!companyName || typeof companyName !== "string" || !companyName.trim()) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from("companies")
      .update({ name: companyName.trim() })
      .eq("id", profile.company_id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Company updated" });
  } catch (err: unknown) {
    console.error("Error updating company:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
