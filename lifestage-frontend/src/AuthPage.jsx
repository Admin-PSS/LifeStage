import { useState } from "react";
import { api } from "./api";
import { saveAuth } from "./auth";

const BASE_URL = (import.meta.env.VITE_API_URL ?? "") + "/api";

// OAuth must hit the backend directly (not via Vite proxy) — cookies don't work across proxy
const OAUTH_BASE = (import.meta.env.VITE_API_URL || "https://lifestage-cbfgh8b6ercddmd6.canadacentral-01.azurewebsites.net") + "/api";

// ─── OAuth Provider Configs ───────────────────────────────────────────────────
const OAUTH_PROVIDERS = [
  {
    id: "Google",
    label: "Continue with Google",
    color: "#fff",
    textColor: "#3c3c3c",
    border: "#dadce0",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    ),
  },
  {
    id: "Microsoft",
    label: "Continue with Microsoft",
    color: "#fff",
    textColor: "#3c3c3c",
    border: "#dadce0",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="#F25022" d="M1 1h10.5v10.5H1z"/>
        <path fill="#7FBA00" d="M12.5 1H23v10.5H12.5z"/>
        <path fill="#00A4EF" d="M1 12.5h10.5V23H1z"/>
        <path fill="#FFB900" d="M12.5 12.5H23V23H12.5z"/>
      </svg>
    ),
  },
];

// ─── Input Field ──────────────────────────────────────────────────────────────
function Field({ label, type = "text", value, onChange, placeholder, error }) {
  const [focused, setFocused] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const isPassword = type === "password";

  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{
        display: "block", marginBottom: 6,
        fontSize: 13, fontWeight: 600, color: "#5a4a40",
        fontFamily: "'Lato', sans-serif", letterSpacing: 0.3,
      }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={isPassword && showPw ? "text" : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          style={{
            width: "100%", boxSizing: "border-box",
            padding: isPassword ? "11px 42px 11px 14px" : "11px 14px",
            borderRadius: 12, fontSize: 15,
            fontFamily: "'Lato', sans-serif",
            color: "#3a2e26",
            background: focused ? "#fff" : "#fdf8f4",
            border: `1.5px solid ${error ? "#e05050" : focused ? "#c8824a" : "#e0d0c0"}`,
            outline: "none",
            transition: "all 0.2s",
            boxShadow: focused ? "0 0 0 3px rgba(200,130,74,0.12)" : "none",
          }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            style={{
              position: "absolute", right: 12, top: "50%",
              transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer",
              color: "#a08878", fontSize: 13, padding: 0,
            }}
          >{showPw ? "Hide" : "Show"}</button>
        )}
      </div>
      {error && (
        <div style={{ color: "#e05050", fontSize: 12, marginTop: 5, fontFamily: "'Lato', sans-serif" }}>
          {error}
        </div>
      )}
    </div>
  );
}

// ─── OAuth Button ─────────────────────────────────────────────────────────────
function OAuthBtn({ provider }) {
  const [hover, setHover] = useState(false);

  const handleClick = () => {
    const returnUrl = encodeURIComponent(window.location.origin);
    window.location.href = `${OAUTH_BASE}/auth/oauth/${provider.id}?returnUrl=${returnUrl}`;
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        padding: "10px 16px", borderRadius: 12, cursor: "pointer",
        background: hover ? (provider.color === "#fff" ? "#f8f4f0" : provider.color + "dd") : provider.color,
        color: provider.textColor,
        border: `1.5px solid ${provider.border}`,
        fontSize: 14, fontWeight: 600, fontFamily: "'Lato', sans-serif",
        transition: "all 0.15s",
        boxShadow: hover ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
      }}
    >
      {provider.icon}
      {provider.label}
    </button>
  );
}

