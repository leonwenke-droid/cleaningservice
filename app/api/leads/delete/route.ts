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
      return NextResponse.json({ error: "Only admins can remove leads" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const leadId = body?.lead_id;

    if (!leadId || typeof leadId !== "string") {
      return NextResponse.json({ error: "Missing lead_id" }, { status: 400 });
    }

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, company_id")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    if (lead.company_id !== profile.company_id) {
      return NextResponse.json({ error: "Cannot remove leads from other companies" }, { status: 403 });
    }

    const { error: deleteError } = await supabase
      .from("leads")
      .delete()
      .eq("id", leadId)
      .eq("company_id", profile.company_id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Lead removed" });
  } catch (err: unknown) {
    console.error("Error deleting lead:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
