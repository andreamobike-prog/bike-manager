"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    const correctPassword = process.env.NEXT_PUBLIC_APP_PASSWORD;

    if (password === correctPassword) {
      localStorage.setItem("app_auth", "ok");
      router.push("/");
      router.refresh();
    } else {
      setError("Password errata");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#f8fafc",
      }}
    >
      <form
        onSubmit={handleLogin}
        style={{
          background: "#fff",
          padding: 30,
          borderRadius: 14,
          border: "1px solid #e5e7eb",
          width: 320,
        }}
      >
        <h2>Accesso</h2>

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: 12,
            marginTop: 10,
            marginBottom: 10,
            borderRadius: 8,
            border: "1px solid #d1d5db",
          }}
        />

        {error && <div style={{ color: "red" }}>{error}</div>}

        <button
          type="submit"
          style={{
            width: "100%",
            padding: 12,
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            marginTop: 10,
            cursor: "pointer",
          }}
        >
          Entra
        </button>
      </form>
    </div>
  );
}