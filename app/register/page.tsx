import Link from "next/link";

import { TopBar } from "@/components/TopBar";
import { RegisterCompanyForm } from "@/components/auth/RegisterCompanyForm";

export default function RegisterPage() {
  return (
    <>
      <TopBar title="Register Company" right={<Link href="/login" className="pill">Login</Link>} />
      <main className="container">
        <div className="card">
          <RegisterCompanyForm />
        </div>
      </main>
    </>
  );
}
