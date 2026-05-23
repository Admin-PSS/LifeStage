import { useState, useEffect } from "react";
import { api } from "./api";
import { getToken, saveAuth, getUser } from "./auth";
import { PostCard, Composer, mapPost, colorForUser } from "./PostCard.jsx";

// ─── Avatar (profile-size) ────────────────────────────────────────────────────
function ProfileAvatar({ initials, color, size = 80 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `linear-gradient(135deg, ${color}dd, ${color}55)`,
      border: `3px solid ${color}44`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.34, fontWeight: 800, color: "#fff",
      fontFamily: "'Playfair Display', serif",
      boxShadow: `0 4px 20px ${color}44`,
    }}>{initials}</div>
  );
}

// ─── Stat Box ─────────────────────────────────────────────────────────────────
function Stat({ value, label }) {
  return (
    <div style={{ textAlign: "center", padding: "0 20px" }}>
      <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 22, color: "#3a2e26" }}>
        {value >= 1000 ? (value / 1000).toFixed(1) + "K" : value}
      </div>
      <div style={{ fontSize: 12, color: "#a08878", fontFamily: "'Lato', sans-serif", marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ─── Edit Profile Modal ───────────────────────────────────────────────────────
function EditModal({ profile, onSave, onClose }) {
  const [form, setForm] = useState({
    displayName: profile.displayName || "",
    bio:         profile.bio         || "",
    website:     profile.website     || "",
    location:    profile.location    || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.displayName.trim()) { setError("Display name is required"); return; }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (e) {
      setError(e.message || "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(58,46,38,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 20, backdropFilter: "blur(4px)",
    }}>
      <div style={{
        background: "#fff", borderRadius: 24, padding: "32px",
        width: "100%", maxWidth: 480,
        boxShadow: "0 24px 64px rgba(58,46,38,0.2)",
        border: "1px solid #e8ddd0",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 20, color: "#3a2e26" }}>
            Edit Profile
          </div>
          <button onClick={onClose} style={{ background: "#fdf6ee", border: "1px solid #e8ddd0", borderRadius: 10, width: 32, height: 32, cursor: "pointer", fontSize: 16, color: "#a08878", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {[
          { label: "Display Name *", key: "displayName", placeholder: "Your full name" },
          { label: "Bio", key: "bio", placeholder: "Tell your story...", multiline: true },
          { label: "Website", key: "website", placeholder: "https://yoursite.com" },
          { label: "Location", key: "location", placeholder: "City, Country" },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: 18 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "#5a4a40", fontFamily: "'Lato', sans-serif" }}>
              {f.label}
            </label>
            {f.multiline ? (
              <textarea value={form[f.key]} onChange={e => set(f.key)(e.target.value)}
                placeholder={f.placeholder} rows={3}
                style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", borderRadius: 12, border: "1.5px solid #e0d0c0", background: "#fdf8f4", color: "#3a2e26", fontSize: 14, fontFamily: "'Lato', sans-serif", outline: "none", resize: "vertical" }} />
            ) : (
              <input value={form[f.key]} onChange={e => set(f.key)(e.target.value)}
                placeholder={f.placeholder}
                style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", borderRadius: 12, border: "1.5px solid #e0d0c0", background: "#fdf8f4", color: "#3a2e26", fontSize: 14, fontFamily: "'Lato', sans-serif", outline: "none" }} />
            )}
          </div>
        ))}

        {error && (
          <div style={{ background: "#fff0f0", border: "1px solid #f5c0c0", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#c04040", fontSize: 13, fontFamily: "'Lato', sans-serif" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", background: "none", border: "1.5px solid #e0d0c0", borderRadius: 14, color: "#a08878", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "'Lato', sans-serif" }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 2, padding: "12px", background: saving ? "#e0cfc0" : "linear-gradient(135deg, #c8824a, #e8a870)", border: "none", borderRadius: 14, color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 700, fontFamily: "'Playfair Display', serif", boxShadow: saving ? "none" : "0 4px 14px rgba(200,130,74,0.3)" }}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Profile Page ─────────────────────────────────────────────────────────────
export default function ProfilePage({ user, viewUsername, onBack, onUserUpdate, onProfileClick }) {
  const [profile, setProfile]         = useState(null);
  const [posts, setPosts]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [showEdit, setShowEdit]       = useState(false);
  const [activeTab, setActiveTab]     = useState("posts");
  const [error, setError]             = useState("");
  const [following, setFollowing]     = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const token = getToken();
  // If viewUsername is set and is NOT the logged-in user → viewing someone else
  const isOwnProfile = !viewUsername || viewUsername === user?.userName;

  // ── Load profile ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    const load = isOwnProfile
      ? api.getMe(token)
      : api.getProfile(token, viewUsername);
    load
      .then(data => {
        setProfile(data);
        setFollowing(data?.isFollowedByMe ?? false);
      })
      .catch(() => setError("Could not load profile."))
      .finally(() => setLoading(false));
  }, [token, viewUsername]);

  // ── Load user posts ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    // Use viewUsername if set; fall back to the API profile's userName (loaded async)
    // We wait until profile is loaded for own-profile case so we have the real userName
    const uname = viewUsername || profile?.userName || user?.userName;
    if (!uname) return;
    setPostsLoading(true);
    api.getUserPosts(token, uname)
      .then(data => {
        const items = data?.items ?? (Array.isArray(data) ? data : []);
        setPosts(items.map(mapPost));
      })
      .catch(() => {})
      .finally(() => setPostsLoading(false));
  }, [token, viewUsername, profile?.userName]);

  // ── Save profile ───────────────────────────────────────────────────────────
  const handleSave = async (form) => {
    const updated = await api.updateMe(token, form);
    if (!updated) throw new Error("Save failed");
    setProfile(p => ({ ...p, ...updated }));
    const stored = getUser();
    saveAuth({ accessToken: token, refreshToken: null, user: { ...stored, ...updated } });
    if (onUserUpdate) onUserUpdate({ ...stored, ...updated });
  };

  // ── Follow / Unfollow ──────────────────────────────────────────────────────
  const handleFollow = async () => {
    if (followLoading) return;
    setFollowLoading(true);
    try {
      const res = await api.followUser(token, profile.userName);
      setFollowing(res?.following ?? !following);
      if (res?.followerCount != null)
        setProfile(p => ({ ...p, followerCount: res.followerCount }));
    } catch { }
    setFollowLoading(false);
  };

  // ── Post actions ───────────────────────────────────────────────────────────
  const handlePost = async (text, imageUrl = null, audioUrl = null, videoUrl = null) => {
    try {
      const newPost = await api.createPost(token, text, imageUrl, audioUrl, videoUrl);
      setPosts(ps => [mapPost(newPost), ...ps]);
      setProfile(p => p ? { ...p, postCount: (p.postCount ?? 0) + 1 } : p);
    } catch { }
  };

  const handleLike = async (id) => {
    setPosts(ps => ps.map(p =>
      p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p
    ));
    try { await api.likePost(token, id); }
    catch {
      setPosts(ps => ps.map(p =>
        p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p
      ));
    }
  };

  const handleRepost = async (id) => {
    setPosts(ps => ps.map(p =>
      p.id === id ? { ...p, reposted: !p.reposted, reposts: p.reposted ? p.reposts - 1 : p.reposts + 1 } : p
    ));
    try { await api.repostPost(token, id); }
    catch {
      setPosts(ps => ps.map(p =>
        p.id === id ? { ...p, reposted: !p.reposted, reposts: p.reposted ? p.reposts - 1 : p.reposts + 1 } : p
      ));
    }
  };

  const handleEdit = async (id, newText, imageUrl, audioUrl, videoUrl) => {
    try {
      const updated = await api.editPost(token, id, newText, imageUrl, audioUrl, videoUrl);
      if (updated?.id) {
        setPosts(ps => ps.map(p => p.id === id ? { ...mapPost(updated), liked: p.liked, reposted: p.reposted } : p));
        return;
      }
    } catch { }
    setPosts(ps => ps.map(p => p.id === id ? { ...p, text: newText, imageUrl: imageUrl ?? p.imageUrl } : p));
  };

  // ── Derived values ─────────────────────────────────────────────────────────
  const displayName  = profile?.displayName || user?.displayName || user?.userName || "User";
  const userName     = profile?.userName    || user?.userName    || "user";
  const bio          = profile?.bio         || "";
  const website      = profile?.website     || "";
  const location     = profile?.location    || "";
  const isVerified   = profile?.isVerified  || user?.isVerified  || false;
  const initials     = displayName.slice(0, 2).toUpperCase();
  const color        = colorForUser(userName);
  const followerCount  = profile?.followerCount  ?? 0;
  const followingCount = profile?.followingCount ?? 0;
  const postCount      = profile?.postCount      ?? posts.length;
  const joinDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-SG", { month: "long", year: "numeric" })
    : "";

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#faf6f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=Lato:wght@400;500;700&display=swap" rel="stylesheet" />
      <div style={{ textAlign: "center", color: "#a08878", fontFamily: "'Playfair Display', serif" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🎭</div>
        <div style={{ fontStyle: "italic" }}>Loading your profile...</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#faf6f0", fontFamily: "'Lato', sans-serif", color: "#3a2e26" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=Lato:wght@400;500;700&display=swap" rel="stylesheet" />

      {/* Top Banner */}
      <div style={{ background: "linear-gradient(135deg, #3a2e26 0%, #6a4a30 50%, #8a6040 100%)", padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 20, padding: "5px 14px", color: "#e8c87a", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "'Lato', sans-serif" }}>
            ← Back
          </button>
          <span style={{ fontFamily: "'Playfair Display', serif", color: "#e8c87a", fontSize: 13 }}>🎭 LifeStage</span>
        </div>
        <span style={{ color: "#e8c87a", fontSize: 13, fontFamily: "'Lato', sans-serif" }}>👋 {displayName}</span>
      </div>

      {/* Cover Banner */}
      <div style={{
        height: 180,
        background: `linear-gradient(135deg, ${color}44 0%, ${color}22 40%, #f0e8de 100%)`,
        position: "relative", borderBottom: "1px solid #e8ddd0",
      }}>
        <div style={{ position: "absolute", top: 20, right: 60, width: 100, height: 100, borderRadius: "50%", background: `${color}18`, border: `1px solid ${color}22` }} />
        <div style={{ position: "absolute", top: 60, right: 140, width: 60, height: 60, borderRadius: "50%", background: `${color}12`, border: `1px solid ${color}18` }} />
        <div style={{ position: "absolute", bottom: 20, left: 40, width: 80, height: 80, borderRadius: "50%", background: `${color}10` }} />
      </div>

      {/* Profile Card */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 20px" }}>

        {/* Avatar + action button */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: -50, marginBottom: 20 }}>
          <div style={{ border: "4px solid #faf6f0", borderRadius: "50%", display: "inline-block" }}>
            <ProfileAvatar initials={initials} color={color} size={100} />
          </div>
          {isOwnProfile ? (
            <button onClick={() => setShowEdit(true)}
              style={{ background: "#fff", border: "1.5px solid #e0c8b0", borderRadius: 20, padding: "9px 22px", color: "#c8824a", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "'Lato', sans-serif", boxShadow: "0 2px 8px rgba(180,140,100,0.1)" }}>
              ✏️ Edit Profile
            </button>
          ) : (
            <button onClick={handleFollow} disabled={followLoading}
              style={{ background: following ? "#fff" : "linear-gradient(135deg, #c8824a, #e8a870)", border: following ? "1.5px solid #e0c8b0" : "none", borderRadius: 20, padding: "9px 22px", color: following ? "#c8824a" : "#fff", cursor: followLoading ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 700, fontFamily: "'Lato', sans-serif", boxShadow: following ? "none" : "0 4px 14px rgba(200,130,74,0.3)", opacity: followLoading ? 0.7 : 1 }}>
              {followLoading ? "..." : following ? "Following" : "Follow"}
            </button>
          )}
        </div>

        {/* Name + handle */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 24, color: "#3a2e26" }}>{displayName}</span>
            {isVerified && (
              <span style={{ background: "#c8824a", borderRadius: "50%", width: 20, height: 20, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff" }}>✓</span>
            )}
          </div>
          <div style={{ color: "#a08878", fontSize: 15, marginTop: 2 }}>@{userName}</div>
        </div>

        {bio && (
          <p style={{ color: "#5a4a40", fontSize: 15, lineHeight: 1.7, margin: "0 0 14px", maxWidth: 520 }}>{bio}</p>
        )}

        {/* Meta row */}
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 20 }}>
          {location && <span style={{ color: "#a08878", fontSize: 14 }}>📍 {location}</span>}
          {website && (
            <a href={website} target="_blank" rel="noreferrer"
              style={{ color: "#c8824a", fontSize: 14, textDecoration: "none" }}>
              🔗 {website.replace(/^https?:\/\//, "")}
            </a>
          )}
          {joinDate && <span style={{ color: "#a08878", fontSize: 14 }}>📅 Joined {joinDate}</span>}
        </div>

        {/* Stats */}
        <div style={{ display: "flex", background: "#fff", border: "1px solid #e8ddd0", borderRadius: 20, padding: "16px 8px", marginBottom: 24, boxShadow: "0 2px 8px rgba(180,140,100,0.06)" }}>
          <Stat value={postCount}      label="Posts" />
          <div style={{ width: 1, background: "#e8ddd0" }} />
          <Stat value={followerCount}  label="Followers" />
          <div style={{ width: 1, background: "#e8ddd0" }} />
          <Stat value={followingCount} label="Following" />
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", borderBottom: "2px solid #e8ddd0", marginBottom: 20 }}>
          {[{ id: "posts", label: "Posts" }, { id: "likes", label: "Likes" }, { id: "reposts", label: "Reposts" }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: "12px 24px", background: "none", border: "none", cursor: "pointer",
              fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 14,
              color: activeTab === tab.id ? "#c8824a" : "#a08878",
              borderBottom: `3px solid ${activeTab === tab.id ? "#c8824a" : "transparent"}`,
              transition: "all 0.15s", marginBottom: -2,
            }}>{tab.label}</button>
          ))}
        </div>

        {/* Composer — only on own Posts tab */}
        {isOwnProfile && activeTab === "posts" && (
          <div style={{ marginBottom: 20 }}>
            <Composer onPost={handlePost} user={user} />
          </div>
        )}

        {/* Post list */}
        {postsLoading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#a08878", fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>
            Loading posts...
          </div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#a08878", fontFamily: "'Playfair Display', serif" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✨</div>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>No posts yet</div>
            <div style={{ fontSize: 14, fontStyle: "italic" }}>Your stage is waiting — share your first moment</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 40 }}>
            {posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                onLike={handleLike}
                onRepost={handleRepost}
                onEdit={handleEdit}
                currentUser={user}
                isMyPost={isOwnProfile}
                onProfileClick={onProfileClick}
              />
            ))}
          </div>
        )}

        {error && (
          <div style={{ background: "#fff0f0", border: "1px solid #f5c0c0", borderRadius: 12, padding: "14px 18px", color: "#c04040", fontSize: 14, fontFamily: "'Lato', sans-serif", marginBottom: 20 }}>
            {error}
          </div>
        )}
      </div>

      {showEdit && (
        <EditModal
          profile={{ displayName, bio, website, location }}
          onSave={handleSave}
          onClose={() => setShowEdit(false)}
        />
      )}
    </div>
  );
}
