import { useState, useEffect } from "react";

// ── Constants ──────────────────────────────────────────────────────────────────
const TOKEN_KEY = "ls_token";
const USER_KEY  = "ls_user";
const PALETTE   = ["#E8A87C","#7CB8E8","#B87CE8","#7CE8B4","#E8C87C","#E87CA8","#7CE8D8"];

// ── Helpers ────────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const s = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (s < 60)  return "just now";
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function avatarColor(str = "") {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return PALETTE[Math.abs(h) % PALETTE.length];
}

function initials(name = "") {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
}

// Map the full PostDto (from /api/posts/feed)
function mapPostDto(dto) {
  const color = avatarColor(dto.author.userName);
  return {
    id:       dto.id,
    user:     { name: dto.author.displayName, handle: `@${dto.author.userName}`, avatar: initials(dto.author.displayName), color, verified: dto.author.isVerified, avatarUrl: dto.author.avatarUrl ?? null },
    time:     timeAgo(dto.createdAt),
    text:     dto.content,
    likes:    dto.likeCount,
    comments: dto.commentCount,
    reposts:  dto.repostCount,
    liked:    dto.isLikedByMe ?? false,
    tags:     (dto.hashtags ?? []).map(t => `#${t}`),
  };
}

// Map the slim anonymous shape returned by /api/trending/posts
function mapTrendingPost(dto) {
  const color = avatarColor(dto.author.userName);
  return {
    id:       dto.id,
    user:     { name: dto.author.displayName, handle: `@${dto.author.userName}`, avatar: initials(dto.author.displayName), color, verified: dto.author.isVerified, avatarUrl: dto.author.avatarUrl ?? null },
    time:     timeAgo(dto.createdAt),
    text:     dto.content,
    likes:    dto.likeCount,
    comments: dto.commentCount,
    reposts:  dto.repostCount,
    liked:    false,
    tags:     [],
  };
}

// Map TrendingHashtagDto — tag already has '#' from the API
function mapTrend(dto) {
  const n = dto.postCount;
  return { tag: dto.tag, posts: n >= 1000 ? `${(n / 1000).toFixed(1)}K posts` : `${n} posts` };
}

// ── API ───────────────────────────────────────────────────────────────────────
async function apiFetch(path, { token, ...opts } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, { headers, ...opts });
  if (res.status === 204) return null;
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.message ?? json?.title ?? res.statusText);
  return json;
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ user, size = 40 }) {
  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt={user.name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `2px solid ${user.color}55` }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg, ${user.color}dd, ${user.color}66)`, border: `2px solid ${user.color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.34, fontWeight: 800, color: "#fff", flexShrink: 0, letterSpacing: 0.5, fontFamily: "'Playfair Display', serif", boxShadow: `0 2px 12px ${user.color}33` }}>
      {user.avatar}
    </div>
  );
}

// ── Icon ──────────────────────────────────────────────────────────────────────
function Icon({ d, size = 18, stroke = "currentColor", fill = "none" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

// ── ActionBtn ─────────────────────────────────────────────────────────────────
function ActionBtn({ icon, count, active, activeColor, fill = "none", onClick, label, style: extra }) {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} title={label}
      style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: active ? activeColor : hover ? "#b0957a" : "#8a7a6a", fontSize: 13, fontFamily: "'Lato', sans-serif", transition: "color 0.15s", padding: "4px 0", ...extra }}>
      <Icon d={icon} size={17} stroke={active ? activeColor : hover ? "#b0957a" : "#8a7a6a"} fill={active && fill !== "none" ? fill : "none"} />
      {count != null && <span>{count >= 1000 ? `${(count / 1000).toFixed(1)}K` : count}</span>}
    </button>
  );
}

