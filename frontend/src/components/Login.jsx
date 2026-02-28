import { useEffect, useState } from "react";
import api from "../api";

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
console.log("GOOGLE_CLIENT_ID:", clientId);

export default function Login({ onLogin }) {
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setErr("");
    if (!clientId) {
      setErr("Missing VITE_GOOGLE_CLIENT_ID in frontend/.env");
      return;
    }
    const interval = setInterval(() => {
      if (!window.google?.accounts?.id) return;

      clearInterval(interval);

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          setErr("");
          setLoading(true);
          try {
            const idToken = response.credential;
            const res = await api.post("/auth/google", { idToken });

            localStorage.setItem("token", res.data.token);
            localStorage.setItem("email", res.data.user.email);
            onLogin();
          } catch (e) {
            setErr(e.response?.data?.error || e.message);
          } finally {
            setLoading(false);
          }
        },
      });

      window.google.accounts.id.renderButton(
        document.getElementById("googleSignInDiv"),
        { theme: "outline", size: "large", width: "360" }
      );
    }, 100);

    return () => clearInterval(interval);
  }, [onLogin]);

  return (
    <div style={{ maxWidth: 420, margin: "60px auto", fontFamily: "sans-serif" }}>
      <h2>Job Tracker</h2>
      <p>Sign in with Google to view & sync your jobs</p>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
        <div id="googleSignInDiv"></div>
      </div>

      {loading && <p style={{ marginTop: 12 }}>Signing you in...</p>}
      {err && <p style={{ color: "crimson", marginTop: 12 }}>{err}</p>}
    </div>
  );
}