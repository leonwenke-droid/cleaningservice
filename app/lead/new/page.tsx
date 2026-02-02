import Link from "next/link";
import { redirect } from "next/navigation";

import { TopBar } from "@/components/TopBar";
import { LeadNewForm } from "@/components/lead/LeadNewForm";
import { getSessionAndProfile } from "@/lib/auth/server";

export default async function LeadNewPage() {
  const { session, profile } = await getSessionAndProfile();
  if (!session) redirect("/login");

  const canCreate = profile.role === "admin" || profile.role === "dispatcher";
  if (!canCreate) redirect("/");

  return (
    <>
      <TopBar
        title="New lead"
        right={
          <Link className="pill" href="/">
            Back
          </Link>
        }
      />
      <main className="container">
        <div className="card">
          <LeadNewForm
            companyId={profile.company_id}
            createdBy={session.user.id}
          />
        </div>
      </main>
    </>
  );
}

