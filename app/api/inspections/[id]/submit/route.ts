import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * POST /api/inspections/[id]/submit
 * Submit an inspection (lock it for workers)
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
    const { data: inspection, error: inspError } = await supabase
      .from("inspections")
      .select("company_id, assigned_to, status")
      .eq("id", inspectionId)
      .single();

    if (inspError || !inspection) {
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

    // Check if user can submit
    const canSubmit =
      (inspection.status === "open" || inspection.status === "in_progress") &&
      (inspection.assigned_to === user.id || profile.role === "admin" || profile.role === "dispatcher");

    if (!canSubmit) {
      return NextResponse.json(
        { error: "You can only submit inspections assigned to you" },
        { status: 403 }
      );
    }

    // Validate before submit
    const validationResponse = await fetch(`${request.url.split("/api")[0]}/api/checklist/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inspection_id: inspectionId }),
    });

    const validation = await validationResponse.json();

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: "Validation failed",
          validation_errors: validation.errors,
          missing_items: validation.missing_items,
        },
        { status: 400 }
      );
    }

    // Update inspection status
    const { error: updateError } = await supabase
      .from("inspections")
      .update({
        status: "submitted",
        submitted_by: user.id,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", inspectionId)
      .eq("company_id", profile.company_id);

    if (updateError) {
      console.error("Error submitting inspection:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Inspection submitted" });
  } catch (err: unknown) {
    console.error("Error in inspection submit endpoint:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
