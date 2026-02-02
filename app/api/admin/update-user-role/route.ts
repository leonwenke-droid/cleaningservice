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
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const user_id = body?.user_id;
    const role = body?.role;

    if (!user_id || !role) {
      return NextResponse.json({ error: "Missing user_id or role" }, { status: 400 });
    }

    if (!["admin", "dispatcher", "worker"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const { data: targetUser, error: targetError } = await supabase
      .from("app_users")
      .select("company_id, id")
      .eq("id", user_id)
      .single();

    if (targetError || !targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (targetUser.company_id !== profile.company_id) {
      return NextResponse.json({ error: "Cannot modify users from other companies" }, { status: 403 });
    }

    if (user_id === user.id) {
      if (role !== "admin") {
        return NextResponse.json({ error: "You cannot change your own role from Admin" }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: "Role updated successfully" });
    }

    const { error: updateError } = await supabase
      .from("app_users")
      .update({ role })
      .eq("id", user_id)
      .eq("company_id", profile.company_id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Role updated successfully" });
  } catch (err: unknown) {
    console.error("Error updating user role:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
