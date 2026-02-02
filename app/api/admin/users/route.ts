import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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

    const { data: profile, error: profileError } = await supabase
      .from("app_users")
      .select("company_id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("company_id");

    if (!companyId || companyId !== profile.company_id) {
      return NextResponse.json({ error: "Invalid company_id" }, { status: 400 });
    }

    const { data: appUsers, error: appUsersError } = await supabase
      .from("app_users")
      .select("id, role, full_name, phone, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (appUsersError) {
      return NextResponse.json({ error: appUsersError.message }, { status: 400 });
    }

    const adminClient = createSupabaseAdminClient();
    const userIds = (appUsers || []).map((u) => u.id);
    const { data: authUsersData, error: authError } = await adminClient.auth.admin.listUsers();

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const emailMap: Record<string, string> = {};
    authUsersData?.users?.forEach((user) => {
      if (userIds.includes(user.id)) {
        emailMap[user.id] = user.email || "";
      }
    });

    const users = (appUsers || []).map((user) => ({
      ...user,
      email: emailMap[user.id] || null,
    }));

    return NextResponse.json({ users });
  } catch (err: unknown) {
    console.error("Error loading users:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
