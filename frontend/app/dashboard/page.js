"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const accessToken = localStorage.getItem("access_token");
    if (!storedUser || !accessToken) {
      router.replace("/login");
      return;
    }
    setUser(JSON.parse(storedUser));
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
    <main style={{ padding: "2rem", fontFamily: "var(--font-geist-sans)" }}>
      <h1>Welcome, {user.full_name}</h1>
      <p>
        You are logged in as <strong>{user.email}</strong>.
      </p>
      <button onClick={handleLogout} className="primary-button" style={{ marginTop: "1rem" }}>
        Log out
      </button>
    </main>
  );
}