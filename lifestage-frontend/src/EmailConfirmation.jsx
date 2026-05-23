// src/EmailConfirmation.jsx
// Two exports:
//   1. <EmailBanner />        — shown at top of feed if email not confirmed
//   2. <ConfirmEmailPage />   — shown when user clicks link in email

import { useState, useEffect } from "react";

const API = "/api";

// ── Email Banner (shown on feed when emailConfirmed = false) ──────────────────
export function EmailBanner({ email, token, onConfirmed }) {
  const [status, setStatus]   = useState("idle"); // idle | sending | sent | error
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('email_banner_dismissed') === '1');

  if (dismissed) return null;

  const dismiss = () => { sessionStorage.setItem('email_banner_dismissed', '1'); setDismissed(true); };

  const resend = async () => {
    setStatus("sending");
    try {
      await fetch(`${API}/auth/resend-confirmation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div style={{
      background: "linear-gradient(135deg, #fff8ee, #fff3e0)",
      border: "1px solid #f0c878",
      borderLeft: "4px solid #e8a050",
      borderRadius: 14,
      padding: "14px 18px",
      marginBottom: 20,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      flexWrap: "wrap",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 20 }}>📧</span>
        <div>
          <div style={{ fontFamily: "'Lato', sans-serif", fontWeight: 700, fontSize: 14, color: "#7a5020" }}>
            Please confirm your email address
          </div>
          <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 13, color: "#a07840", marginTop: 2 }}>
            We sent a confirmation link to <strong>{email}</strong>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {status === "sent" ? (
          <span style={{ fontSize: 13, color: "#50a870", fontWeight: 600, fontFamily: "'Lato', sans-serif" }}>
            ✓ Email sent!
          </span>
        ) : status === "error" ? (
          <span style={{ fontSize: 13, color: "#e05050", fontFamily: "'Lato', sans-serif" }}>
            Failed — try again
          </span>
        ) : (
          <button
            onClick={resend}
            disabled={status === "sending"}
            style={{
              background: "none", border: "1.5px solid #e0a050", borderRadius: 20,
              padding: "6px 16px", color: "#c8824a", cursor: "pointer",
              fontSize: 13, fontWeight: 700, fontFamily: "'Lato', sans-serif",
            }}
          >
            {status === "sending" ? "Sending..." : "Resend link"}
          </button>
        )}
        <button
          onClick={dismiss}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#b09060", fontSize: 18 }}
        >✕</button>
      </div>
    </div>
  );
}

// ── Confirm Email Page (route: /confirm-email?userId=...&token=...) ───────────
export function ConfirmEmailPage({ onSuccess }) {
  const [status, setStatus] = useState("loading"); // loading | success | error | already
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params  = new URLSearchParams(window.location.search);
    const userId  = params.get("userId");
    const token   = params.get("token");

    if (!userId || !token) {
      setStatus("error");
      setMessage("Invalid confirmation link — missing parameters.");
      return;
    }

    fetch(`${API}/auth/confirm-email?userId=${userId}&token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        if (data.alreadyConfirmed) {
          setStatus("already");
        } else if (data.accessToken) {
          setStatus("success");
          // Pass confirmed auth back to App
          setTimeout(() => onSuccess && onSuccess(data), 2000);
        } else {
          setStatus("error");
          setMessage(data.message || "Confirmation failed.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Could not connect to server.");
      });
  }, []);

  const icons    = { loading: "⏳", success: "✅", error: "❌", already: "✓" };
  const titles   = {
    loading: "Confirming your email...",
    success: "Email confirmed! 🎭",
    error:   "Confirmation failed",
    already: "Already confirmed",
  };
  const subtitles = {
    loading: "Just a moment...",
    success: "Welcome to LifeStage! Redirecting you now...",
    error:   message || "The link may have expired. Request a new one from the app.",
    already: "Your email is already confirmed. You can sign in.",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(145deg, #faf6f0 0%, #f5ece0 50%, #ede0d0 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Lato', sans-serif", padding: 20,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;800&family=Lato:wght@400;700&display=swap" rel="stylesheet" />

      <div style={{
        background: "#fff", borderRadius: 24, padding: "48px 40px",
        maxWidth: 420, width: "100%", textAlign: "center",
        boxShadow: "0 20px 60px rgba(100,70,40,0.12)",
        border: "1px solid #ede0d0",
      }}>
        {/* Brand */}
        <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 24, color: "#3a2e26", marginBottom: 32 }}>
          🎭 LifeStage
        </div>

        {/* Status icon */}
        <div style={{ fontSize: 56, marginBottom: 20 }}>{icons[status]}</div>

        {/* Title */}
        <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 22, color: "#3a2e26", marginBottom: 12 }}>
          {titles[status]}
        </div>

        {/* Subtitle */}
        <div style={{ fontSize: 15, color: "#7a6a60", lineHeight: 1.6, marginBottom: 28 }}>
          {subtitles[status]}
        </div>

        {/* Actions */}
        {(status === "success" || status === "already") && (
          <button
            onClick={() => onSuccess && onSuccess(null)}
            style={{
              background: "linear-gradient(135deg, #c8824a, #e8a870)",
              border: "none", borderRadius: 14, padding: "13px 32px",
              color: "#fff", cursor: "pointer", fontSize: 15, fontWeight: 700,
              fontFamily: "'Playfair Display', serif",
              boxShadow: "0 4px 16px rgba(200,130,74,0.35)",
            }}>
            Go to LifeStage →
          </button>
        )}

        {status === "error" && (
          <button
            onClick={() => onSuccess && onSuccess(null)}
            style={{
              background: "none", border: "1.5px solid #e0c8b0", borderRadius: 14,
              padding: "13px 32px", color: "#c8824a", cursor: "pointer",
              fontSize: 15, fontWeight: 700, fontFamily: "'Lato', sans-serif",
            }}>
            Back to sign in
          </button>
        )}

        {/* Loading spinner */}
        {status === "loading" && (
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            border: "3px solid #e8ddd0", borderTop: "3px solid #c8824a",
            margin: "0 auto",
            animation: "spin 1s linear infinite",
          }} />
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
