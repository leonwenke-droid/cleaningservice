// Auth callback must run at request time (search params, cookies).
// Skip static prerender to avoid build errors on Vercel.
export const dynamic = "force-dynamic";

export default function AuthCallbackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
