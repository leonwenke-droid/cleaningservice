import Link from "next/link";

import { TopBar } from "@/components/TopBar";
import { RegisterCompanyForm } from "@/components/auth/RegisterCompanyForm";
import { defaultLocale } from "@/lib/i18n-constants";

export default function RegisterPage() {
  return (
    <>
      <TopBar title="Register Company" right={<Link href={`/${defaultLocale}/login`} className="pill">Login</Link>} />
      <main className="container">
        <div className="card">
          <RegisterCompanyForm />
        </div>
      </main>
    </>
  );
}
