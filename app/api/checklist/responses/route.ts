import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * GET /api/checklist/responses?inspection_id=...
 * Get all responses for an inspection
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

    const { searchParams } = new URL(request.url);
    const inspectionId = searchParams.get("inspection_id");

    if (!inspectionId) {
      return NextResponse.json({ error: "inspection_id is required" }, { status: 400 });
    }

    // Verify user has access to this inspection
    const { data: inspection } = await supabase
      .from("inspections")
      .select("company_id, assigned_to, status")
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

    // Get all responses
    const { data: responses, error } = await supabase
      .from("inspection_responses")
      .select(
        `
        id,
        checklist_item_id,
        value,
        note,
        item:checklist_items!inner(
          item_key,
          label,
          item_type,
          section
        )
      `
      )
      .eq("inspection_id", inspectionId)
      .eq("company_id", profile.company_id);

    if (error) {
      console.error("Error fetching responses:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Get files
    const { data: files } = await supabase
      .from("inspection_files")
      .select("id, checklist_item_id, storage_path, file_name, mime_type")
      .eq("inspection_id", inspectionId)
      .eq("company_id", profile.company_id);

    return NextResponse.json({
      responses: responses || [],
      files: files || [],
    });
  } catch (err: unknown) {
    console.error("Error in checklist responses endpoint:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/checklist/responses
 * Save responses for an inspection
 * Body: { inspection_id, responses: [{ checklist_item_id, value, note }] }
 */
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

    const body = await request.json().catch(() => ({}));
    const { inspection_id, responses } = body;

    if (!inspection_id || !Array.isArray(responses)) {
      return NextResponse.json(
        { error: "inspection_id and responses array are required" },
        { status: 400 }
      );
    }

    // Verify user has access and can edit
    const { data: inspection } = await supabase
      .from("inspections")
      .select("company_id, assigned_to, status, checklist_template_version_id")
      .eq("id", inspection_id)
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

    // Check if user can edit
    const canEdit =
      inspection.status === "open" ||
      inspection.status === "in_progress" ||
      profile.role === "admin" ||
      profile.role === "dispatcher";

    if (!canEdit) {
      return NextResponse.json(
        { error: "Inspection is locked. Only admins can edit submitted inspections." },
        { status: 403 }
      );
    }

    // Check if assigned worker (unless admin/dispatcher)
    if (profile.role === "worker" && inspection.assigned_to !== user.id) {
      return NextResponse.json({ error: "You can only edit inspections assigned to you" }, { status: 403 });
    }

    // Filter and validate responses - ensure value is never null
    const validResponses = responses.filter((r: any) => {
      // Filter out null, undefined, or empty string values
      if (r.value === null || r.value === undefined || r.value === "") {
        return false;
      }
      // For arrays (multi-select), ensure it's not empty
      if (Array.isArray(r.value) && r.value.length === 0) {
        return false;
      }
      return true;
    });

    if (validResponses.length === 0) {
      return NextResponse.json({ success: true, message: "No valid responses to save" });
    }

    const responseData = validResponses.map((r: any) => {
      // Ensure value is properly formatted for JSONB
      let jsonbValue: any;
      if (typeof r.value === "object" && !Array.isArray(r.value)) {
        jsonbValue = r.value;
      } else if (Array.isArray(r.value)) {
        jsonbValue = r.value;
      } else {
        // For primitive values, wrap in array for consistency (or use the value directly)
        jsonbValue = r.value;
      }

      return {
        company_id: profile.company_id,
        inspection_id,
        checklist_item_id: r.checklist_item_id,
        value: jsonbValue,
        note: r.note || null,
      };
    });

    const { error: upsertError } = await supabase
      .from("inspection_responses")
      .upsert(responseData, {
        onConflict: "company_id,inspection_id,checklist_item_id",
      });

    if (upsertError) {
      console.error("Error saving responses:", upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Responses saved" });
  } catch (err: unknown) {
    console.error("Error in checklist responses endpoint:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
