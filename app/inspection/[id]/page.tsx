import Link from "next/link";
import { redirect } from "next/navigation";

import { TopBar } from "@/components/TopBar";
import { ChecklistFormClient } from "@/components/checklist/ChecklistFormClient";
import { InspectionActivityLog } from "@/components/inspection/InspectionActivityLog";
import { AssignTemplateButton } from "@/components/inspection/AssignTemplateButton";
import { getSessionAndProfile } from "@/lib/auth/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string }> | { id: string };
};

type InspectionRow = {
  id: string;
  company_id: string;
  lead_id: string | null;
  site_id: string | null;
  scheduled_at: string | null;
  status: "open" | "in_progress" | "submitted" | "reviewed";
  assigned_to: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
  notes: string | null;
  assigned_user: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
};

type ChecklistItemRow = {
  id: string;
  company_id: string;
  inspection_id: string;
  label_snapshot: string;
  response_text: string | null;
  is_completed: boolean;
  photo_object_path: string | null;
};

export default async function InspectionPage({ params }: PageProps) {
  const { session, profile } = await getSessionAndProfile();
  if (!session) redirect("/login");

  // Handle params as Promise (Next.js 15+)
  const resolvedParams = await params;
  const inspectionId = resolvedParams?.id;

  if (!inspectionId) {
    return (
      <>
        <TopBar
          title="Inspection"
          right={
            <Link className="pill" href="/">
              Back
            </Link>
          }
        />
        <main className="container">
          <div className="card">
            <div style={{ fontWeight: 900 }}>Invalid inspection ID</div>
            <div className="muted">No inspection ID provided in URL.</div>
          </div>
        </main>
      </>
    );
  }

  const supabase = await createSupabaseServerClient();

  const { data: inspection, error: inspErr } = await supabase
    .from("inspections")
    .select(
      `
      id, 
      company_id, 
      lead_id, 
      site_id, 
      scheduled_at, 
      status, 
      assigned_to, 
      submitted_by, 
      submitted_at, 
      notes,
      checklist_template_version_id,
      assigned_user:app_users!inspections_assigned_to_fk(id, full_name, email)
    `
    )
    .eq("id", inspectionId)
    .single()
    .returns<InspectionRow & { checklist_template_version_id: string | null }>();

  if (inspErr || !inspection) {
    // Check if it's an RLS issue or truly not found
    const err = inspErr as any;
    const isRLSError = err?.code === "PGRST116" || err?.message?.includes("row-level security");
    const isNotFound = err?.code === "PGRST116" || !inspection;
    const errorMessage = err?.message || "Unknown error";

    return (
      <>
        <TopBar
          title="Inspection"
          right={
            <Link className="pill" href="/">
              Back
            </Link>
          }
        />
        <main className="container">
          <div className="stack">
            <div className="card">
              <div style={{ fontWeight: 900 }}>Inspection not found</div>
              <div className="muted" style={{ marginTop: 8 }}>
                {isRLSError
                  ? profile.role === "worker"
                    ? "You don't have access to this inspection. Workers can only view inspections assigned to them."
                    : "You don't have access to this inspection (different company or RLS policy)."
                  : isNotFound
                  ? `No inspection found with ID: ${inspectionId?.slice(0, 8) || inspectionId || "unknown"}...`
                  : errorMessage}
              </div>
              {err?.details && (
                <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                  Details: {err.details}
                </div>
              )}
            </div>
            <div className="card">
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Your info</div>
              <div className="muted" style={{ fontSize: 13 }}>
                Company ID: {profile.company_id}
              </div>
              <div className="muted" style={{ fontSize: 13 }}>
                User ID: {session.user.id}
              </div>
            </div>
            <div className="card">
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Quick actions</div>
              <div className="stack" style={{ gap: 8 }}>
                <Link className="btn secondary" href="/inspections">
                  View all inspections
                </Link>
                <Link className="btn secondary" href="/inspection/new">
                  Create new inspection
                </Link>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  // Verify company_id matches (extra safety check)
  if (inspection.company_id !== profile.company_id) {
    return (
      <>
        <TopBar
          title="Inspection"
          right={
            <Link className="pill" href="/">
              Back
            </Link>
          }
        />
        <main className="container">
          <div className="card">
            <div style={{ fontWeight: 900 }}>Access denied</div>
            <div className="muted">
              This inspection belongs to a different company. Your company: {profile.company_id ? profile.company_id.slice(0, 8) : "unknown"}...
            </div>
          </div>
        </main>
      </>
    );
  }

  // Get checklist template version
  let template = null;
  
  // If inspection doesn't have a template assigned, try to assign the active one
  if (!inspection.checklist_template_version_id) {
    const { data: activeTemplate } = await supabase
      .from("checklist_template_versions")
      .select("id")
      .eq("company_id", profile.company_id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    
    if (activeTemplate) {
      // Auto-assign the active template to this inspection
      await supabase
        .from("inspections")
        .update({ checklist_template_version_id: activeTemplate.id })
        .eq("id", inspection.id)
        .eq("company_id", profile.company_id);
      
      inspection.checklist_template_version_id = activeTemplate.id;
    }
  }
  
  if (inspection.checklist_template_version_id) {
    const { data: templateData } = await supabase
      .from("checklist_template_versions")
      .select(
        `
        id,
        version_number,
        name,
        description,
        items:checklist_items(
          id,
          section,
          sort_order,
          item_key,
          label,
          help_text,
          item_type,
          required,
          validation_rules,
          conditional_logic,
          enum_options,
          default_value
        )
      `
      )
      .eq("id", inspection.checklist_template_version_id)
      .eq("company_id", profile.company_id)
      .single();

    if (templateData) {
      template = templateData;
    }
  }

  // Get existing responses
  const { data: responses } = await supabase
    .from("inspection_responses")
    .select("checklist_item_id, value, note")
    .eq("inspection_id", inspection.id)
    .eq("company_id", profile.company_id);

  // Get existing files
  const { data: files } = await supabase
    .from("inspection_files")
    .select("id, checklist_item_id, storage_path, file_name")
    .eq("inspection_id", inspection.id)
    .eq("company_id", profile.company_id);

  // Convert responses to map
  const responsesMap: Record<string, any> = {};
  (responses || []).forEach((r) => {
    try {
      responsesMap[r.checklist_item_id] = typeof r.value === "string" ? JSON.parse(r.value) : r.value;
    } catch {
      responsesMap[r.checklist_item_id] = r.value;
    }
  });

  return (
    <>
      <TopBar
        title="Inspection"
        right={
          <Link className="pill" href="/">
            Back
          </Link>
        }
      />
      <main className="container">
        <div className="stack">
          <div className="card">
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Status: {inspection.status}</div>
            {inspection.assigned_user ? (
              <div className="muted" style={{ marginTop: 6, fontSize: 14 }}>
                Assigned to: <strong>{inspection.assigned_user.full_name || inspection.assigned_user.email || "Unknown"}</strong>
              </div>
            ) : inspection.assigned_to ? (
              <div className="muted" style={{ marginTop: 6, fontSize: 12, wordBreak: "break-all" }}>
                Assigned to: {inspection.assigned_to}
              </div>
            ) : null}
            {inspection.scheduled_at && (
              <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                Scheduled: {new Date(inspection.scheduled_at).toLocaleString("de-DE")}
              </div>
            )}
            <div className="muted" style={{ marginTop: 6, fontSize: 11, wordBreak: "break-all" }}>
              ID: {inspection.id}
            </div>
          </div>
          {template ? (
            <ChecklistFormClient
              inspectionId={inspection.id}
              companyId={profile.company_id}
              userId={session.user.id}
              userRole={profile.role}
              template={template}
              existingResponses={responsesMap}
              existingFiles={files || []}
              inspectionStatus={inspection.status}
            />
          ) : (
            <div className="card">
              <div style={{ fontWeight: 800, marginBottom: 8 }}>No Checklist Template</div>
              <div className="muted" style={{ marginBottom: 12 }}>
                This inspection doesn't have a checklist template assigned.
              </div>
              {(profile.role === "admin" || profile.role === "dispatcher") && (
                <AssignTemplateButton inspectionId={inspection.id} />
              )}
              {profile.role === "worker" && (
                <div className="muted" style={{ fontSize: 13 }}>
                  Please contact an admin to assign a checklist template.
                </div>
              )}
            </div>
          )}
          <InspectionActivityLog inspectionId={inspection.id} companyId={profile.company_id} />
        </div>
      </main>
    </>
  );
}

