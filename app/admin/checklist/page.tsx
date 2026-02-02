import Link from "next/link";
import { redirect } from "next/navigation";

import { TopBar } from "@/components/TopBar";
import { InitChecklistButton } from "@/components/admin/InitChecklistButton";
import { getSessionAndProfile } from "@/lib/auth/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ChecklistAdminPage() {
  const { session, profile } = await getSessionAndProfile();
  if (!session) redirect("/login");

  if (profile.role !== "admin") {
    redirect("/");
  }

  const supabase = await createSupabaseServerClient();

  // Check if template exists
  const { data: templateVersion } = await supabase
    .from("checklist_template_versions")
    .select("id, name, version_number, is_active, created_at")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Count items
  let itemCount = 0;
  if (templateVersion) {
    const { count } = await supabase
      .from("checklist_items")
      .select("*", { count: "exact", head: true })
      .eq("template_version_id", templateVersion.id)
      .eq("company_id", profile.company_id);
    itemCount = count || 0;
  }

  return (
    <>
      <TopBar
        title="Checklist Management"
        right={
          <Link className="pill" href="/admin/company">
            Back
          </Link>
        }
      />
      <main className="container">
        <div className="stack">
          <div className="card">
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Checklist Template Status</div>
            
            {templateVersion ? (
              <div>
                <div className="muted" style={{ marginBottom: 12 }}>
                  <div><strong>Template:</strong> {templateVersion.name}</div>
                  <div><strong>Version:</strong> {templateVersion.version_number}</div>
                  <div><strong>Status:</strong> {templateVersion.is_active ? "Active" : "Inactive"}</div>
                  <div><strong>Items:</strong> {itemCount}</div>
                </div>
                
                {itemCount === 0 && (
                  <div style={{ 
                    padding: 12, 
                    background: "#fef3c7", 
                    color: "#92400e", 
                    borderRadius: 6, 
                    marginTop: 12,
                    fontSize: 13 
                  }}>
                    <strong>Warning:</strong> Template exists but has no items. Please run the seed SQL script to add checklist items.
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="muted" style={{ marginBottom: 12 }}>
                  No checklist template found for your company.
                </div>
                <InitChecklistButton />
              </div>
            )}
          </div>

          <div className="card">
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Setup Instructions</div>
            <div className="muted" style={{ fontSize: 13 }}>
              <ol style={{ paddingLeft: 20, marginTop: 8 }}>
                <li style={{ marginBottom: 8 }}>
                  Click "Initialize Checklist Template" above to create the template structure
                </li>
                <li style={{ marginBottom: 8 }}>
                  Go to Supabase SQL Editor and run the <code>seed_checklist_v1.sql</code> script
                </li>
                <li style={{ marginBottom: 8 }}>
                  The script will add all 31 checklist items to your template
                </li>
                <li>
                  New inspections will automatically use this template
                </li>
              </ol>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
