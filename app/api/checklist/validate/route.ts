import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * POST /api/checklist/validate
 * Validate inspection responses before submission
 * Body: { inspection_id }
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
    const { inspection_id } = body;

    if (!inspection_id) {
      return NextResponse.json({ error: "inspection_id is required" }, { status: 400 });
    }

    // Get inspection
    const { data: inspection } = await supabase
      .from("inspections")
      .select("company_id, checklist_template_version_id, status")
      .eq("id", inspection_id)
      .single();

    if (!inspection) {
      return NextResponse.json({ error: "Inspection not found" }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from("app_users")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile || profile.company_id !== inspection.company_id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!inspection.checklist_template_version_id) {
      return NextResponse.json(
        { valid: false, error: "No checklist template assigned to inspection" },
        { status: 400 }
      );
    }

    // Get all required items
    const { data: requiredItems } = await supabase
      .from("checklist_items")
      .select("id, item_key, label, item_type, conditional_logic")
      .eq("template_version_id", inspection.checklist_template_version_id)
      .eq("required", true)
      .eq("company_id", profile.company_id);

    // Get all responses
    const { data: responses } = await supabase
      .from("inspection_responses")
      .select("checklist_item_id, value")
      .eq("inspection_id", inspection_id)
      .eq("company_id", profile.company_id);

    // Get all files
    const { data: files } = await supabase
      .from("inspection_files")
      .select("checklist_item_id")
      .eq("inspection_id", inspection_id)
      .eq("company_id", profile.company_id);

    const responseMap = new Map(
      (responses || []).map((r) => {
        // JSONB values come as objects, not strings
        let parsedValue = r.value;
        if (typeof r.value === "string") {
          try {
            parsedValue = JSON.parse(r.value);
          } catch {
            parsedValue = r.value;
          }
        }
        return [r.checklist_item_id, parsedValue];
      })
    );
    const fileItemIds = new Set((files || []).map((f) => f.checklist_item_id).filter(Boolean));

    const errors: Array<{ item_key: string; label: string; error: string }> = [];
    const missingItems: string[] = [];

    // Check required items
    for (const item of requiredItems || []) {
      const value = responseMap.get(item.id);
      if (value === undefined || value === null || value === "") {
        missingItems.push(item.item_key);
        errors.push({
          item_key: item.item_key,
          label: item.label,
          error: "This field is required",
        });
      }
    }

    // Check deviation rules: if any score <= 2, deviation_reason and photo are required
    const { data: scoreItems } = await supabase
      .from("checklist_items")
      .select("id, item_key, label")
      .eq("template_version_id", inspection.checklist_template_version_id)
      .eq("item_type", "rating")
      .like("item_key", "%_score")
      .eq("company_id", profile.company_id);

    let hasLowScore = false;
    for (const scoreItem of scoreItems || []) {
      const scoreValue = responseMap.get(scoreItem.id);
      if (typeof scoreValue === "number" && scoreValue <= 2) {
        hasLowScore = true;
        break;
      }
    }

    if (hasLowScore) {
      // Check for deviation_reason
      const { data: deviationItem } = await supabase
        .from("checklist_items")
        .select("id, item_key, label")
        .eq("template_version_id", inspection.checklist_template_version_id)
        .eq("item_key", "deviation_reason")
        .eq("company_id", profile.company_id)
        .single();

      if (deviationItem) {
        const deviationValue = responseMap.get(deviationItem.id);
        if (!deviationValue || deviationValue === "") {
          errors.push({
            item_key: "deviation_reason",
            label: deviationItem.label,
            error: "Deviation reason is required when any score is 2 or below",
          });
        }
      }

      // Check for photo
      const hasPhoto = fileItemIds.size > 0 || (files || []).some((f) => !f.checklist_item_id);
      if (!hasPhoto) {
        errors.push({
          item_key: "photo",
          label: "Photo",
          error: "At least one photo is required when any score is 2 or below",
        });
      }
    }

    const isValid = errors.length === 0;

    return NextResponse.json({
      valid: isValid,
      errors: isValid ? [] : errors,
      missing_items: missingItems,
    });
  } catch (err: unknown) {
    console.error("Error in checklist validate endpoint:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