// ─── Login Form ───────────────────────────────────────────────────────────────
function LoginForm({ onSuccess, onSwitch, onForgot }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const validate = () => {
    const e = {};
    if (!email) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    setServerError("");
    try {
      const data = await api.login(email, password);
      if (data.accessToken) {
        saveAuth(data);
        onSuccess(data.user);
      } else {
        setServerError(data.message || "Invalid email or password.");
      }
    } catch {
      setServerError("Could not connect to server. Is the API running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Field label="Email" type="email" value={email} onChange={v => { setEmail(v); setErrors(e => ({ ...e, email: "" })); }}
        placeholder="you@example.com" error={errors.email} />
      <Field label="Password" type="password" value={password} onChange={v => { setPassword(v); setErrors(e => ({ ...e, password: "" })); }}
        placeholder="Your password" error={errors.password} />

      <div style={{ textAlign: "right", marginTop: -10, marginBottom: 18 }}>
        <span onClick={onForgot} style={{ fontSize: 13, color: "#c8824a", cursor: "pointer", fontFamily: "'Lato', sans-serif" }}>Forgot password?</span>
      </div>

      {serverError && (
        <div style={{
          background: "#fff0f0", border: "1px solid #f5c0c0", borderRadius: 10,
          padding: "10px 14px", marginBottom: 16,
          color: "#c04040", fontSize: 13, fontFamily: "'Lato', sans-serif",
        }}>{serverError}</div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          width: "100%", padding: "13px",
          background: loading ? "#e0cfc0" : "linear-gradient(135deg, #c8824a, #e8a870)",
          border: "none", borderRadius: 14, color: "#fff",
          fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
          fontFamily: "'Playfair Display', serif",
          boxShadow: loading ? "none" : "0 4px 16px rgba(200,130,74,0.35)",
          transition: "all 0.2s",
        }}
      >
        {loading ? "Signing in..." : "Sign In to LifeStage"}
      </button>

      <div style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "#a08878", fontFamily: "'Lato', sans-serif" }}>
        No account yet?{" "}
        <span onClick={onSwitch} style={{ color: "#c8824a", fontWeight: 700, cursor: "pointer" }}>
          Create one free
        </span>
      </div>
    </form>
  );
}

// ─── Register Form ────────────────────────────────────────────────────────────
function RegisterForm({ onSuccess, onSwitch }) {
  const [form, setForm] = useState({ displayName: "", userName: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const set = (k) => (v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: "" })); };

  const validate = () => {
    const e = {};
    if (!form.displayName.trim()) e.displayName = "Display name is required";
    if (!form.userName.trim()) e.userName = "Username is required";
    else if (form.userName.length < 3) e.userName = "At least 3 characters";
    else if (/\s/.test(form.userName)) e.userName = "No spaces allowed";
    if (!form.email) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 8) e.password = "At least 8 characters";
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    setServerError("");
    try {
      const data = await api.register(form);
      if (data.accessToken) {
        saveAuth(data);
        onSuccess(data.user);
      } else {
        const msg = data.errors ? data.errors[0] : (data.message || "Registration failed.");
        setServerError(msg);
      }
    } catch {
      setServerError("Could not connect to server. Is the API running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Field label="Display Name" value={form.displayName} onChange={set("displayName")}
        placeholder="Your full name" error={errors.displayName} />
      <Field label="Username" value={form.userName} onChange={set("userName")}
        placeholder="no spaces, e.g. pyisoe" error={errors.userName} />
      <Field label="Email" type="email" value={form.email} onChange={set("email")}
        placeholder="you@example.com" error={errors.email} />
      <Field label="Password" type="password" value={form.password} onChange={set("password")}
        placeholder="Min. 8 characters" error={errors.password} />

      {/* Password strength bar */}
      {form.password.length > 0 && (
        <div style={{ marginTop: -10, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{
                flex: 1, height: 3, borderRadius: 2,
                background: form.password.length >= i * 2
                  ? i <= 1 ? "#e05050" : i <= 2 ? "#e8a050" : i <= 3 ? "#a0c050" : "#50b870"
                  : "#e8ddd0",
                transition: "background 0.3s",
              }} />
            ))}
          </div>
          <div style={{ fontSize: 11, color: "#a08878", fontFamily: "'Lato', sans-serif" }}>
            {form.password.length < 2 ? "Too short" : form.password.length < 4 ? "Weak" : form.password.length < 6 ? "Fair" : form.password.length < 8 ? "Good" : "Strong ✓"}
          </div>
        </div>
      )}

      {serverError && (
        <div style={{
          background: "#fff0f0", border: "1px solid #f5c0c0", borderRadius: 10,
          padding: "10px 14px", marginBottom: 16,
          color: "#c04040", fontSize: 13, fontFamily: "'Lato', sans-serif",
        }}>{serverError}</div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          width: "100%", padding: "13px",
          background: loading ? "#e0cfc0" : "linear-gradient(135deg, #c8824a, #e8a870)",
          border: "none", borderRadius: 14, color: "#fff",
          fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
          fontFamily: "'Playfair Display', serif",
          boxShadow: loading ? "none" : "0 4px 16px rgba(200,130,74,0.35)",
          transition: "all 0.2s",
        }}
      >
        {loading ? "Creating account..." : "Join LifeStage"}
      </button>

      <div style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "#a08878", fontFamily: "'Lato', sans-serif" }}>
        Already have an account?{" "}
        <span onClick={onSwitch} style={{ color: "#c8824a", fontWeight: 700, cursor: "pointer" }}>
          Sign in
        </span>
      </div>
    </form>
  );
}


