import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * POST /api/inspections/[id]/assign-template
 * Assign the active checklist template to an inspection
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const inspectionId = resolvedParams?.id;

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get inspection
    const { data: inspection } = await supabase
      .from("inspections")
      .select("company_id, checklist_template_version_id")
      .eq("id", inspectionId)
      .single();

    if (!inspection) {
      return NextResponse.json({ error: "Inspection not found" }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from("app_users")
      .select("company_id, role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.company_id !== inspection.company_id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Only admins/dispatchers can assign templates
    if (profile.role !== "admin" && profile.role !== "dispatcher") {
      return NextResponse.json({ error: "Only admins and dispatchers can assign templates" }, { status: 403 });
    }

    // If already assigned, return success
    if (inspection.checklist_template_version_id) {
      return NextResponse.json({ 
        success: true, 
        message: "Template already assigned",
        template_version_id: inspection.checklist_template_version_id
      });
    }

    // Get active template
    const { data: activeTemplate } = await supabase
      .from("checklist_template_versions")
      .select("id")
      .eq("company_id", profile.company_id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!activeTemplate) {
      return NextResponse.json({ 
        error: "No active checklist template found for your company" 
      }, { status: 404 });
    }

    // Assign template
    const { error: updateError } = await supabase
      .from("inspections")
      .update({ checklist_template_version_id: activeTemplate.id })
      .eq("id", inspectionId)
      .eq("company_id", profile.company_id);

    if (updateError) {
      console.error("Error assigning template:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Template assigned successfully",
      template_version_id: activeTemplate.id
    });
  } catch (err: unknown) {
    console.error("Error in assign template endpoint:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
