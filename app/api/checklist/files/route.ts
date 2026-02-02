import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * POST /api/checklist/files
 * Upload a file for an inspection
 * FormData: { inspection_id, checklist_item_id (optional), file }
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

    const formData = await request.formData();
    const inspectionId = formData.get("inspection_id") as string;
    const checklistItemId = formData.get("checklist_item_id") as string | null;
    const file = formData.get("file") as File | null;

    if (!inspectionId || !file) {
      return NextResponse.json({ error: "inspection_id and file are required" }, { status: 400 });
    }

    // Verify user has access
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

    // Upload to Supabase Storage
    const fileExt = file.name.split(".").pop();
    const fileName = `${inspectionId}/${checklistItemId || "general"}/${Date.now()}.${fileExt}`;
    const storagePath = `inspections/${profile.company_id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("inspection-files")
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 400 });
    }

    // Save file record
    const { data: fileRecord, error: insertError } = await supabase
      .from("inspection_files")
      .insert({
        company_id: profile.company_id,
        inspection_id: inspectionId,
        checklist_item_id: checklistItemId || null,
        storage_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error saving file record:", insertError);
      // Try to delete uploaded file
      await supabase.storage.from("inspection-files").remove([storagePath]);
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    // Generate signed URL (valid for 1 hour) since bucket is private
    const { data: urlData } = await supabase.storage
      .from("inspection-files")
      .createSignedUrl(storagePath, 3600);

    return NextResponse.json({
      success: true,
      file: {
        id: fileRecord.id,
        storage_path: storagePath,
        file_name: file.name,
        url: urlData?.signedUrl || null,
      },
    });
  } catch (err: unknown) {
    console.error("Error in checklist files endpoint:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/checklist/files?id=...
 * Delete a file
 */
export async function DELETE(request: Request) {
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
    const fileId = searchParams.get("id");

    if (!fileId) {
      return NextResponse.json({ error: "file id is required" }, { status: 400 });
    }

    // Get file record
    const { data: fileRecord } = await supabase
      .from("inspection_files")
      .select("company_id, inspection_id, storage_path, inspection:inspections(status, assigned_to)")
      .eq("id", fileId)
      .single();

    if (!fileRecord) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from("app_users")
      .select("company_id, role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.company_id !== fileRecord.company_id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check if user can edit
    const inspection = fileRecord.inspection as any;
    const canEdit =
      inspection.status === "open" ||
      inspection.status === "in_progress" ||
      profile.role === "admin" ||
      profile.role === "dispatcher";

    if (!canEdit) {
      return NextResponse.json(
        { error: "Inspection is locked. Only admins can delete files from submitted inspections." },
        { status: 403 }
      );
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from("inspection-files")
      .remove([fileRecord.storage_path]);

    if (storageError) {
      console.error("Error deleting file from storage:", storageError);
      // Continue to delete record even if storage delete fails
    }

    // Delete record
    const { error: deleteError } = await supabase
      .from("inspection_files")
      .delete()
      .eq("id", fileId);

    if (deleteError) {
      console.error("Error deleting file record:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "File deleted" });
  } catch (err: unknown) {
    console.error("Error in checklist files delete endpoint:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
