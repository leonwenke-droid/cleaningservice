import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * POST /api/user/preferences
 * Update user preferences (e.g., language)
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
    const { preferred_language } = body;

    if (preferred_language && !['de', 'en', 'pl', 'ro', 'ru'].includes(preferred_language)) {
      return NextResponse.json({ error: "Invalid language code" }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (preferred_language) {
      updates.preferred_language = preferred_language;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No preferences to update" }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from("app_users")
      .update(updates)
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating preferences:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Preferences updated" });
  } catch (err: unknown) {
    console.error("Error in user preferences endpoint:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
