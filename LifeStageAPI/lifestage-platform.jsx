import { useState } from "react";

const USERS = [
  { id: 1, name: "Aria Nakamura", handle: "@aria.nkm", avatar: "AN", color: "#E8A87C", verified: true },
  { id: 2, name: "Dev Patel", handle: "@devpatel_io", avatar: "DP", color: "#7CB8E8", verified: false },
  { id: 3, name: "Zoe Laurent", handle: "@zoelrntt", avatar: "ZL", color: "#B87CE8", verified: true },
  { id: 4, name: "Marcus Webb", handle: "@mwebb", avatar: "MW", color: "#7CE8B4", verified: false },
];

const CURRENT_USER = { id: 0, name: "You", handle: "@me", avatar: "YO", color: "#E8B47C" };

const INITIAL_POSTS = [
  {
    id: 1, user: USERS[0], time: "2m ago",
    text: "Every stage of life teaches something new. Today's lesson: slow down, breathe, and be present. 🌿",
    likes: 284, comments: 31, reposts: 19, liked: false,
    tags: ["#mindfulness", "#lifestage"],
  },
  {
    id: 2, user: USERS[2], time: "14m ago",
    text: "Shipped a big feature today — months of work, finally live. The stage was set, the curtain rose. ✨",
    likes: 512, comments: 88, reposts: 67, liked: true,
    tags: ["#buildinpublic", "#milestone"],
  },
  {
    id: 3, user: USERS[1], time: "1h ago",
    text: "Reading about meaning-making across life transitions. The older I get, the more I realise change is the only constant.",
    likes: 97, comments: 14, reposts: 8, liked: false,
    tags: ["#growth", "#reflection"],
  },
  {
    id: 4, user: USERS[3], time: "3h ago",
    text: "Morning run ✅  Coffee ✅  Gratitude journal ✅\n\nSome stages start better than others.",
    likes: 1024, comments: 201, reposts: 344, liked: false,
    tags: [],
  },
];

const TRENDS = [
  { tag: "#LifeStage", posts: "52.1K posts" },
  { tag: "#Mindfulness", posts: "38.5K posts" },
  { tag: "#BuildInPublic", posts: "27.9K posts" },
  { tag: "#GrowthMindset", posts: "19.3K posts" },
  { tag: "#Gratitude", posts: "15.8K posts" },
];

const SUGGESTED = [USERS[0], USERS[2], USERS[3]];

