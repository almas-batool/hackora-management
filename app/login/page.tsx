"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    const user = result.data.user;
    const profile = user
      ? await supabase.from("user_profiles").select("role").eq("user_id", user.id).single()
      : { data: null, error: new Error("No authenticated user returned.") };
    if (profile.error || !profile.data) {
      await supabase.auth.signOut();
      setError("Your account is not provisioned for Hackora access.");
      setLoading(false);
      return;
    }

    router.replace("/");
    router.refresh();
  };

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#050a12", color: "#f4f8ff", fontFamily: "Arial, sans-serif" }}>
      <form onSubmit={submit} style={{ width: "min(380px, calc(100% - 40px))", padding: 30, border: "1px solid #1c2b3d", borderRadius: 12, background: "#0b1421" }}>
        <h1 style={{ marginTop: 0 }}>HACKORA</h1>
        <p style={{ color: "#7f93aa" }}>Sign in to the management dashboard.</p>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} style={{ display: "block", width: "100%", boxSizing: "border-box", margin: "8px 0 18px", padding: 12, background: "#050a12", color: "#f4f8ff", border: "1px solid #1c2b3d", borderRadius: 8 }} />
        <label htmlFor="password">Password</label>
        <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} style={{ display: "block", width: "100%", boxSizing: "border-box", margin: "8px 0 18px", padding: 12, background: "#050a12", color: "#f4f8ff", border: "1px solid #1c2b3d", borderRadius: 8 }} />
        {error && <p style={{ color: "#ef4444" }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ width: "100%", padding: 13, background: "#1688e8", color: "white", border: 0, borderRadius: 8, cursor: "pointer" }}>{loading ? "Signing in..." : "Sign in"}</button>
      </form>
    </main>
  );
}
