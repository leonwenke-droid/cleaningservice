import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { TopBar } from "@/components/TopBar";
import { UserList } from "@/components/admin/UserList";
import { InviteUserForm } from "@/components/admin/InviteUserForm";
import { getSessionAndProfile } from "@/lib/auth/server";

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const { session, profile } = await getSessionAndProfile();
  if (!session) redirect(`/${locale}/login`);

  if (profile.role !== "admin") {
    redirect(`/${locale}`);
  }

  return (
    <>
      <TopBar
        title={t("admin.userManagement")}
        right={
          <Link className="pill" href={`/${locale}`}>
            {t("navigation.home")}
          </Link>
        }
      />
      <main className="container">
        <div className="stack">
          <div className="card">
            <div style={{ fontWeight: 900, marginBottom: 6 }}>{t("admin.inviteEmployee")}</div>
            <InviteUserForm companyId={profile.company_id} />
          </div>

          <div className="card">
            <div style={{ fontWeight: 900, marginBottom: 6 }}>{t("admin.companyUsers")}</div>
            <UserList companyId={profile.company_id} currentUserId={session.user.id} />
          </div>
        </div>
      </main>
    </>
  );
}
