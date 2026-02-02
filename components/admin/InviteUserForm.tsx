"use client";

import { useState, type FormEvent } from "react";

type Props = {
  companyId: string;
};

export function InviteUserForm({ companyId }: Props) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"admin" | "dispatcher" | "worker">("worker");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/invite-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          full_name: fullName.trim() || null,
          phone: phone.trim() || null,
          role,
          password: password.trim() || null,
          company_id: companyId,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError((data as { error?: string }).error || "Failed to invite");
        return;
      }
      setSuccess((data as { message?: string }).message || "Done");
      setEmail("");
      setFullName("");
      setPhone("");
      setPassword("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to invite");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="stack" style={{ gap: 8 }}>
      <div>
        <label className="label">Email *</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="user@example.com"
        />
      </div>
      <div>
        <label className="label">Full name</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Name"
        />
      </div>
      <div>
        <label className="label">Phone</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+49..."
        />
      </div>
      <div>
        <label className="label">Role</label>
        <select value={role} onChange={(e) => setRole(e.target.value as "admin" | "dispatcher" | "worker")}>
          <option value="worker">Worker</option>
          <option value="dispatcher">Dispatcher</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <div>
        <label className="label">Password (optional – leave empty to send invite email)</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min 6 characters"
        />
      </div>
      {error && <div style={{ color: "#b91c1c", fontSize: 13 }}>{error}</div>}
      {success && <div style={{ color: "#065f46", fontSize: 13 }}>{success}</div>}
      <button type="submit" className="btn" disabled={loading}>
        {loading ? "Sending…" : "Invite / Create user"}
      </button>
    </form>
  );
}
