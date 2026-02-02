import type { ReactNode } from "react";

export function TopBar({
  title,
  right
}: {
  title: string;
  right?: ReactNode;
}) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div style={{ fontWeight: 900 }}>{title}</div>
        {right ?? null}
      </div>
    </header>
  );
}

