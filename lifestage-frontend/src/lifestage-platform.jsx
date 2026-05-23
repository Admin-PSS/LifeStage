import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "./api";
import { getToken } from "./auth";
import { startSignalR, stopSignalR } from "./signalr";
import { ToastContainer, NotificationBell, useNotifications } from "./NotificationToast.jsx";
import { EmailBanner } from "./EmailConfirmation.jsx";
import { Avatar, ActionBtn, PostCard, Composer, mapPost, colorForUser, AVATAR_COLORS } from "./PostCard.jsx";
import MessagesPage from "./MessagesPage.jsx";

// ─── Mock fallback (shown when not logged in / API unreachable) ───────────────
const MOCK_USERS = [
  { name: "Aria Nakamura", handle: "@aria.nkm", avatar: "AN", color: "#E8A87C", verified: true },
  { name: "Zoe Laurent",   handle: "@zoelrntt",  avatar: "ZL", color: "#B87CE8", verified: true },
  { name: "Dev Patel",     handle: "@devpatel_io",avatar: "DP", color: "#7CB8E8", verified: false },
  { name: "Marcus Webb",   handle: "@mwebb",      avatar: "MW", color: "#7CE8B4", verified: false },
];

const MOCK_POSTS = [
  { id: "m1", user: MOCK_USERS[0], time: "2m ago",  text: "Every stage of life teaches something new. Slow down, breathe, be present. 🌿", likes: 284, comments: 31, reposts: 19, liked: false, tags: ["#mindfulness", "#lifestage"] },
  { id: "m2", user: MOCK_USERS[1], time: "14m ago", text: "Shipped a big feature today — months of work, finally live. The curtain rose. ✨",  likes: 512, comments: 88, reposts: 67, liked: true,  tags: ["#buildinpublic"] },
  { id: "m3", user: MOCK_USERS[2], time: "1h ago",  text: "Reading about meaning-making across life transitions. Change is the only constant.", likes: 97,  comments: 14, reposts: 8,  liked: false, tags: ["#growth"] },
  { id: "m4", user: MOCK_USERS[3], time: "3h ago",  text: "Morning run ✅  Coffee ✅  Gratitude journal ✅\n\nSome stages start better than others.", likes: 1024, comments: 201, reposts: 344, liked: false, tags: [] },
];

const TRENDS = [
  { tag: "#LifeStage",     posts: "52.1K posts" },
  { tag: "#Mindfulness",   posts: "38.5K posts" },
  { tag: "#BuildInPublic", posts: "27.9K posts" },
  { tag: "#GrowthMindset", posts: "19.3K posts" },
  { tag: "#Gratitude",     posts: "15.8K posts" },
];

const SUGGESTED = MOCK_USERS.slice(0, 3);