// ── PostCard ──────────────────────────────────────────────────────────────────
function PostCard({ post, token, currentUser, onLike, onRequireAuth }) {
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment]           = useState("");
  const [localComments, setLocalComments] = useState(post.comments);
  const [hovered, setHovered]           = useState(false);
  const [submitting, setSubmitting]     = useState(false);

  const toggleComment = () => { if (!token) { onRequireAuth(); return; } setShowComments(v => !v); };

  const submitComment = async () => {
    if (!comment.trim() || submitting) return;
    setSubmitting(true);
    try {
      await apiFetch(`/posts/${post.id}/comments`, { token, method: "POST", body: JSON.stringify({ content: comment }) });
    } catch { /* ignore — count still updates locally */ }
    setLocalComments(c => c + 1);
    setComment(""); setShowComments(false);
    setSubmitting(false);
  };

  const me = currentUser
    ? { avatar: initials(currentUser.displayName), color: avatarColor(currentUser.userName), avatarUrl: currentUser.avatarUrl ?? null }
    : { avatar: "?", color: "#E8B47C", avatarUrl: null };

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ background: hovered ? "#fdf8f3" : "#fff", border: "1px solid #e8ddd0", borderRadius: 20, padding: "20px 24px", transition: "all 0.2s", transform: hovered ? "translateY(-1px)" : "none", boxShadow: hovered ? "0 8px 28px rgba(180,140,100,0.12)" : "0 2px 8px rgba(180,140,100,0.06)" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
        <Avatar user={post.user} size={44} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 15, color: "#3a2e26" }}>{post.user.name}</span>
            {post.user.verified && <span style={{ background: "#c8824a", borderRadius: "50%", width: 16, height: 16, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#fff" }}>✓</span>}
            <span style={{ color: "#a08878", fontSize: 13 }}>{post.user.handle}</span>
            <span style={{ color: "#c8bab0", fontSize: 12, marginLeft: "auto" }}>{post.time}</span>
          </div>
          <p style={{ color: "#5a4a40", fontSize: 15, lineHeight: 1.7, margin: "8px 0 0", fontFamily: "'Lato', sans-serif", whiteSpace: "pre-line" }}>{post.text}</p>
          {post.tags.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              {post.tags.map(t => <span key={t} style={{ color: "#c8824a", fontSize: 13, cursor: "pointer" }}>{t}</span>)}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, marginTop: 4, paddingTop: 12, borderTop: "1px solid #f0e8e0" }}>
        <ActionBtn icon="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
          count={post.likes} active={post.liked} activeColor="#e07050" fill={post.liked ? "#e07050" : "none"}
          onClick={() => token ? onLike(post.id) : onRequireAuth()} label="Like" />
        <ActionBtn icon="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
          count={localComments} active={showComments} activeColor="#c8824a"
          onClick={toggleComment} label="Comment" />
        <ActionBtn icon="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3"
          count={post.reposts} activeColor="#7aaa8a" label="Repost" />
        <ActionBtn icon="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"
          count={null} label="Share" style={{ marginLeft: "auto" }} />
      </div>

      {showComments && (
        <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center" }}>
          <Avatar user={me} size={32} />
          <div style={{ flex: 1, display: "flex", gap: 8 }}>
            <input value={comment} onChange={e => setComment(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submitComment()}
              placeholder="Share your thoughts..."
              style={{ flex: 1, background: "#fdf6ee", border: "1px solid #e0cfc0", borderRadius: 20, padding: "8px 14px", color: "#5a4a40", fontSize: 14, outline: "none", fontFamily: "'Lato', sans-serif" }}
              autoFocus />
            <button onClick={submitComment} disabled={submitting}
              style={{ background: "linear-gradient(135deg, #c8824a, #e8a870)", border: "none", borderRadius: 20, padding: "8px 16px", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
              {submitting ? "…" : "Post"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Composer ──────────────────────────────────────────────────────────────────
function Composer({ token, currentUser, onPost, onRequireAuth }) {
  const [text, setText]         = useState("");
  const [focused, setFocused]   = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!text.trim() || submitting) return;
    if (!token) { onRequireAuth(); return; }
    setSubmitting(true);
    try {
      const dto = await apiFetch("/posts", { token, method: "POST", body: JSON.stringify({ content: text }) });
      onPost(mapPostDto(dto));
      setText("");
    } catch (err) { alert(err.message); }
    setSubmitting(false);
  };

  const me = currentUser
    ? { avatar: initials(currentUser.displayName), color: avatarColor(currentUser.userName), avatarUrl: currentUser.avatarUrl ?? null }
    : { avatar: "?", color: "#E8B47C", avatarUrl: null };

  return (
    <div style={{ background: "#fff", border: `1px solid ${focused ? "#c8824a55" : "#e8ddd0"}`, borderRadius: 20, padding: "16px 20px", boxShadow: focused ? "0 4px 20px rgba(200,130,74,0.1)" : "0 2px 8px rgba(180,140,100,0.06)", transition: "all 0.2s" }}>
      <div style={{ display: "flex", gap: 12 }}>
        <Avatar user={me} size={44} />
        <div style={{ flex: 1 }}>
          <textarea value={text} onChange={e => setText(e.target.value)}
            onFocus={() => { setFocused(true); if (!token) onRequireAuth(); }}
            onBlur={() => setFocused(false)}
            placeholder="What's your scene today?"
            rows={focused || text ? 3 : 1}
            style={{ width: "100%", background: "none", border: "none", resize: "none", color: "#3a2e26", fontSize: 15, fontFamily: "'Lato', sans-serif", outline: "none", lineHeight: 1.65 }} />
          {(focused || text) && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
              <div style={{ display: "flex", gap: 12 }}>
                {["🖼️", "😊", "📎", "🔗"].map((e, i) => (
                  <button key={i} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", opacity: 0.6 }}>{e}</button>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ color: text.length > 240 ? "#e05050" : "#c0a898", fontSize: 12 }}>{280 - text.length}</span>
                <button onClick={submit} disabled={!text.trim() || submitting}
                  style={{ background: text.trim() && !submitting ? "linear-gradient(135deg, #c8824a, #e8a870)" : "#e8ddd0", border: "none", borderRadius: 20, padding: "8px 22px", color: text.trim() && !submitting ? "#fff" : "#b0a090", cursor: text.trim() && !submitting ? "pointer" : "not-allowed", fontSize: 14, fontWeight: 700, fontFamily: "'Playfair Display', serif", transition: "all 0.2s" }}>
                  {submitting ? "Posting…" : "Share"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── NavItem ───────────────────────────────────────────────────────────────────
function NavItem({ icon, label, active, badge }) {
  const [hover, setHover] = useState(false);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 12px", borderRadius: 14, cursor: "pointer", background: active ? "#fdf0e6" : hover ? "#fdf8f3" : "none", transition: "background 0.15s", marginBottom: 2 }}>
      <div style={{ position: "relative" }}>
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={active ? "#c8824a" : hover ? "#b0957a" : "#a08878"} strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d={icon} />
        </svg>
        {badge > 0 && <span style={{ position: "absolute", top: -5, right: -7, background: "#e06050", color: "#fff", borderRadius: 8, fontSize: 10, fontWeight: 700, padding: "1px 5px" }}>{badge}</span>}
      </div>
      <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: active ? 700 : 500, fontSize: 15, color: active ? "#3a2e26" : hover ? "#7a6a60" : "#a08878" }}>{label}</span>
    </div>
  );
}

// ── AuthModal ─────────────────────────────────────────────────────────────────
function AuthModal({ onSuccess, onClose }) {
  const [mode, setMode]   = useState("login");
  const [form, setForm]   = useState({ email: "", password: "", userName: "", displayName: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setError(""); setLoading(true);
    try {
      const body = mode === "login"
        ? { email: form.email, password: form.password }
        : { email: form.email, password: form.password, userName: form.userName, displayName: form.displayName };
      const data = await apiFetch(`/auth/${mode}`, { method: "POST", body: JSON.stringify(body) });
      localStorage.setItem(TOKEN_KEY, data.accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      onSuccess(data.accessToken, data.user);
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  const inp = { width: "100%", background: "#fdf6ee", border: "1px solid #e0cfc0", borderRadius: 12, padding: "10px 14px", color: "#3a2e26", fontSize: 14, outline: "none", fontFamily: "'Lato', sans-serif", marginBottom: 12, display: "block" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(58,46,38,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 24, padding: 32, width: 400, boxShadow: "0 20px 60px rgba(58,46,38,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #c8824a, #e8c87a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🎭</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 20, color: "#3a2e26" }}>
            {mode === "login" ? "Welcome back" : "Join LifeStage"}
          </div>
        </div>

        <div style={{ display: "flex", borderBottom: "1px solid #e8ddd0", marginBottom: 20 }}>
          {["login", "register"].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(""); }}
              style={{ flex: 1, padding: "10px", background: "none", border: "none", cursor: "pointer", fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 14, color: mode === m ? "#c8824a" : "#a08878", borderBottom: `2px solid ${mode === m ? "#c8824a" : "transparent"}`, marginBottom: -1, transition: "all 0.15s" }}>
              {m === "login" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        {mode === "register" && <>
          <input value={form.displayName} onChange={e => set("displayName", e.target.value)} placeholder="Display name" style={inp} />
          <input value={form.userName} onChange={e => set("userName", e.target.value)} placeholder="Username (no spaces)" style={inp} />
        </>}
        <input value={form.email} onChange={e => set("email", e.target.value)} placeholder="Email" type="email" style={inp} />
        <input value={form.password} onChange={e => set("password", e.target.value)} placeholder="Password" type="password" style={inp}
          onKeyDown={e => e.key === "Enter" && submit()} />

        {error && <div style={{ color: "#e05050", fontSize: 13, marginBottom: 12, padding: "8px 12px", background: "#fff5f5", borderRadius: 8, border: "1px solid #f0c0c0" }}>{error}</div>}

        <button onClick={submit} disabled={loading}
          style={{ width: "100%", padding: "12px", borderRadius: 20, background: loading ? "#e8ddd0" : "linear-gradient(135deg, #c8824a, #e8a870)", border: "none", color: loading ? "#b0a090" : "#fff", cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 15, boxShadow: loading ? "none" : "0 4px 16px rgba(200,130,74,0.3)" }}>
          {loading ? "…" : mode === "login" ? "Sign In" : "Create Account"}
        </button>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [token, setToken]             = useState(() => localStorage.getItem(TOKEN_KEY));
  const [currentUser, setCurrentUser] = useState(() => { try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; } });
  const [posts, setPosts]             = useState([]);
  const [trends, setTrends]           = useState([]);
  const [activeTab, setActiveTab]     = useState("for-you");
  const [loading, setLoading]         = useState(true);
  const [showAuth, setShowAuth]       = useState(false);
  const [notifCount, setNotifCount]   = useState(0);

  // Trending hashtags — load once
  useEffect(() => {
    apiFetch("/trending/hashtags").then(data => setTrends((data ?? []).map(mapTrend))).catch(() => {});
  }, []);

  // Posts — reload when tab or auth changes
  useEffect(() => {
    setLoading(true);
    const load = async () => {
      try {
        if (activeTab === "trending" || !token) {
          const data = await apiFetch("/trending/posts");
          setPosts((data ?? []).map(mapTrendingPost));
        } else {
          const data = await apiFetch("/posts/feed", { token });
          setPosts((data?.items ?? []).map(mapPostDto));
        }
      } catch { setPosts([]); }
      setLoading(false);
    };
    load();
  }, [activeTab, token]);

  // Notification badge — only when logged in
  useEffect(() => {
    if (!token) { setNotifCount(0); return; }
    apiFetch("/notifications/unread-count", { token }).then(n => setNotifCount(n ?? 0)).catch(() => {});
  }, [token]);

  const handleLike = async (id) => {
    // Optimistic toggle
    setPosts(ps => ps.map(p => p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p));
    try { await apiFetch(`/posts/${id}/like`, { token, method: "POST" }); }
    catch { setPosts(ps => ps.map(p => p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p)); }
  };

  const handleAuthSuccess = (accessToken, user) => { setToken(accessToken); setCurrentUser(user); setShowAuth(false); };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY);
    setToken(null); setCurrentUser(null); setNotifCount(0);
  };

  const myUser = currentUser
    ? { name: currentUser.displayName, handle: `@${currentUser.userName}`, avatar: initials(currentUser.displayName), color: avatarColor(currentUser.userName), avatarUrl: currentUser.avatarUrl ?? null }
    : { name: "Guest", handle: "@guest", avatar: "G", color: "#E8B47C", avatarUrl: null };

  return (
    <div style={{ minHeight: "100vh", background: "#faf6f0", fontFamily: "'Lato', sans-serif", color: "#3a2e26" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=Lato:wght@400;500;700&display=swap" rel="stylesheet" />

      {showAuth && <AuthModal onSuccess={handleAuthSuccess} onClose={() => setShowAuth(false)} />}

      {/* Top banner */}
      <div style={{ background: "linear-gradient(135deg, #3a2e26 0%, #6a4a30 50%, #8a6040 100%)", padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <span style={{ fontSize: 16 }}>🎭</span>
        <span style={{ fontFamily: "'Playfair Display', serif", color: "#e8c87a", fontSize: 13, letterSpacing: 0.5 }}>
          Welcome to LifeStage — <em>every life deserves its moment</em>
        </span>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", gap: 32, padding: "28px 20px", alignItems: "flex-start" }}>

        {/* ── Left sidebar ── */}
        <div style={{ width: 240, flexShrink: 0 }}>
          <div style={{ padding: "0 12px 28px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: "linear-gradient(135deg, #c8824a, #e8c87a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: "0 4px 16px rgba(200,130,74,0.35)" }}>🎭</div>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 19, color: "#3a2e26", letterSpacing: -0.3 }}>LifeStage</div>
              <div style={{ fontSize: 11, color: "#b0957a", marginTop: -2 }}>your moment, your stage</div>
            </div>
          </div>

          {[
            { icon: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", label: "Home", active: true },
            { icon: "M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z", label: "Explore" },
            { icon: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0", label: "Alerts", badge: notifCount },
            { icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z", label: "Messages" },
            { icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", label: "Profile" },
            { icon: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z", label: "Settings" },
          ].map(item => <NavItem key={item.label} {...item} />)}

          <div style={{ marginTop: 20 }}>
            <button onClick={() => !token && setShowAuth(true)}
              style={{ width: "100%", padding: "12px", borderRadius: 24, background: "linear-gradient(135deg, #c8824a, #e8a870)", border: "none", color: "#fff", cursor: "pointer", fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 15, boxShadow: "0 4px 16px rgba(200,130,74,0.3)" }}>
              + Share Your Stage
            </button>
          </div>

          <div style={{ marginTop: 32, display: "flex", alignItems: "center", gap: 10, padding: "12px", borderRadius: 14, background: "#fdf6ee", border: "1px solid #e8ddd0" }}>
            <Avatar user={myUser} size={38} />
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 14, color: "#3a2e26" }}>{myUser.name}</div>
              <div style={{ fontSize: 12, color: "#a08878" }}>{myUser.handle}</div>
            </div>
            {token
              ? <button onClick={handleLogout} style={{ marginLeft: "auto", background: "none", border: "none", color: "#b0957a", cursor: "pointer", fontSize: 12, padding: 0 }}>Sign out</button>
              : <button onClick={() => setShowAuth(true)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#c8824a", cursor: "pointer", fontSize: 12, fontWeight: 700, padding: 0 }}>Sign in</button>
            }
          </div>
        </div>

        {/* ── Main feed ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", borderBottom: "2px solid #e8ddd0", marginBottom: 20 }}>
            {[{ id: "for-you", label: "For You" }, { id: "following", label: "Following" }, { id: "trending", label: "Trending" }].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{ padding: "12px 24px", background: "none", border: "none", cursor: "pointer", fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 14, color: activeTab === tab.id ? "#c8824a" : "#a08878", borderBottom: `3px solid ${activeTab === tab.id ? "#c8824a" : "transparent"}`, transition: "all 0.15s", marginBottom: -2 }}>
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: 20 }}>
            <Composer token={token} currentUser={currentUser} onPost={p => setPosts(ps => [p, ...ps])} onRequireAuth={() => setShowAuth(true)} />
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: 60, color: "#b0957a", fontFamily: "'Playfair Display', serif", fontSize: 16 }}>Loading…</div>
          ) : posts.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "#b0957a", fontFamily: "'Playfair Display', serif" }}>
              {activeTab === "trending" ? "No trending posts in the last 24 hours yet." : "No posts yet — be the first to share your stage! 🎭"}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {posts.map(post => (
                <PostCard key={post.id} post={post} token={token} currentUser={currentUser} onLike={handleLike} onRequireAuth={() => setShowAuth(true)} />
              ))}
            </div>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <div style={{ width: 300, flexShrink: 0 }}>
          <div style={{ background: "#fff", borderRadius: 24, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, marginBottom: 20, border: "1px solid #e8ddd0", boxShadow: "0 2px 8px rgba(180,140,100,0.06)" }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#b0957a" strokeWidth={2} strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input placeholder="Search LifeStage" style={{ background: "none", border: "none", outline: "none", color: "#5a4a40", fontSize: 14, fontFamily: "'Lato', sans-serif", flex: 1 }} />
          </div>

          <div style={{ background: "#fff", border: "1px solid #e8ddd0", borderRadius: 20, padding: "16px 20px", marginBottom: 20, boxShadow: "0 2px 8px rgba(180,140,100,0.06)" }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16, color: "#3a2e26", marginBottom: 14 }}>On the Rise 🎭</div>
            {trends.length === 0 ? (
              <div style={{ color: "#b0957a", fontSize: 13, fontFamily: "'Lato', sans-serif" }}>No trending tags yet.</div>
            ) : trends.map((t, i) => (
              <div key={t.tag} style={{ padding: "9px 0", borderBottom: i < trends.length - 1 ? "1px solid #f0e8e0" : "none", cursor: "pointer" }}>
                <div style={{ fontSize: 11, color: "#b0957a", marginBottom: 2 }}>#{i + 1} · Trending</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, color: "#3a2e26", fontSize: 14 }}>{t.tag}</div>
                <div style={{ fontSize: 12, color: "#a08878", marginTop: 2 }}>{t.posts}</div>
              </div>
            ))}
          </div>

          {!token && (
            <div style={{ background: "linear-gradient(135deg, #fdf0e6, #fff8f0)", border: "1px solid #e8d0b8", borderRadius: 20, padding: "20px", textAlign: "center", boxShadow: "0 2px 8px rgba(180,140,100,0.06)" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🎭</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 15, color: "#3a2e26", marginBottom: 6 }}>Join LifeStage</div>
              <div style={{ color: "#8a7a6a", fontSize: 13, marginBottom: 14, fontFamily: "'Lato', sans-serif" }}>Post, like, and connect with others on your stage.</div>
              <button onClick={() => setShowAuth(true)}
                style={{ width: "100%", padding: "10px", borderRadius: 20, background: "linear-gradient(135deg, #c8824a, #e8a870)", border: "none", color: "#fff", cursor: "pointer", fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 14 }}>
                Get Started
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
