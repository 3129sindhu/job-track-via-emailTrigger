import { useEffect, useState } from "react";
import api from "../api";

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

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
        {
          theme: "outline",
          size: "large",
          width: "360",
          text: "continue_with",
          shape: "pill",
        }
      );
    }, 100);

    return () => clearInterval(interval);
  }, [onLogin]);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoCircle}>JT</div>
          <div>
            <h1 style={styles.title}>Job Tracker</h1>
            <p style={styles.subtitle}>
              Sign in to sync Gmail and organize job updates automatically.
            </p>
          </div>
        </div>

        <div style={styles.features}>
          <Feature text="Secure Google OAuth sign-in" />
          <Feature text="ML-based email classification" />
          <Feature text="Dashboard view for Applied / Interview / Offer / Rejected" />
        </div>

        <div style={styles.buttonWrap}>
          <div id="googleSignInDiv" />
        </div>

        {loading && (
          <div style={styles.info}>
            <Spinner />
            <span style={styles.infoText}>Signing you in…</span>
          </div>
        )}

        {err && (
          <div style={styles.errorBox}>
            <span style={styles.errorTitle}>Sign-in failed</span>
            <span style={styles.errorText}>{err}</span>
          </div>
        )}

        <p style={styles.footer}>
          By continuing, you allow read-only access to job-related Gmail metadata used for tracking.
        </p>
      </div>
    </div>
  );
}

function Feature({ text }) {
  return (
    <div style={styles.featureRow}>
      <span style={styles.check}>✓</span>
      <span style={styles.featureText}>{text}</span>
    </div>
  );
}

function Spinner() {
  return <span style={styles.spinner} />;
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 20,
    background:
      "radial-gradient(1200px 600px at 20% 10%, rgba(99,102,241,0.18), transparent 60%), radial-gradient(900px 500px at 80% 30%, rgba(16,185,129,0.14), transparent 55%), #0b1220",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
  },
  card: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 18,
    padding: 22,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
    backdropFilter: "blur(10px)",
    color: "rgba(255,255,255,0.92)",
  },
  header: {
    display: "flex",
    gap: 14,
    alignItems: "center",
    marginBottom: 14,
  },
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(135deg, rgba(99,102,241,0.9), rgba(16,185,129,0.85))",
    color: "white",
    fontWeight: 800,
    letterSpacing: 0.5,
    boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
    flexShrink: 0,
  },
  title: {
    fontSize: 26,
    margin: 0,
    lineHeight: 1.1,
    letterSpacing: -0.2,
  },
  subtitle: {
    margin: "6px 0 0 0",
    color: "rgba(255,255,255,0.72)",
    fontSize: 14.5,
    lineHeight: 1.45,
  },
  features: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.10)",
  },
  featureRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "6px 0",
  },
  check: {
    width: 18,
    height: 18,
    borderRadius: 6,
    display: "grid",
    placeItems: "center",
    background: "rgba(16,185,129,0.18)",
    border: "1px solid rgba(16,185,129,0.35)",
    color: "rgba(16,185,129,0.95)",
    fontSize: 12,
    marginTop: 1,
    flexShrink: 0,
  },
  featureText: {
    color: "rgba(255,255,255,0.80)",
    fontSize: 14,
    lineHeight: 1.35,
  },
  buttonWrap: {
    marginTop: 18,
    display: "flex",
    justifyContent: "center",
    padding: "14px 0 4px",
  },
  info: {
    marginTop: 12,
    display: "flex",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    color: "rgba(255,255,255,0.78)",
  },
  infoText: {
    fontSize: 14,
  },
  spinner: {
    width: 14,
    height: 14,
    borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.25)",
    borderTopColor: "rgba(255,255,255,0.85)",
    display: "inline-block",
    animation: "spin 0.9s linear infinite",
  },
  errorBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    background: "rgba(244,63,94,0.10)",
    border: "1px solid rgba(244,63,94,0.30)",
    color: "rgba(255,255,255,0.92)",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  errorTitle: {
    fontWeight: 700,
    fontSize: 13.5,
  },
  errorText: {
    fontSize: 13.5,
    color: "rgba(255,255,255,0.82)",
    lineHeight: 1.35,
    wordBreak: "break-word",
  },
  footer: {
    marginTop: 14,
    fontSize: 12.5,
    color: "rgba(255,255,255,0.55)",
    lineHeight: 1.4,
    textAlign: "center",
  },
};

// Add the spinner keyframes once (global)
if (typeof document !== "undefined" && !document.getElementById("jt-login-spin")) {
  const style = document.createElement("style");
  style.id = "jt-login-spin";
  style.innerHTML = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
}