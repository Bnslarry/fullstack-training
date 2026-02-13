"use client";

import { FormEvent, useMemo, useState } from "react";

type LoginResponse = {
  meta?: {
    accessToken?: string;
  };
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001",
    [],
  );

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setAccessToken("");

    try {
      const res = await fetch(`${apiBaseUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        setError(`登录失败: ${res.status}`);
        return;
      }

      const data = (await res.json()) as LoginResponse;
      const token = data.meta?.accessToken;

      if (!token) {
        setError("登录成功，但未返回 accessToken");
        return;
      }

      setAccessToken(token);
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 480 }}>
      <h1>登录</h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "登录中..." : "登录"}
        </button>
      </form>

      {error ? (
        <p style={{ color: "crimson", marginTop: 12 }}>{error}</p>
      ) : null}

      {accessToken ? (
        <section style={{ marginTop: 16 }}>
          <h2>Access Token (in-memory)</h2>
          <code style={{ wordBreak: "break-all" }}>{accessToken}</code>
        </section>
      ) : null}
    </main>
  );
}
