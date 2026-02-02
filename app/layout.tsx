import type { ReactNode } from "react";

export const metadata = {
  title: "Cleaning MVP",
  description: "Lead intake + inspections"
};

// Root layout - Next.js requires html/body here
// Middleware will redirect / to /de, and [locale]/layout will handle the actual content
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
