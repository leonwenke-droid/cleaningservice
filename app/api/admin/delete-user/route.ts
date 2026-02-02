import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const userId = body?.user_id;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
    }

    if (userId === user.id) {
      return NextResponse.json({ error: "You cannot remove yourself" }, { status: 400 });
    }

    const { data: targetUser, error: targetError } = await supabase
      .from("app_users")
      .select("company_id, id")
      .eq("id", userId)
      .single();

    if (targetError || !targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (targetUser.company_id !== profile.company_id) {
      return NextResponse.json({ error: "Cannot remove users from other companies" }, { status: 403 });
    }

    const { error: profileDeleteError } = await supabase
      .from("app_users")
      .delete()
      .eq("id", userId)
      .eq("company_id", profile.company_id);

    if (profileDeleteError) {
      return NextResponse.json({ error: profileDeleteError.message }, { status: 400 });
    }

    const adminClient = createSupabaseAdminClient();
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.error("Auth delete failed:", authDeleteError.message);
      return NextResponse.json(
        {
          error:
            "User was removed from the company but could not be deleted from Authentication: " +
            (authDeleteError.message || "unknown"),
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "User removed from company and deleted from Authentication",
    });
  } catch (err: unknown) {
    console.error("Error deleting user:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
