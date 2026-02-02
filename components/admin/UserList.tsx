"use client";

import { useState, useEffect } from "react";

type UserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: "admin" | "dispatcher" | "worker";
  created_at: string;
};

type Props = {
  companyId: string;
  currentUserId: string;
};

export function UserList({ companyId, currentUserId }: Props) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function loadUsers() {
      try {
        const response = await fetch(`/api/admin/users?company_id=${companyId}`, {
          credentials: "include",
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error((data as { error?: string })?.error || "Failed to load users");
        }

        setUsers(Array.isArray((data as { users?: UserRow[] }).users) ? (data as { users: UserRow[] }).users : []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load users");
      } finally {
        setLoading(false);
      }
    }

    loadUsers();
  }, [companyId]);

  async function updateRole(userId: string, newRole: "admin" | "dispatcher" | "worker") {
    setMessage(null);
    setUpdatingRole(userId);
    try {
      const response = await fetch("/api/admin/update-user-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ user_id: userId, role: newRole }),
      });

      const text = await response.text();
      let data: { error?: string } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        setMessage({ type: "error", text: `Server returned non-JSON (${response.status})` });
        return;
      }

      if (!response.ok) {
        setMessage({ type: "error", text: data.error || `Error ${response.status}` });
        return;
      }

      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      setMessage({ type: "success", text: "Role updated." });
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to update role" });
    } finally {
      setUpdatingRole(null);
    }
  }

  async function removeUser(userId: string) {
    if (!confirm("Remove this user from the company? They will no longer have access.")) return;
    setMessage(null);
    setDeletingId(userId);
    try {
      const response = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ user_id: userId }),
      });

      const text = await response.text();
      let data: { error?: string; success?: boolean } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        setMessage({ type: "error", text: `Server returned non-JSON (${response.status})` });
        return;
      }

      if (!response.ok) {
        setMessage({ type: "error", text: data.error || `Error ${response.status}` });
        return;
      }
      if (data.success !== true) {
        setMessage({ type: "error", text: data.error || "Remove failed" });
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setMessage({ type: "success", text: "User removed." });
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to remove user" });
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return <div className="muted">Loading users…</div>;
  }

  if (error) {
    return <div className="muted" style={{ color: "#dc2626" }}>{error}</div>;
  }

  if (users.length === 0) {
    return <div className="muted">No users found.</div>;
  }

  return (
    <>
      {message && (
        <div
          style={{
            padding: 8,
            borderRadius: 6,
            marginBottom: 8,
            background: message.type === "success" ? "#d1fae9" : "#fee2e2",
            color: message.type === "success" ? "#065f46" : "#b91c1c",
            fontSize: 13,
          }}
        >
          {message.text}
        </div>
      )}
      <div className="stack" style={{ gap: 8 }}>
        {users.map((user) => (
          <div key={user.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 800 }}>{user.full_name || "No name"}</div>
                <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                  {user.email || user.id.slice(0, 8) + "…"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {user.id === currentUserId ? (
                  <span className="pill" style={{ fontSize: 12 }}>
                    You (Admin)
                  </span>
                ) : (
                  <select
                    value={user.role}
                    onChange={(e) => updateRole(user.id, e.target.value as "admin" | "dispatcher" | "worker")}
                    disabled={updatingRole === user.id}
                    style={{ fontSize: 12, padding: "4px 8px" }}
                  >
                    <option value="worker">Worker</option>
                    <option value="dispatcher">Dispatcher</option>
                    <option value="admin">Admin</option>
                  </select>
                )}
                {user.id !== currentUserId && (
                  <button
                    type="button"
                    onClick={() => removeUser(user.id)}
                    disabled={deletingId === user.id}
                    style={{
                      fontSize: 12,
                      padding: "4px 8px",
                      background: "#fee2e2",
                      color: "#b91c1c",
                      border: "1px solid #fecaca",
                      borderRadius: 4,
                      cursor: deletingId === user.id ? "not-allowed" : "pointer",
                    }}
                  >
                    {deletingId === user.id ? "Removing…" : "Remove"}
                  </button>
                )}
              </div>
            </div>
            {user.phone && (
              <div className="muted" style={{ fontSize: 12 }}>
                📞 {user.phone}
              </div>
            )}
            <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
              Created: {new Date(user.created_at).toLocaleDateString("de-DE")}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