// ─── RightSidebar (user search + trending) ────────────────────────────────────
function RightSidebar({ user, token, onProfileClick }) {
  const [searchQ, setSearchQ]         = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [followState, setFollowState] = useState({});  // { userName: bool }

  useEffect(() => {
    if (!searchQ.trim() || !token) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await api.searchUsers(token, searchQ);
        setSearchResults(Array.isArray(res) ? res : []);
      } catch { setSearchResults([]); }
      setSearchLoading(false);
    }, 350);
    return () => clearTimeout(t);
  }, [searchQ, token]);

  const handleFollow = async (username) => {
    if (!token) return;
    try {
      const res = await api.followUser(token, username);
      setFollowState(s => ({ ...s, [username]: res?.following ?? !s[username] }));
    } catch { }
  };

  return (
    <div style={{ width: 300, flexShrink: 0 }}>
      {/* Search box */}
      <div style={{ background: "#fff", borderRadius: 24, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, marginBottom: 12, border: "1px solid #e8ddd0", boxShadow: "0 2px 8px rgba(180,140,100,0.06)" }}>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#b0957a" strokeWidth={2} strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
        <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
          placeholder="Search people..." style={{ background: "none", border: "none", outline: "none", color: "#5a4a40", fontSize: 14, fontFamily: "'Lato', sans-serif", flex: 1 }} />
        {searchQ && <button onClick={() => setSearchQ("")} style={{ background: "none", border: "none", color: "#b0957a", cursor: "pointer", fontSize: 16, padding: 0, lineHeight: 1 }}>✕</button>}
      </div>

      {/* Search results */}
      {(searchResults.length > 0 || searchLoading) && (
        <div style={{ background: "#fff", border: "1px solid #e8ddd0", borderRadius: 20, padding: "12px 16px", marginBottom: 16, boxShadow: "0 2px 8px rgba(180,140,100,0.06)" }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 14, color: "#3a2e26", marginBottom: 10 }}>People</div>
          {searchLoading ? (
            <div style={{ color: "#b0957a", fontSize: 13, fontFamily: "'Lato', sans-serif" }}>Searching...</div>
          ) : searchResults.map(u => (
            <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f0e8e0" }}>
              <div onClick={() => { setSearchQ(""); onProfileClick?.(u.userName); }} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${colorForUser(u.userName)}dd, ${colorForUser(u.userName)}55)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                  {(u.displayName || u.userName || "?").slice(0, 2).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: 13, color: "#3a2e26", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.displayName || u.userName}</div>
                  <div style={{ fontSize: 11, color: "#a08878" }}>@{u.userName}</div>
                </div>
              </div>
              {user && u.userName !== user.userName && (
                <button onClick={() => handleFollow(u.userName)}
                  style={{ background: followState[u.userName] ? "none" : "linear-gradient(135deg, #c8824a, #e8a870)", border: followState[u.userName] ? "1px solid #e0c8b0" : "none", borderRadius: 14, padding: "4px 12px", color: followState[u.userName] ? "#c8824a" : "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "'Lato', sans-serif", flexShrink: 0 }}>
                  {followState[u.userName] ? "Following" : "Follow"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Trending */}
      <div style={{ background: "#fff", border: "1px solid #e8ddd0", borderRadius: 20, padding: "16px 20px", boxShadow: "0 2px 8px rgba(180,140,100,0.06)" }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16, color: "#3a2e26", marginBottom: 14 }}>On the Rise 🎭</div>
        {TRENDS.map((t, i) => (
          <div key={t.tag} style={{ padding: "9px 0", borderBottom: i < TRENDS.length - 1 ? "1px solid #f0e8e0" : "none", cursor: "pointer" }}>
            <div style={{ fontSize: 11, color: "#b0957a", marginBottom: 2 }}>#{i + 1} · Trending</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, color: "#3a2e26", fontSize: 14 }}>{t.tag}</div>
            <div style={{ fontSize: 12, color: "#a08878", marginTop: 2 }}>{t.posts}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── NavItem ──────────────────────────────────────────────────────────────────
function NavItem({ icon, label, active, badge, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 12px", borderRadius: 14, cursor: "pointer", background: active ? "#fdf0e6" : hover ? "#fdf8f3" : "none", transition: "background 0.15s", marginBottom: 2 }}>
      <div style={{ position: "relative" }}>
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={active ? "#c8824a" : hover ? "#b0957a" : "#a08878"} strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d={icon} />
        </svg>
        {badge && <span style={{ position: "absolute", top: -5, right: -7, background: "#e06050", color: "#fff", borderRadius: 8, fontSize: 10, fontWeight: 700, padding: "1px 5px" }}>{badge}</span>}
      </div>
      <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: active ? 700 : 500, fontSize: 15, color: active ? "#3a2e26" : hover ? "#7a6a60" : "#a08878" }}>{label}</span>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ side, user, onNav, onLogout, activeNav = "home", unreadCount = 0, onCompose }) {
  const [showUserMenu, setShowUserMenu] = useState(false);

  if (side === "left") return (
    <div style={{ width: 240, flexShrink: 0 }}>
      <div style={{ padding: "0 12px 28px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: "linear-gradient(135deg, #c8824a, #e8c87a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: "0 4px 16px rgba(200,130,74,0.35)" }}>🎭</div>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 19, color: "#3a2e26", letterSpacing: -0.3 }}>LifeStage</div>
          <div style={{ fontSize: 11, color: "#b0957a", marginTop: -2 }}>your moment, your stage</div>
        </div>
      </div>
      {[
        { key: "home",     icon: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            label: "Home" },
        { key: "explore",  icon: "M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z",                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           label: "Explore" },
        { key: "alerts",   icon: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0",                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    label: "Alerts",  badge: unreadCount > 0 ? unreadCount : undefined },
        { key: "messages", icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            label: "Messages" },
        { key: "profile",  icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            label: "Profile" },
        { key: "settings", icon: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z", label: "Settings" },
      ].map(item => (
        <div key={item.key} style={{ position: "relative" }}>
          <NavItem
            icon={item.icon}
            label={item.label}
            active={activeNav === item.key}
            badge={item.badge}
            onClick={() => !item.comingSoon && onNav?.(item.key)}
          />
          {item.comingSoon && (
            <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "#b0957a", background: "#fdf0e6", border: "1px solid #e8d0b8", borderRadius: 8, padding: "2px 6px", fontFamily: "'Lato', sans-serif" }}>
              Soon
            </span>
          )}
        </div>
      ))}
      <div style={{ marginTop: 20 }}>
        <button onClick={onCompose} style={{ width: "100%", padding: "12px", borderRadius: 24, background: "linear-gradient(135deg, #c8824a, #e8a870)", border: "none", color: "#fff", cursor: "pointer", fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 15, boxShadow: "0 4px 16px rgba(200,130,74,0.3)" }}>
          + Share Your Stage
        </button>
      </div>
      {user && (
        <div style={{ position: "relative", marginTop: 32 }}>
          <div onClick={() => setShowUserMenu(v => !v)}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px", borderRadius: 14, background: "#fdf6ee", border: "1px solid #e8ddd0", cursor: "pointer" }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, #E8B47Cdd, #E8B47C55)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff" }}>
              {(user.displayName || user.userName || "U").slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 14, color: "#3a2e26", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.displayName || user.userName}
              </div>
              <div style={{ fontSize: 12, color: "#a08878" }}>@{user.userName}</div>
            </div>
            <div style={{ color: "#b0957a", fontSize: 18 }}>···</div>
          </div>
          {showUserMenu && (
            <div style={{ position: "absolute", bottom: "calc(100% + 6px)", left: 0, right: 0, background: "#fff", border: "1px solid #e8ddd0", borderRadius: 14, boxShadow: "0 8px 28px rgba(58,46,38,0.14)", overflow: "hidden", zIndex: 200 }}>
              <div onClick={() => { setShowUserMenu(false); onNav?.("profile"); }}
                style={{ padding: "11px 16px", cursor: "pointer", fontSize: 14, color: "#3a2e26", fontFamily: "'Lato', sans-serif", display: "flex", alignItems: "center", gap: 8 }}
                onMouseEnter={e => e.currentTarget.style.background = "#fdf8f3"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}>
                👤 View Profile
              </div>
              <div onClick={() => { setShowUserMenu(false); onNav?.("settings"); }}
                style={{ padding: "11px 16px", cursor: "pointer", fontSize: 14, color: "#3a2e26", fontFamily: "'Lato', sans-serif", display: "flex", alignItems: "center", gap: 8 }}
                onMouseEnter={e => e.currentTarget.style.background = "#fdf8f3"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}>
                ⚙️ Settings
              </div>
              <div style={{ borderTop: "1px solid #f0e8e0" }} />
              <div onClick={() => { setShowUserMenu(false); onLogout?.(); }}
                style={{ padding: "11px 16px", cursor: "pointer", fontSize: 14, color: "#e05050", fontFamily: "'Lato', sans-serif", display: "flex", alignItems: "center", gap: 8 }}
                onMouseEnter={e => e.currentTarget.style.background = "#fff5f5"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}>
                🚪 Sign Out
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer links */}
      <div style={{ marginTop: 24, padding: "0 4px", display: "flex", flexWrap: "wrap", gap: "4px 10px" }}>
        {[["Terms", "/terms", "terms"], ["Privacy", "/privacy", "privacy"]].map(([label, path, detail]) => (
          <span key={label} onClick={() => { window.history.pushState({}, "", path); window.dispatchEvent(new CustomEvent("ls:navigate", { detail })); }}
            style={{ fontSize: 11, color: "#b0a090", cursor: "pointer", fontFamily: "'Lato', sans-serif" }}
            onMouseEnter={e => e.currentTarget.style.color = "#c8824a"}
            onMouseLeave={e => e.currentTarget.style.color = "#b0a090"}>
            {label}
          </span>
        ))}
        <span style={{ fontSize: 11, color: "#c8bab0", fontFamily: "'Lato', sans-serif" }}>· © {new Date().getFullYear()} LifeStage</span>
      </div>
    </div>
  );

  return null;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LifeStagePlatform({ user, onLogout, onProfile: goToProfile }) {
  const [posts, setPosts]         = useState([]);
  const [activeTab, setActiveTab] = useState("for-you");
  const [activeNav, setActiveNav] = useState("home");
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [hasMore, setHasMore]     = useState(false);
  const [apiOk, setApiOk]         = useState(true);
  const composerRef               = useRef(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const token = getToken();

  // ── Notifications + SignalR ────────────────────────────────────────────────
  const { toasts, notifications, unreadCount, signalRStatus,
          setSignalRStatus, addNotification, dismissToast, markAllRead }
    = useNotifications(token, api);

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isMobile = windowWidth < 768;

  useEffect(() => {
    if (!token) return;
    startSignalR(token, addNotification, setSignalRStatus);
    return () => { stopSignalR(); };
  }, [token]);

  // ── Load feed ──────────────────────────────────────────────────────────────
  const loadFeed = useCallback(async (pageNum = 1) => {
    if (!token) { setPosts(MOCK_POSTS); setLoading(false); setApiOk(false); return; }
    try {
      setLoading(true);
      const data = await api.getFeed(token, pageNum);
      if (data?.items) {
        const mapped = data.items.map(mapPost);
        setPosts(prev => pageNum === 1 ? mapped : [...prev, ...mapped]);
        setHasMore(data.hasNextPage || false);
        setApiOk(true);
      } else {
        // API returned something unexpected — use mock
        if (pageNum === 1) setPosts(MOCK_POSTS);
        setApiOk(false);
      }
    } catch {
      if (pageNum === 1) setPosts(MOCK_POSTS);
      setApiOk(false);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadFeed(1); }, [loadFeed]);

  // ── Repost toggle ──────────────────────────────────────────────────────────
  const handleRepost = async (id) => {
    setPosts(ps => ps.map(p =>
      p.id === id
        ? { ...p, reposted: !p.reposted, reposts: p.reposted ? p.reposts - 1 : p.reposts + 1 }
        : p
    ));
    if (token && apiOk) {
      try {
        const res = await api.repostPost(token, id);
        if (res?.repostCount != null) {
          setPosts(ps => ps.map(p => p.id === id ? { ...p, reposts: res.repostCount, reposted: res.reposted } : p));
        }
      } catch { loadFeed(1); }
    }
  };

  // ── Edit post ──────────────────────────────────────────────────────────────
  const handleEdit = async (id, newText, imageUrl, audioUrl, videoUrl) => {
    if (token && apiOk) {
      try {
        const updated = await api.editPost(token, id, newText, imageUrl, audioUrl, videoUrl);
        if (updated?.id) {
          setPosts(ps => ps.map(p => p.id === id ? { ...mapPost(updated), liked: p.liked, reposted: p.reposted } : p));
          return;
        }
      } catch { }
    }
    setPosts(ps => ps.map(p => p.id === id ? { ...p, text: newText, imageUrl: imageUrl ?? p.imageUrl } : p));
  };

  // ── Like toggle ────────────────────────────────────────────────────────────
  const handleLike = async (id) => {
    // Optimistic update
    setPosts(ps => ps.map(p =>
      p.id === id
        ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
        : p
    ));
    if (token && apiOk) {
      try { await api.likePost(token, id); }
      catch {
        // Revert the optimistic update instead of reloading the whole feed
        setPosts(ps => ps.map(p =>
          p.id === id
            ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
            : p
        ));
      }
    }
  };

  // ── Create post ────────────────────────────────────────────────────────────
  const handlePost = async (text, imageUrl = null, audioUrl = null, videoUrl = null) => {
    if (token && apiOk) {
      try {
        const newPost = await api.createPost(token, text, imageUrl, audioUrl, videoUrl);
        setPosts(ps => [mapPost(newPost), ...ps]);
        return;
      } catch { }
    }
    setPosts(ps => [{
      id: Date.now(),
      user: {
        name: user?.displayName || "You",
        handle: "@" + (user?.userName || "me"),
        avatar: (user?.displayName || "YO").slice(0, 2).toUpperCase(),
        color: "#E8B47C", verified: user?.isVerified || false,
      },
      time: "just now", text,
      imageUrl,
      likes: 0, comments: 0, reposts: 0, liked: false,
      tags: (text.match(/#\w+/g) || []),
    }, ...ps]);
  };

  // ── Load more ──────────────────────────────────────────────────────────────
  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    loadFeed(next);
  };

  // ── Nav handler ────────────────────────────────────────────────────────────
  const handleNav = (key) => {
    if (key === "profile" || key === "settings") { goToProfile(); return; }
    setActiveNav(key);
    if (key === "home") { setPage(1); loadFeed(1); window.scrollTo({ top: 0, behavior: "smooth" }); }
    if (key === "explore") { setActiveTab("trending"); window.scrollTo({ top: 0, behavior: "smooth" }); }
    if (key === "alerts") {
      document.getElementById("ls-notif-bell")?.click();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    if (key === "messages") { window.scrollTo({ top: 0, behavior: "smooth" }); }
  };

  const handleCompose = () => {
    setActiveNav("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => composerRef.current?.focus(), 300);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#faf6f0", fontFamily: "'Lato', sans-serif", color: "#3a2e26" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=Lato:wght@400;500;700&display=swap" rel="stylesheet" />

      {/* Top Banner */}
      <div style={{ background: "linear-gradient(135deg, #3a2e26 0%, #6a4a30 50%, #8a6040 100%)", padding: isMobile ? "12px 16px" : "10px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: isMobile ? 20 : 16 }}>🎭</span>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", color: "#e8c87a", fontSize: isMobile ? 17 : 13, fontWeight: 700, letterSpacing: 0.3 }}>LifeStage</div>
            {!isMobile && <div style={{ fontFamily: "'Playfair Display', serif", color: "#c8a870", fontSize: 12, fontStyle: "italic" }}>every life deserves its moment</div>}
          </div>
          {!apiOk && (
            <span style={{ background: "rgba(255,200,100,0.2)", border: "1px solid rgba(255,200,100,0.4)", borderRadius: 10, padding: "2px 10px", color: "#e8c87a", fontSize: 11, fontFamily: "'Lato', sans-serif" }}>
              ⚡ Demo
            </span>
          )}
        </div>
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 14 }}>
            {!isMobile && <span style={{ color: "#e8c87a", fontSize: 13, fontFamily: "'Lato', sans-serif" }}>👋 {user.displayName || user.userName}</span>}
            <NotificationBell
              id="ls-notif-bell"
              unreadCount={unreadCount}
              notifications={notifications}
              onMarkAllRead={markAllRead}
              signalRStatus={signalRStatus}
            />
            {!isMobile && (
              <button onClick={onLogout} style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 20, padding: "5px 14px", color: "#e8c87a", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "'Lato', sans-serif" }}>
                Sign Out
              </button>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", gap: isMobile ? 0 : 32, padding: isMobile ? "12px 12px 84px" : "28px 20px", alignItems: "flex-start" }}>
        {!isMobile && <Sidebar side="left" user={user} onNav={handleNav} onLogout={onLogout}
          activeNav={activeNav} unreadCount={unreadCount} onCompose={handleCompose} />}

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Email confirmation banner */}
          {user && !user.emailConfirmed && (
            <EmailBanner email={user.email || ""} token={getToken()} />
          )}

          {/* Messages view */}
          {activeNav === "messages" && (
            <MessagesPage token={token} currentUser={user} />
          )}

          {/* Feed (hidden when messages is active) */}
          {activeNav !== "messages" && <>
            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "2px solid #e8ddd0", marginBottom: 20 }}>
              {[{ id: "for-you", label: "For You" }, { id: "following", label: "Following" }, { id: "trending", label: "Trending" }].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: "12px 24px", background: "none", border: "none", cursor: "pointer", fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 14, color: activeTab === tab.id ? "#c8824a" : "#a08878", borderBottom: `3px solid ${activeTab === tab.id ? "#c8824a" : "transparent"}`, transition: "all 0.15s", marginBottom: -2 }}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: 20 }}>
              <Composer onPost={handlePost} user={user} composerRef={composerRef} />
            </div>

            {/* Posts */}
            {loading && posts.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: "#a08878", fontFamily: "'Playfair Display', serif", fontStyle: "italic" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🎭</div>
                Loading your stage...
              </div>
            ) : posts.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: "#a08878", fontFamily: "'Playfair Display', serif" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>✨</div>
                <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Your stage is empty</div>
                <div style={{ fontSize: 14, fontStyle: "italic" }}>Be the first to share your moment</div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {posts.map(post => (
                    <PostCard key={post.id} post={post} onLike={handleLike} onRepost={handleRepost} onEdit={handleEdit} currentUser={user} isMyPost={user && post.user.handle === "@" + user.userName} onProfileClick={goToProfile} />
                  ))}
                </div>

                {/* Load more */}
                {hasMore && (
                  <div style={{ textAlign: "center", marginTop: 24 }}>
                    <button onClick={loadMore} disabled={loading}
                      style={{ background: "none", border: "1.5px solid #e0c8b0", borderRadius: 20, padding: "10px 28px", color: "#c8824a", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>
                      {loading ? "Loading..." : "Load more"}
                    </button>
                  </div>
                )}
              </>
            )}
          </>}
        </div>

        {!isMobile && <RightSidebar user={user} token={getToken()} onProfileClick={goToProfile} />}
      </div>

      {/* Mobile bottom navigation */}
      {isMobile && (
        <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #e8ddd0", display: "flex", alignItems: "center", justifyContent: "space-around", padding: "6px 4px max(6px, env(safe-area-inset-bottom))", zIndex: 100, boxShadow: "0 -2px 12px rgba(58,46,38,0.1)" }}>
          {[
            { key: "home",     icon: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",                                                label: "Home" },
            { key: "messages", icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",                               label: "Chat" },
          ].map(item => (
            <button key={item.key} onClick={() => handleNav(item.key)}
              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "4px 10px", flex: 1, color: activeNav === item.key ? "#c8824a" : "#a08878" }}>
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={activeNav === item.key ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon} />
              </svg>
              <span style={{ fontSize: 10, fontFamily: "'Lato', sans-serif", fontWeight: activeNav === item.key ? 700 : 500 }}>{item.label}</span>
            </button>
          ))}

          {/* Centre compose FAB */}
          <button onClick={handleCompose}
            style={{ background: "linear-gradient(135deg, #c8824a, #e8a870)", border: "none", cursor: "pointer", width: 52, height: 52, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(200,130,74,0.45)", marginTop: -12, color: "#fff", fontSize: 28, flex: "0 0 auto", lineHeight: 1 }}>
            +
          </button>

          {/* Alerts */}
          <button onClick={() => handleNav("alerts")}
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "4px 10px", flex: 1, color: activeNav === "alerts" ? "#c8824a" : "#a08878" }}>
            <div style={{ position: "relative" }}>
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={activeNav === "alerts" ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 && <span style={{ position: "absolute", top: -5, right: -7, background: "#e06050", color: "#fff", borderRadius: 8, fontSize: 9, fontWeight: 700, padding: "1px 4px", fontFamily: "'Lato', sans-serif" }}>{unreadCount}</span>}
            </div>
            <span style={{ fontSize: 10, fontFamily: "'Lato', sans-serif", fontWeight: activeNav === "alerts" ? 700 : 500 }}>Alerts</span>
          </button>

          {/* Profile */}
          <button onClick={() => goToProfile()}
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "4px 10px", flex: 1, color: "#a08878" }}>
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
            </svg>
            <span style={{ fontSize: 10, fontFamily: "'Lato', sans-serif" }}>Profile</span>
          </button>
        </nav>
      )}

      {/* Real-time toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
