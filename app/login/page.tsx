import Link from "next/link";

import { TopBar } from "@/components/TopBar";
import { AuthForm } from "@/components/auth/AuthForm";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string; message?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const error = resolvedSearchParams?.error;
  const message = resolvedSearchParams?.message;

  return (
    <>
      <TopBar title="Sign in" right={<Link href="/" className="pill">Home</Link>} />
      <main className="container">
        <div className="stack">
          {error ? (
            <div className="card">
              <div style={{ fontWeight: 800 }}>Auth issue</div>
              <div className="muted">{error}</div>
            </div>
          ) : null}
          <div className="card">
            <AuthForm initialMessage={message} />
          </div>
        </div>
      </main>
    </>
  );
}

