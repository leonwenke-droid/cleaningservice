import Link from "next/link";
import { redirect } from "next/navigation";

import { TopBar } from "@/components/TopBar";
import { UserList } from "@/components/admin/UserList";
import { InviteUserForm } from "@/components/admin/InviteUserForm";
import { getSessionAndProfile } from "@/lib/auth/server";

export default async function AdminUsersPage() {
  const { session, profile } = await getSessionAndProfile();
  if (!session) redirect("/login");

  if (profile.role !== "admin") {
    redirect("/");
  }

  return (
    <>
      <TopBar
        title="Manage Users"
        right={
          <Link className="pill" href="/">
            Home
          </Link>
        }
      />
      <main className="container">
        <div className="stack">
          <div className="card">
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Invite Employee</div>
            <InviteUserForm companyId={profile.company_id} />
          </div>

          <div className="card">
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Company Users</div>
            <UserList companyId={profile.company_id} currentUserId={session.user.id} />
          </div>
        </div>
      </main>
    </>
  );
}