// --- Forgot Password Form ---
function ForgotPasswordForm({ onBack }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!email) { setError("Email is required"); return; }
    setLoading(true); setError("");
    try {
      await fetch(BASE_URL + "/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      setError("Could not connect to server.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) return (
    <div style={{ textAlign: "center", padding: "20px 0" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📧</div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 18, color: "#3a2e26", marginBottom: 8 }}>Check your inbox</div>
      <div style={{ fontSize: 14, color: "#7a6a60", lineHeight: 1.6, marginBottom: 20 }}>
        If <strong>{email}</strong> is registered, a password reset link has been sent.
      </div>
      <span onClick={onBack} style={{ color: "#c8824a", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Back to sign in</span>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div style={{ marginBottom: 20, color: "#7a6a60", fontSize: 14, lineHeight: 1.6, fontFamily: "'Lato', sans-serif" }}>
        Enter your email and we will send you a link to reset your password.
      </div>
      <Field label="Email" type="email" value={email} onChange={v => { setEmail(v); setError(""); }}
        placeholder="you@example.com" error={error} />
      <button type="submit" disabled={loading} style={{
        width: "100%", padding: "13px",
        background: loading ? "#e0cfc0" : "linear-gradient(135deg, #c8824a, #e8a870)",
        border: "none", borderRadius: 14, color: "#fff",
        fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
        fontFamily: "'Playfair Display', serif",
        boxShadow: loading ? "none" : "0 4px 16px rgba(200,130,74,0.35)",
        transition: "all 0.2s", marginBottom: 16,
      }}>{loading ? "Sending..." : "Send Reset Link"}</button>
      <div style={{ textAlign: "center" }}>
        <span onClick={onBack} style={{ color: "#c8824a", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Back to sign in</span>
      </div>
    </form>
  );
}

// ─── Age Gate ─────────────────────────────────────────────────────────────────
function AgeGate({ onConfirm, onBack }) {
  const [checked, setChecked] = useState(false);

  return (
    <div>
      {/* Icon + title */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🔞</div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 20, color: "#3a2e26", marginBottom: 6 }}>
          Adults Only — 18+
        </div>
        <div style={{ fontSize: 13, color: "#a08878", fontStyle: "italic", fontFamily: "'Lato', sans-serif" }}>
          Please read before creating your account
        </div>
      </div>

      {/* Info box */}
      <div style={{ background: "#fdf6ee", border: "1px solid #e8d0b8", borderRadius: 14, padding: "16px 18px", marginBottom: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>🔞</span>
          <div style={{ fontSize: 13, color: "#5a4a40", fontFamily: "'Lato', sans-serif", lineHeight: 1.6 }}>
            <strong>Minimum age requirement:</strong> You must be <strong>at least 18 years old</strong> to register and use LifeStage. This platform is intended for adults only.
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>📢</span>
          <div style={{ fontSize: 13, color: "#5a4a40", fontFamily: "'Lato', sans-serif", lineHeight: 1.6 }}>
            <strong>Mature content:</strong> LifeStage may contain adult-oriented content, personal stories, and sensitive topics shared by real users. Content is not pre-screened.
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>⚖️</span>
          <div style={{ fontSize: 13, color: "#5a4a40", fontFamily: "'Lato', sans-serif", lineHeight: 1.6 }}>
            <strong>Your legal responsibility:</strong> You are solely and personally responsible for all content you post. This includes respecting others' <strong>privacy</strong>, avoiding <strong>defamation</strong>, and complying with applicable laws regarding <strong>violence</strong>, harassment, and intellectual property.
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>🚫</span>
          <div style={{ fontSize: 13, color: "#5a4a40", fontFamily: "'Lato', sans-serif", lineHeight: 1.6 }}>
            <strong>Prohibited:</strong> Illegal content, hate speech, non-consensual sharing of private material, and content involving minors are strictly prohibited and may be reported to authorities.
          </div>
        </div>
      </div>

      {/* Checkbox confirmation */}
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", marginBottom: 20 }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={e => setChecked(e.target.checked)}
          style={{ marginTop: 2, accentColor: "#c8824a", width: 16, height: 16, flexShrink: 0, cursor: "pointer" }}
        />
        <span style={{ fontSize: 13, color: "#5a4a40", fontFamily: "'Lato', sans-serif", lineHeight: 1.6 }}>
          I confirm that I am <strong>18 years of age or older</strong>, and I understand that I am personally and legally responsible for the content I post on LifeStage.
        </span>
      </label>

      {/* Buttons */}
      <button
        onClick={onConfirm}
        disabled={!checked}
        style={{
          width: "100%", padding: "13px", marginBottom: 10,
          background: checked ? "linear-gradient(135deg, #c8824a, #e8a870)" : "#e0cfc0",
          border: "none", borderRadius: 14, color: "#fff",
          fontSize: 15, fontWeight: 700, cursor: checked ? "pointer" : "not-allowed",
          fontFamily: "'Playfair Display', serif",
          boxShadow: checked ? "0 4px 16px rgba(200,130,74,0.35)" : "none",
          transition: "all 0.2s",
        }}
      >
        I'm 18+ — Continue to Register
      </button>
      <button
        onClick={onBack}
        style={{
          width: "100%", padding: "10px",
          background: "none", border: "1px solid #e0cfc0", borderRadius: 14,
          color: "#a08878", fontSize: 14, cursor: "pointer",
          fontFamily: "'Lato', sans-serif", transition: "all 0.2s",
        }}
      >
        Go Back
      </button>
    </div>
  );
}

// ─── Main Auth Page ───────────────────────────────────────────────────────────
export default function AuthPage({ onSuccess }) {
  const [mode, setMode] = useState("login"); // "login" | "register" | "forgot"
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(145deg, #faf6f0 0%, #f5ece0 50%, #ede0d0 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Lato', sans-serif", padding: "20px",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,400&family=Lato:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{ width: "100%", maxWidth: 420 }}>

        {/* Brand header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20, margin: "0 auto 16px",
            background: "linear-gradient(135deg, #c8824a, #e8c87a)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 32, boxShadow: "0 8px 24px rgba(200,130,74,0.4)",
          }}>🎭</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 28, color: "#3a2e26", letterSpacing: -0.5 }}>
            LifeStage
          </div>
          <div style={{ color: "#a08878", fontSize: 14, marginTop: 4, fontStyle: "italic" }}>
            {mode === "login" ? "Welcome back — your stage awaits" : mode === "forgot" ? "Reset your password" : "Every life deserves its moment"}
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: "#fff",
          borderRadius: 24,
          padding: "32px 32px 28px",
          boxShadow: "0 20px 60px rgba(100,70,40,0.12), 0 4px 16px rgba(100,70,40,0.08)",
          border: "1px solid #ede0d0",
        }}>
          {mode !== "forgot" && !(mode === "register" && !ageConfirmed) && (
            <div style={{ display: "flex", background: "#fdf6ee", borderRadius: 12, padding: 4, marginBottom: 28, border: "1px solid #e8ddd0" }}>
              {["login", "register"].map(m => (
                <button key={m} onClick={() => { setMode(m); if (m === "login") setAgeConfirmed(false); }} style={{
                  flex: 1, padding: "9px", border: "none", cursor: "pointer",
                  borderRadius: 9, fontSize: 14, fontWeight: 700,
                  fontFamily: "'Playfair Display', serif", transition: "all 0.2s",
                  background: mode === m ? "#fff" : "transparent",
                  color: mode === m ? "#3a2e26" : "#a08878",
                  boxShadow: mode === m ? "0 2px 8px rgba(100,70,40,0.1)" : "none",
                }}>
                  {m === "login" ? "Sign In" : "Register"}
                </button>
              ))}
            </div>
          )}

          {mode === "login"    && <LoginForm onSuccess={onSuccess} onSwitch={() => setMode("register")} onForgot={() => setMode("forgot")} />}
          {mode === "register" && !ageConfirmed && <AgeGate onConfirm={() => setAgeConfirmed(true)} onBack={() => setMode("login")} />}
          {mode === "register" && ageConfirmed  && <RegisterForm onSuccess={onSuccess} onSwitch={() => { setMode("login"); setAgeConfirmed(false); }} />}
          {mode === "forgot"   && <ForgotPasswordForm onBack={() => setMode("login")} />}

          {mode !== "forgot" && !(mode === "register" && !ageConfirmed) && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0" }}>
                <div style={{ flex: 1, height: 1, background: "#e8ddd0" }} />
                <span style={{ color: "#b0a090", fontSize: 12, fontWeight: 600, letterSpacing: 0.5 }}>OR</span>
                <div style={{ flex: 1, height: 1, background: "#e8ddd0" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {OAUTH_PROVIDERS.map(p => <OAuthBtn key={p.id} provider={p} />)}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: "#b0a090", lineHeight: 1.6 }}>
          By continuing, you agree to LifeStage's{" "}
          <span onClick={() => { window.history.pushState({}, "", "/terms"); window.dispatchEvent(new CustomEvent("ls:navigate", { detail: "terms" })); }}
            style={{ color: "#c8824a", cursor: "pointer" }}>Terms</span> and{" "}
          <span onClick={() => { window.history.pushState({}, "", "/privacy"); window.dispatchEvent(new CustomEvent("ls:navigate", { detail: "privacy" })); }}
            style={{ color: "#c8824a", cursor: "pointer" }}>Privacy Policy</span>
        </div>
      </div>
    </div>
  );
}
