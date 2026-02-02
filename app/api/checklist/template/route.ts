import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * GET /api/checklist/template
 * Get the active checklist template version for the user's company
 */
export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("app_users")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const versionId = searchParams.get("version_id");

    let query = supabase
      .from("checklist_template_versions")
      .select(
        `
        id,
        version_number,
        name,
        description,
        is_active,
        created_at,
        items:checklist_items(
          id,
          section,
          sort_order,
          item_key,
          label,
          help_text,
          item_type,
          required,
          validation_rules,
          conditional_logic,
          enum_options,
          default_value
        )
      `
      )
      .eq("company_id", profile.company_id)
      .order("section", { referencedTable: "checklist_items", ascending: true })
      .order("sort_order", { referencedTable: "checklist_items", ascending: true });

    if (versionId) {
      query = query.eq("id", versionId);
    } else {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query.single();

    if (error) {
      console.error("Error fetching checklist template:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json({ error: "No active checklist template found" }, { status: 404 });
    }

    return NextResponse.json({ template: data });
  } catch (err: unknown) {
    console.error("Error in checklist template endpoint:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
