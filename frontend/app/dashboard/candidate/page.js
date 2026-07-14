"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function CandidateDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const accessToken = localStorage.getItem("access_token");
    if (!storedUser || !accessToken) {
      router.replace("/login");
      return;
    }
    const parsed = JSON.parse(storedUser);
    if (parsed.role !== "candidate") {
      router.replace("/dashboard");
      return;
    }
    setUser(parsed);
  }, [router]);

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    router.replace("/login");
  }

  if (!user) {
    return <p style={{ textAlign: "center", marginTop: "2rem" }}>Loading…</p>;
  }

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Candidate dashboard</p>
          <h1>Welcome, {user.full_name}</h1>
          <p>Signed in as {user.email}</p>
        </div>
        <div className="dashboard-actions">
          <button type="button" className="secondary-button" onClick={() => router.push("/onboarding")}>
            Open onboarding
          </button>
          <button type="button" className="primary-button" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <section className="dashboard-card">
        <h2>Your hiring progress</h2>
        <p>
          Role: <strong>{user.job_title || "—"}</strong> · {user.department || "—"}
        </p>
        <p>Use onboarding to finish your employee setup. After submission, you can also sign in as Employee.</p>
      </section>
    </main>
  );
}