function Avatar({ user, size = 40 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg, ${user.color}dd, ${user.color}66)`,
      border: `2px solid ${user.color}55`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.34, fontWeight: 800, color: "#fff",
      flexShrink: 0, letterSpacing: 0.5,
      fontFamily: "'Playfair Display', serif",
      boxShadow: `0 2px 12px ${user.color}33`,
    }}>
      {user.avatar}
    </div>
  );
}

function Icon({ d, size = 18, stroke = "currentColor", fill = "none" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function ActionBtn({ icon, count, active, activeColor, fill = "none", onClick, label, style: extraStyle }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={label}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        background: "none", border: "none", cursor: "pointer",
        color: active ? activeColor : hover ? "#b0957a" : "#8a7a6a",
        fontSize: 13, fontFamily: "'Lato', sans-serif",
        transition: "color 0.15s", padding: "4px 0",
        ...extraStyle,
      }}
    >
      <Icon d={icon} size={17} stroke={active ? activeColor : hover ? "#b0957a" : "#8a7a6a"} fill={active && fill !== "none" ? fill : "none"} />
      {count !== null && count !== undefined && <span>{count >= 1000 ? (count / 1000).toFixed(1) + "K" : count}</span>}
    </button>
  );
}

function PostCard({ post, onLike }) {
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState(post.comments);
  const [hovered, setHovered] = useState(false);

  const handleComment = () => {
    if (comment.trim()) { setComments(c => c + 1); setComment(""); setShowCommentBox(false); }
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "#fdf8f3" : "#fff",
        border: "1px solid #e8ddd0",
        borderRadius: 20,
        padding: "20px 24px",
        transition: "all 0.2s ease",
        transform: hovered ? "translateY(-1px)" : "none",
        boxShadow: hovered ? "0 8px 28px rgba(180,140,100,0.12)" : "0 2px 8px rgba(180,140,100,0.06)",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
        <Avatar user={post.user} size={44} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 15, color: "#3a2e26" }}>
              {post.user.name}
            </span>
            {post.user.verified && (
              <span style={{ background: "#c8824a", borderRadius: "50%", width: 16, height: 16, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#fff" }}>✓</span>
            )}
            <span style={{ color: "#a08878", fontSize: 13 }}>{post.user.handle}</span>
            <span style={{ color: "#c8bab0", fontSize: 12, marginLeft: "auto" }}>{post.time}</span>
          </div>
          <p style={{ color: "#5a4a40", fontSize: 15, lineHeight: 1.7, margin: "8px 0 0", fontFamily: "'Lato', sans-serif", whiteSpace: "pre-line" }}>
            {post.text}
          </p>
          {post.tags.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              {post.tags.map(t => (
                <span key={t} style={{ color: "#c8824a", fontSize: 13, cursor: "pointer", fontFamily: "'Lato', sans-serif" }}>{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, marginTop: 4, paddingTop: 12, borderTop: "1px solid #f0e8e0" }}>
        <ActionBtn icon="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
          count={post.likes + (post.liked ? 1 : 0)} active={post.liked} activeColor="#e07050"
          fill={post.liked ? "#e07050" : "none"} onClick={() => onLike(post.id)} label="Like" />
        <ActionBtn icon="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
          count={comments} active={showCommentBox} activeColor="#c8824a"
          onClick={() => setShowCommentBox(v => !v)} label="Comment" />
        <ActionBtn icon="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3"
          count={post.reposts} activeColor="#7aaa8a" label="Repost" />
        <ActionBtn icon="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"
          count={null} label="Share" style={{ marginLeft: "auto" }} />
      </div>

      {showCommentBox && (
        <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center" }}>
          <Avatar user={CURRENT_USER} size={32} />
          <div style={{ flex: 1, display: "flex", gap: 8 }}>
            <input value={comment} onChange={e => setComment(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleComment()}
              placeholder="Share your thoughts..."
              style={{
                flex: 1, background: "#fdf6ee", border: "1px solid #e0cfc0",
                borderRadius: 20, padding: "8px 14px", color: "#5a4a40",
                fontSize: 14, outline: "none", fontFamily: "'Lato', sans-serif",
              }} autoFocus />
            <button onClick={handleComment} style={{
              background: "linear-gradient(135deg, #c8824a, #e8a870)",
              border: "none", borderRadius: 20, padding: "8px 16px",
              color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700,
            }}>Post</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Composer({ onPost }) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);

  return (
    <div style={{
      background: "#fff",
      border: `1px solid ${focused ? "#c8824a55" : "#e8ddd0"}`,
      borderRadius: 20, padding: "16px 20px",
      boxShadow: focused ? "0 4px 20px rgba(200,130,74,0.1)" : "0 2px 8px rgba(180,140,100,0.06)",
      transition: "all 0.2s",
    }}>
      <div style={{ display: "flex", gap: 12 }}>
        <Avatar user={CURRENT_USER} size={44} />
        <div style={{ flex: 1 }}>
          <textarea
            value={text} onChange={e => setText(e.target.value)}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            placeholder="What's your scene today?"
            rows={focused || text ? 3 : 1}
            style={{
              width: "100%", background: "none", border: "none",
              resize: "none", color: "#3a2e26", fontSize: 15,
              fontFamily: "'Lato', sans-serif", outline: "none", lineHeight: 1.65,
            }}
          />
          {(focused || text) && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
              <div style={{ display: "flex", gap: 12 }}>
                {["🖼️", "😊", "📎", "🔗"].map((emoji, i) => (
                  <button key={i} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", opacity: 0.6 }}>{emoji}</button>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ color: text.length > 240 ? "#e05050" : "#c0a898", fontSize: 12 }}>{280 - text.length}</span>
                <button onClick={() => { if (text.trim()) { onPost(text); setText(""); } }}
                  disabled={!text.trim()}
                  style={{
                    background: text.trim() ? "linear-gradient(135deg, #c8824a, #e8a870)" : "#e8ddd0",
                    border: "none", borderRadius: 20, padding: "8px 22px",
                    color: text.trim() ? "#fff" : "#b0a090", cursor: text.trim() ? "pointer" : "not-allowed",
                    fontSize: 14, fontWeight: 700, fontFamily: "'Playfair Display', serif",
                    transition: "all 0.2s",
                  }}>
                  Share
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, badge }) {
  const [hover, setHover] = useState(false);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "11px 12px", borderRadius: 14, cursor: "pointer",
        background: active ? "#fdf0e6" : hover ? "#fdf8f3" : "none",
        transition: "background 0.15s", marginBottom: 2,
      }}>
      <div style={{ position: "relative" }}>
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none"
          stroke={active ? "#c8824a" : hover ? "#b0957a" : "#a08878"} strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d={icon} />
        </svg>
        {badge && (
          <span style={{
            position: "absolute", top: -5, right: -7,
            background: "#e06050", color: "#fff", borderRadius: 8,
            fontSize: 10, fontWeight: 700, padding: "1px 5px",
          }}>{badge}</span>
        )}
      </div>
      <span style={{
        fontFamily: "'Playfair Display', serif", fontWeight: active ? 700 : 500,
        fontSize: 15, color: active ? "#3a2e26" : hover ? "#7a6a60" : "#a08878",
      }}>{label}</span>
    </div>
  );
}

function Sidebar({ side, activeTab, setActiveTab }) {
  if (side === "left") return (
    <div style={{ width: 240, flexShrink: 0 }}>
      {/* Brand */}
      <div style={{ padding: "0 12px 28px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 12,
          background: "linear-gradient(135deg, #c8824a, #e8c87a)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, boxShadow: "0 4px 16px rgba(200,130,74,0.35)",
        }}>🎭</div>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 19, color: "#3a2e26", letterSpacing: -0.3 }}>LifeStage</div>
          <div style={{ fontSize: 11, color: "#b0957a", marginTop: -2 }}>your moment, your stage</div>
        </div>
      </div>

      {[
        { icon: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", label: "Home", active: true },
        { icon: "M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z", label: "Explore" },
        { icon: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0", label: "Alerts", badge: 3 },
        { icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z", label: "Messages", badge: 7 },
        { icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", label: "Profile" },
        { icon: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z", label: "Settings" },
      ].map(item => <NavItem key={item.label} {...item} />)}

      <div style={{ marginTop: 20 }}>
        <button style={{
          width: "100%", padding: "12px", borderRadius: 24,
          background: "linear-gradient(135deg, #c8824a, #e8a870)",
          border: "none", color: "#fff", cursor: "pointer",
          fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 15,
          boxShadow: "0 4px 16px rgba(200,130,74,0.3)",
        }}>+ Share Your Stage</button>
      </div>

      <div style={{ marginTop: 32, display: "flex", alignItems: "center", gap: 10, padding: "12px", borderRadius: 14, background: "#fdf6ee", border: "1px solid #e8ddd0" }}>
        <Avatar user={CURRENT_USER} size={38} />
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 14, color: "#3a2e26" }}>You</div>
          <div style={{ fontSize: 12, color: "#a08878" }}>@me</div>
        </div>
        <div style={{ marginLeft: "auto", color: "#b0957a", cursor: "pointer", fontSize: 18 }}>···</div>
      </div>
    </div>
  );

  return (
    <div style={{ width: 300, flexShrink: 0 }}>
      <div style={{
        background: "#fff", borderRadius: 24, padding: "10px 16px",
        display: "flex", alignItems: "center", gap: 10, marginBottom: 20,
        border: "1px solid #e8ddd0", boxShadow: "0 2px 8px rgba(180,140,100,0.06)",
      }}>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#b0957a" strokeWidth={2} strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
        <input placeholder="Search LifeStage" style={{ background: "none", border: "none", outline: "none", color: "#5a4a40", fontSize: 14, fontFamily: "'Lato', sans-serif", flex: 1 }} />
      </div>

      <div style={{ background: "#fff", border: "1px solid #e8ddd0", borderRadius: 20, padding: "16px 20px", marginBottom: 20, boxShadow: "0 2px 8px rgba(180,140,100,0.06)" }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16, color: "#3a2e26", marginBottom: 14 }}>On the Rise 🎭</div>
        {TRENDS.map((t, i) => (
          <div key={t.tag} style={{ padding: "9px 0", borderBottom: i < TRENDS.length - 1 ? "1px solid #f0e8e0" : "none", cursor: "pointer" }}>
            <div style={{ fontSize: 11, color: "#b0957a", marginBottom: 2 }}>#{i + 1} · Trending</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, color: "#3a2e26", fontSize: 14 }}>{t.tag}</div>
            <div style={{ fontSize: 12, color: "#a08878", marginTop: 2 }}>{t.posts}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#fff", border: "1px solid #e8ddd0", borderRadius: 20, padding: "16px 20px", boxShadow: "0 2px 8px rgba(180,140,100,0.06)" }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16, color: "#3a2e26", marginBottom: 14 }}>Voices to Follow</div>
        {SUGGESTED.map(u => (
          <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
            <Avatar user={u} size={38} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: 14, color: "#3a2e26" }}>{u.name}</div>
              <div style={{ fontSize: 12, color: "#a08878" }}>{u.handle}</div>
            </div>
            <button style={{
              background: "none", border: "1px solid #e0c8b0", borderRadius: 16,
              padding: "5px 14px", color: "#c8824a", cursor: "pointer",
              fontSize: 12, fontWeight: 700, fontFamily: "'Lato', sans-serif",
            }}>Follow</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LifeStagePlatform() {
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [activeTab, setActiveTab] = useState("for-you");

  const handleLike = (id) => setPosts(ps => ps.map(p => p.id === id ? { ...p, liked: !p.liked } : p));
  const handlePost = (text) => setPosts(ps => [{
    id: Date.now(), user: CURRENT_USER, time: "just now",
    text, likes: 0, comments: 0, reposts: 0, liked: false,
    tags: (text.match(/#\w+/g) || []),
  }, ...ps]);

  return (
    <div style={{ minHeight: "100vh", background: "#faf6f0", fontFamily: "'Lato', sans-serif", color: "#3a2e26" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=Lato:wght@400;500;700&display=swap" rel="stylesheet" />

      {/* Top banner */}
      <div style={{
        background: "linear-gradient(135deg, #3a2e26 0%, #6a4a30 50%, #8a6040 100%)",
        padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
      }}>
        <span style={{ fontSize: 16 }}>🎭</span>
        <span style={{ fontFamily: "'Playfair Display', serif", color: "#e8c87a", fontSize: 13, letterSpacing: 0.5 }}>
          Welcome to LifeStage — <em>every life deserves its moment</em>
        </span>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", gap: 32, padding: "28px 20px", alignItems: "flex-start" }}>
        <Sidebar side="left" />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "2px solid #e8ddd0", marginBottom: 20 }}>
            {[{ id: "for-you", label: "For You" }, { id: "following", label: "Following" }, { id: "trending", label: "Trending" }].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                padding: "12px 24px", background: "none", border: "none", cursor: "pointer",
                fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 14,
                color: activeTab === tab.id ? "#c8824a" : "#a08878",
                borderBottom: `3px solid ${activeTab === tab.id ? "#c8824a" : "transparent"}`,
                transition: "all 0.15s", marginBottom: -2,
              }}>{tab.label}</button>
            ))}
          </div>

          <div style={{ marginBottom: 20 }}><Composer onPost={handlePost} /></div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {posts.map(post => <PostCard key={post.id} post={post} onLike={handleLike} />)}
          </div>
        </div>

        <Sidebar side="right" />
      </div>
    </div>
  );
}
