"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function EmployeeDashboardPage() {
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
    if (parsed.role !== "employee") {
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
          <p className="eyebrow">Employee dashboard</p>
          <h1>Welcome, {user.full_name}</h1>
          <p>Signed in as {user.email}</p>
        </div>
        <button type="button" className="primary-button" onClick={handleLogout}>
          Log out
        </button>
      </header>

      <section className="dashboard-card">
        <h2>Workplace overview</h2>
        <p>
          Title: <strong>{user.job_title || "—"}</strong> · Department:{" "}
          <strong>{user.department || "—"}</strong>
        </p>
        <p>This is your employee workspace after onboarding is complete.</p>
      </section>
    </main>
  );
}
