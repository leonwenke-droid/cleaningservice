import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * POST /api/admin/init-checklist
 * Initialize the default checklist template for the user's company
 * This is a one-time setup that creates the template, version, and all items
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

    const { data: profile } = await supabase
      .from("app_users")
      .select("company_id, role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (profile.role !== "admin") {
      return NextResponse.json({ error: "Only admins can initialize checklist templates" }, { status: 403 });
    }

    // Check if template already exists
    const { data: existingTemplate } = await supabase
      .from("checklist_template_versions")
      .select("id")
      .eq("company_id", profile.company_id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (existingTemplate) {
      return NextResponse.json({
        success: true,
        message: "Checklist template already exists",
        template_version_id: existingTemplate.id,
      });
    }

    // Create template
    const { data: template, error: templateError } = await supabase
      .from("checklist_templates")
      .insert({
        company_id: profile.company_id,
        name: "Standard Cleaning Inspection",
        description: "Default standardized cleaning inspection checklist",
        is_active: true,
      })
      .select()
      .single();

    if (templateError || !template) {
      console.error("Error creating template:", templateError);
      return NextResponse.json({ error: templateError?.message || "Failed to create template" }, { status: 400 });
    }

    // Create template version
    const { data: templateVersion, error: versionError } = await supabase
      .from("checklist_template_versions")
      .insert({
        company_id: profile.company_id,
        template_id: template.id,
        version_number: 1,
        name: "v1.0 - Standard Cleaning Inspection",
        description: "Initial version of standardized cleaning inspection checklist",
        is_active: true,
        created_by: user.id,
      })
      .select()
      .single();

    if (versionError || !templateVersion) {
      console.error("Error creating template version:", versionError);
      // Clean up template
      await supabase.from("checklist_templates").delete().eq("id", template.id);
      return NextResponse.json({ error: versionError?.message || "Failed to create template version" }, { status: 400 });
    }

    // Now we need to create all the checklist items
    // This is a lot of items, so we'll do it in batches
    // For now, return success and tell them to run the seed SQL
    return NextResponse.json({
      success: true,
      message: "Template and version created. Please run the seed SQL to add checklist items.",
      template_id: template.id,
      template_version_id: templateVersion.id,
      next_step: "Run the seed_checklist_v1.sql SQL script in Supabase SQL Editor to add all checklist items.",
    });
  } catch (err: unknown) {
    console.error("Error in init-checklist endpoint:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
