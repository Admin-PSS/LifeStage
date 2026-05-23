// src/PostCard.jsx — Shared post components (PostCard + Composer)
import { useState } from "react";
import { api } from "./api";
import { getToken } from "./auth";

// ─── Helpers ──────────────────────────────────────────────────────────────────
export const AVATAR_COLORS = [
  "#E8A87C", "#7CB8E8", "#B87CE8", "#7CE8B4",
  "#E87CB8", "#E8D87C", "#7CE8D8", "#B8E87C",
];

export function colorForUser(userName = "") {
  let hash = 0;
  for (let i = 0; i < userName.length; i++) hash += userName.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  return Math.floor(diff / 86400) + "d ago";
}

export function mapPost(p) {
  const author = p.author || p.user || {};
  const userName = author.userName || author.handle || "unknown";
  const displayName = author.displayName || author.name || userName;
  return {
    id: p.id,
    user: {
      name: displayName,
      handle: "@" + userName,
      avatar: displayName.slice(0, 2).toUpperCase(),
      color: colorForUser(userName),
      verified: author.isVerified || false,
    },
    text: p.content || p.text || "",
    likes: p.likeCount ?? p.likes ?? 0,
    comments: p.commentCount ?? p.comments ?? 0,
    reposts: p.repostCount ?? p.reposts ?? 0,
    liked: p.isLikedByMe ?? p.liked ?? false,
    reposted: p.isRepostedByMe ?? p.reposted ?? false,
    tags: (p.hashtags || p.tags || []).map(t => t.startsWith("#") ? t : "#" + t),
    time: p.createdAt ? timeAgo(p.createdAt) : (p.time || ""),
    imageUrl: p.imageUrl || p.image_url || null,
    audioUrl: p.audioUrl || null,
    videoUrl: p.videoUrl || null,
    _raw: p,
  };
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
export function Avatar({ user, size = 40 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `linear-gradient(135deg, ${user.color}dd, ${user.color}55)`,
      border: `2px solid ${user.color}44`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.34, fontWeight: 800, color: "#fff",
      fontFamily: "'Playfair Display', serif",
      boxShadow: `0 2px 10px ${user.color}33`,
    }}>{user.avatar}</div>
  );
}

// ─── Emoji list (shared by PostCard edit + Composer) ─────────────────────────
const EMOJI_LIST = [
  "😊","😂","❤️","🔥","✨","🎉","👏","🙌","💯","🥰",
  "😍","🤩","😎","🙏","💪","🌟","🎭","🌿","☀️","🌙",
  "🎵","📚","💡","🚀","🌈","🍀","🦋","💫","🌺","🎨",
];

// ─── ActionBtn ────────────────────────────────────────────────────────────────
export function ActionBtn({ icon, count, active, activeColor, fill = "none", onClick, label, style: sx }) {
  const [hover, setHover] = useState(false);
  const col = active ? activeColor : hover ? "#b0957a" : "#8a7a6a";
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      title={label} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: col, fontSize: 13, fontFamily: "'Lato', sans-serif", transition: "color 0.15s", padding: "4px 0", ...sx }}>
      <svg width={17} height={17} viewBox="0 0 24 24" fill={active && fill !== "none" ? fill : "none"} stroke={col} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d={icon} />
      </svg>
      {count != null && <span>{count >= 1000 ? (count / 1000).toFixed(1) + "K" : count}</span>}
    </button>
  );
}

// ─── PostCard ─────────────────────────────────────────────────────────────────
export function PostCard({ post, onLike, onRepost, onEdit, currentUser, isMyPost, onProfileClick }) {
  const [showComment, setShowComment]       = useState(false);
  const [commentList, setCommentList]       = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [comment, setComment]               = useState("");
  const [localComments, setLocalComments]   = useState(post.comments);
  const [hovered, setHovered]               = useState(false);

  // edit state
  const [isEditing, setIsEditing]           = useState(false);
  const [editText, setEditText]             = useState(post.text);
  const [editImageUrl, setEditImageUrl]     = useState(post.imageUrl || null);
  const [editAudioUrl, setEditAudioUrl]     = useState(post.audioUrl || null);
  const [editAudioName, setEditAudioName]   = useState("");
  const [editVideoUrl, setEditVideoUrl]     = useState(post.videoUrl || null);
  const [editVideoProgress, setEditVideoProgress] = useState(0);
  const [editUploading, setEditUploading]   = useState(false);
  const [editUploadError, setEditUploadError] = useState("");
  const [showEditEmoji, setShowEditEmoji]   = useState(false);
  const [saving, setSaving]                 = useState(false);

  const [shareCopied, setShareCopied]       = useState(false);
  const token = getToken();

  // ── Toggle comment panel + load existing comments ─────────────────────────
  const toggleComment = async () => {
    const next = !showComment;
    setShowComment(next);
    if (next && commentList.length === 0 && token) {
      setCommentsLoading(true);
      try {
        const data = await api.getComments(token, post.id);
        setCommentList(Array.isArray(data) ? data : []);
      } catch { }
      setCommentsLoading(false);
    }
  };

  // ── Submit new comment ────────────────────────────────────────────────────
  const submitComment = async () => {
    if (!comment.trim()) return;
    const text = comment;
    setComment("");
    setLocalComments(n => n + 1);
    // Append optimistically
    setCommentList(list => [...list, {
      id: Date.now(),
      content: text,
      author: { displayName: currentUser?.displayName || "You", userName: currentUser?.userName || "me" },
      createdAt: new Date().toISOString(),
    }]);
    if (token) {
      try { await api.addComment(token, post.id, text); } catch { }
    }
  };

  // ── Edit image upload ─────────────────────────────────────────────────────
  const handleEditImagePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditUploading(true);
    try {
      const data = await api.uploadImage(token, file, "posts");
      if (data.url) setEditImageUrl(data.url);
    } catch { }
    setEditUploading(false);
    e.target.value = "";
  };

  // ── Edit audio upload ─────────────────────────────────────────────────────
  const handleEditAudioPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditUploading(true);
    try {
      const data = await api.uploadAudio(token, file);
      if (data.url) { setEditAudioUrl(data.url); setEditAudioName(file.name); }
    } catch { }
    setEditUploading(false);
    e.target.value = "";
  };

  // ── Edit video upload (SAS direct-to-blob) ────────────────────────────────
  const handleEditVideoPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditUploadError("");
    if (file.size > 500 * 1024 * 1024) {
      setEditUploadError("Video must be under 500 MB.");
      e.target.value = "";
      return;
    }
    const duration = await new Promise((res) => {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); res(v.duration); };
      v.onerror = () => res(Infinity);
      v.src = URL.createObjectURL(file);
    });
    if (duration > 600) {
      setEditUploadError("Video must be 10 minutes or less.");
      e.target.value = "";
      return;
    }
    setEditUploading(true);
    setEditVideoProgress(0);
    try {
      const ext = "." + file.name.split(".").pop().toLowerCase();
      const { sasUrl, blobUrl } = await api.getVideoSasUrl(token, ext);
      await api.uploadVideoToBlob(sasUrl, file, (pct) => setEditVideoProgress(pct));
      setEditVideoUrl(blobUrl);
    } catch {
      setEditUploadError("Video upload failed. Please try again.");
    } finally {
      setEditUploading(false);
      setEditVideoProgress(0);
      e.target.value = "";
    }
  };

  // ── Save edit ─────────────────────────────────────────────────────────────
  const saveEdit = async () => {
    if (!editText.trim() || saving) return;
    setSaving(true);
    await onEdit(post.id, editText, editImageUrl, editAudioUrl, editVideoUrl);
    setSaving(false);
    setIsEditing(false);
    setShowEditEmoji(false);
  };

  const handleShare = () => {
    const url = `${window.location.origin}/posts/${post.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  };

  const initials = currentUser
    ? (currentUser.displayName || currentUser.userName || "YO").slice(0, 2).toUpperCase()
    : "YO";

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "#fdf8f3" : "#fff",
        border: "1px solid #e8ddd0", borderRadius: 20, padding: "20px 24px",
        transition: "all 0.2s",
        transform: hovered ? "translateY(-1px)" : "none",
        boxShadow: hovered ? "0 8px 28px rgba(180,140,100,0.12)" : "0 2px 8px rgba(180,140,100,0.06)",
      }}>

      {/* Header */}
      <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
        <div onClick={() => onProfileClick?.(post.user.handle.slice(1))} style={{ cursor: onProfileClick ? "pointer" : "default" }}>
          <Avatar user={post.user} size={44} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span onClick={() => onProfileClick?.(post.user.handle.slice(1))}
              style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 15, color: "#3a2e26", cursor: onProfileClick ? "pointer" : "default" }}
              onMouseEnter={e => { if (onProfileClick) e.currentTarget.style.color = "#c8824a"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#3a2e26"; }}>
              {post.user.name}
            </span>
            {post.user.verified && (
              <span style={{ background: "#c8824a", borderRadius: "50%", width: 16, height: 16, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#fff" }}>✓</span>
            )}
            <span style={{ color: "#a08878", fontSize: 13 }}>{post.user.handle}</span>
            <span style={{ color: "#c8bab0", fontSize: 12, marginLeft: "auto" }}>{post.time}</span>
            {isMyPost && !isEditing && (
              <button onClick={() => { setEditText(post.text); setEditImageUrl(post.imageUrl || null); setEditAudioUrl(post.audioUrl || null); setEditAudioName(""); setEditVideoUrl(post.videoUrl || null); setEditUploadError(""); setIsEditing(true); }}
                title="Edit post"
                style={{ background: "none", border: "none", cursor: "pointer", color: "#c0a898", fontSize: 13, padding: "0 4px", marginLeft: 4 }}>✎</button>
            )}
          </div>

          {/* ── Edit mode ── */}
          {isEditing ? (
            <div style={{ marginTop: 8 }}>
              <textarea value={editText} onChange={e => setEditText(e.target.value)}
                rows={3} autoFocus
                style={{ width: "100%", background: "#fdf6ee", border: "1px solid #c8824a55", borderRadius: 10, padding: "8px 12px", color: "#3a2e26", fontSize: 15, fontFamily: "'Lato', sans-serif", resize: "none", outline: "none", lineHeight: 1.65 }} />

              {/* Image preview in edit */}
              {editImageUrl && (
                <div style={{ position: "relative", display: "inline-block", marginTop: 8 }}>
                  <img src={editImageUrl} alt="Attached" style={{ maxHeight: 140, maxWidth: "100%", borderRadius: 10, border: "1px solid #e8ddd0" }} />
                  <button onClick={() => setEditImageUrl(null)}
                    style={{ position: "absolute", top: 4, right: 4, background: "rgba(58,46,38,0.7)", border: "none", borderRadius: "50%", width: 22, height: 22, color: "#fff", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    ✕
                  </button>
                </div>
              )}

              {/* Audio preview in edit */}
              {editAudioUrl && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, background: "#fdf0e6", border: "1px solid #e8d0b8", borderRadius: 12, padding: "8px 12px" }}>
                  <span style={{ fontSize: 18 }}>🎵</span>
                  <span style={{ fontSize: 13, color: "#5a4a40", fontFamily: "'Lato', sans-serif", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{editAudioName || "Audio attached"}</span>
                  <button onClick={() => { setEditAudioUrl(null); setEditAudioName(""); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#a08878", fontSize: 16, padding: 0 }}>✕</button>
                </div>
              )}

              {/* Video preview in edit */}
              {editVideoUrl && (
                <div style={{ position: "relative", marginTop: 8 }}>
                  <video src={editVideoUrl} controls style={{ width: "100%", borderRadius: 10, maxHeight: 220, background: "#000" }} preload="metadata" />
                  <button onClick={() => setEditVideoUrl(null)}
                    style={{ position: "absolute", top: 6, right: 6, background: "rgba(58,46,38,0.75)", border: "none", borderRadius: "50%", width: 24, height: 24, color: "#fff", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    ✕
                  </button>
                </div>
              )}

              {/* Video upload progress */}
              {editUploading && editVideoProgress > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ height: 4, borderRadius: 4, background: "#e8ddd0", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${editVideoProgress}%`, background: "linear-gradient(90deg, #c8824a, #e8a870)", transition: "width 0.3s" }} />
                  </div>
                  <div style={{ fontSize: 11, color: "#a08878", fontFamily: "'Lato', sans-serif", marginTop: 4 }}>Uploading video… {editVideoProgress}%</div>
                </div>
              )}

              {editUploadError && (
                <div style={{ color: "#e05050", fontSize: 12, marginTop: 6, fontFamily: "'Lato', sans-serif" }}>{editUploadError}</div>
              )}

              {/* Edit toolbar: image + emoji + actions */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                {/* Image upload */}
                <label style={{ cursor: "pointer", fontSize: 18, opacity: editUploading ? 0.5 : 0.7 }} title="Replace image">
                  {editUploading ? "⏳" : "🖼️"}
                  <input type="file" accept="image/*" onChange={handleEditImagePick} style={{ display: "none" }} disabled={editUploading} />
                </label>

                {/* Audio upload */}
                <label style={{ cursor: "pointer", fontSize: 18, opacity: editUploading || editAudioUrl ? 0.5 : 0.7 }} title="Attach song">
                  🎵
                  <input type="file" accept="audio/mpeg,audio/mp3,audio/aac,audio/ogg,audio/wav" onChange={handleEditAudioPick} style={{ display: "none" }} disabled={editUploading || !!editAudioUrl} />
                </label>

                {/* Video upload */}
                <label style={{ cursor: "pointer", fontSize: 18, opacity: editUploading || editVideoUrl ? 0.5 : 0.7 }} title="Attach video (MP4/WebM/MOV, max 10 min, 500 MB)">
                  🎬
                  <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={handleEditVideoPick} style={{ display: "none" }} disabled={editUploading || !!editVideoUrl} />
                </label>

                {/* Emoji picker */}
                <div style={{ position: "relative" }}>
                  <button onClick={() => setShowEditEmoji(v => !v)}
                    style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", opacity: showEditEmoji ? 1 : 0.7 }}
                    title="Add emoji">😊</button>
                  {showEditEmoji && (
                    <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, background: "#fff", border: "1px solid #e8ddd0", borderRadius: 16, padding: 10, boxShadow: "0 8px 28px rgba(180,140,100,0.18)", display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4, zIndex: 100, width: 210 }}>
                      {EMOJI_LIST.map(em => (
                        <button key={em} onClick={() => { setEditText(t => t + em); setShowEditEmoji(false); }}
                          style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", padding: "4px", borderRadius: 8, lineHeight: 1 }}
                          onMouseEnter={e => e.currentTarget.style.background = "#fdf0e6"}
                          onMouseLeave={e => e.currentTarget.style.background = "none"}>
                          {em}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <button onClick={saveEdit} disabled={saving}
                    style={{ background: "linear-gradient(135deg, #c8824a, #e8a870)", border: "none", borderRadius: 16, padding: "6px 18px", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button onClick={() => { setEditText(post.text); setEditImageUrl(post.imageUrl || null); setEditAudioUrl(post.audioUrl || null); setEditAudioName(""); setEditVideoUrl(post.videoUrl || null); setEditUploadError(""); setIsEditing(false); setShowEditEmoji(false); }}
                    style={{ background: "none", border: "1px solid #e0cfc0", borderRadius: 16, padding: "6px 18px", color: "#a08878", cursor: "pointer", fontSize: 13 }}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p style={{ color: "#5a4a40", fontSize: 15, lineHeight: 1.7, margin: "8px 0 0", fontFamily: "'Lato', sans-serif", whiteSpace: "pre-line" }}>
              {post.text}
            </p>
          )}

          {post.tags?.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              {post.tags.map(t => (
                <span key={t} style={{ color: "#c8824a", fontSize: 13, cursor: "pointer", fontFamily: "'Lato', sans-serif" }}>{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Post image */}
      {post.imageUrl && !isEditing && (
        <div style={{ marginBottom: 12 }}>
          <img src={post.imageUrl} alt="Post attachment"
            style={{ width: "100%", maxHeight: 360, objectFit: "cover", borderRadius: 14, border: "1px solid #e8ddd0" }} />
        </div>
      )}

      {/* Audio player */}
      {post.audioUrl && !isEditing && (
        <div style={{ marginBottom: 12, background: "linear-gradient(135deg, #fdf0e6, #fdf6ee)", border: "1px solid #e8d0b8", borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #c8824a, #e8a870)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 16 }}>🎵</div>
          <audio controls style={{ flex: 1, height: 36, outline: "none", minWidth: 0 }} preload="metadata">
            <source src={post.audioUrl} />
            Your browser does not support audio playback.
          </audio>
        </div>
      )}

      {/* Video player */}
      {post.videoUrl && !isEditing && (
        <div style={{ marginBottom: 12, borderRadius: 14, overflow: "hidden", border: "1px solid #e8ddd0", background: "#000" }}>
          <video controls style={{ width: "100%", maxHeight: 400, display: "block" }} preload="metadata">
            <source src={post.videoUrl} />
            Your browser does not support video playback.
          </video>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 24, paddingTop: 12, borderTop: "1px solid #f0e8e0" }}>
        <ActionBtn icon="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
          count={post.likes} active={post.liked} activeColor="#e07050" fill={post.liked ? "#e07050" : "none"}
          onClick={() => onLike(post.id)} label="Like" />
        <ActionBtn icon="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
          count={localComments} active={showComment} activeColor="#c8824a"
          onClick={toggleComment} label="Comment" />
        <ActionBtn icon="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3"
          count={post.reposts} active={post.reposted} activeColor="#7aaa8a"
          onClick={() => onRepost(post.id)} label="Repost" />
        <ActionBtn icon="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"
          count={null} active={shareCopied} activeColor="#7aaa8a"
          onClick={handleShare} label={shareCopied ? "Copied!" : "Share"} style={{ marginLeft: "auto" }} />
      </div>

      {/* Comment panel */}
      {showComment && (
        <div style={{ marginTop: 14, borderTop: "1px solid #f0e8e0", paddingTop: 12 }}>

          {/* Existing comments */}
          {commentsLoading ? (
            <div style={{ color: "#b0a090", fontSize: 13, fontFamily: "'Lato', sans-serif", padding: "8px 0" }}>Loading comments...</div>
          ) : commentList.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
              {commentList.map((c, i) => {
                const name = c.author?.displayName || c.author?.userName || "Someone";
                const avatar = name.slice(0, 2).toUpperCase();
                const col = colorForUser(c.author?.userName || "");
                return (
                  <div key={c.id || i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: `linear-gradient(135deg, ${col}dd, ${col}66)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#fff" }}>
                      {avatar}
                    </div>
                    <div style={{ flex: 1, background: "#fdf6ee", borderRadius: 14, padding: "7px 12px" }}>
                      <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 13, color: "#3a2e26" }}>{name} </span>
                      <span style={{ fontSize: 13, color: "#5a4a40", fontFamily: "'Lato', sans-serif" }}>{c.content || c.text}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ color: "#b0a090", fontSize: 13, fontFamily: "'Lato', sans-serif", fontStyle: "italic", marginBottom: 10 }}>No comments yet — be the first!</div>
          )}

          {/* New comment input */}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, #E8B47Cdd, #E8B47C66)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff" }}>
              {initials}
            </div>
            <input value={comment} onChange={e => setComment(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submitComment()}
              placeholder="Share your thoughts..."
              autoFocus
              style={{ flex: 1, background: "#fff", border: "1.5px solid #c8824a88", borderRadius: 20, padding: "8px 14px", color: "#3a2e26", fontSize: 14, outline: "none", fontFamily: "'Lato', sans-serif", caretColor: "#c8824a" }} />
            <button onClick={submitComment}
              style={{ background: "linear-gradient(135deg, #c8824a, #e8a870)", border: "none", borderRadius: 20, padding: "8px 16px", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
              Post
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Composer ─────────────────────────────────────────────────────────────────
export function Composer({ onPost, user, composerRef }) {
  const [text, setText]               = useState("");
  const [focused, setFocused]         = useState(false);
  const [posting, setPosting]         = useState(false);
  const [imageUrl, setImageUrl]       = useState(null);
  const [audioUrl, setAudioUrl]       = useState(null);
  const [audioName, setAudioName]     = useState("");
  const [videoUrl, setVideoUrl]       = useState(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const [uploading, setUploading]     = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [showEmoji, setShowEmoji]     = useState(false);
  const initials = (user?.displayName || user?.userName || "YO").slice(0, 2).toUpperCase();
  const token    = getToken();

  const handleImagePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const data = await api.uploadImage(token, file, "posts");
      if (data.url) setImageUrl(data.url);
      else setUploadError(data.message || "Upload failed");
    } catch {
      setUploadError("Could not upload image");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleAudioPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const data = await api.uploadAudio(token, file);
      if (data.url) { setAudioUrl(data.url); setAudioName(file.name); }
      else setUploadError(data.message || "Audio upload failed");
    } catch {
      setUploadError("Could not upload audio");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleVideoPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    if (file.size > 500 * 1024 * 1024) {
      setUploadError("Video must be under 500 MB.");
      e.target.value = "";
      return;
    }
    const duration = await new Promise((res) => {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); res(v.duration); };
      v.onerror = () => res(Infinity);
      v.src = URL.createObjectURL(file);
    });
    if (duration > 600) {
      setUploadError("Video must be 10 minutes or less.");
      e.target.value = "";
      return;
    }
    setUploading(true);
    setVideoProgress(0);
    try {
      const ext = "." + file.name.split(".").pop().toLowerCase();
      const { sasUrl, blobUrl } = await api.getVideoSasUrl(token, ext);
      await api.uploadVideoToBlob(sasUrl, file, (pct) => setVideoProgress(pct));
      setVideoUrl(blobUrl);
    } catch {
      setUploadError("Video upload failed. Please try again.");
    } finally {
      setUploading(false);
      setVideoProgress(0);
      e.target.value = "";
    }
  };

  const submit = async () => {
    if (!text.trim() || posting) return;
    setPosting(true);
    await onPost(text, imageUrl, audioUrl, videoUrl);
    setText("");
    setImageUrl(null);
    setAudioUrl(null);
    setAudioName("");
    setVideoUrl(null);
    setPosting(false);
  };

  return (
    <div style={{ background: "#fff", border: `1px solid ${focused ? "#c8824a55" : "#e8ddd0"}`, borderRadius: 20, padding: "16px 20px", boxShadow: focused ? "0 4px 20px rgba(200,130,74,0.1)" : "0 2px 8px rgba(180,140,100,0.06)", transition: "all 0.2s" }}>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, #E8B47Cdd, #E8B47C66)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: "#fff" }}>
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <textarea ref={composerRef} value={text} onChange={e => setText(e.target.value)}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            placeholder="What's your scene today?"
            rows={focused || text ? 3 : 1}
            style={{ width: "100%", background: "none", border: "none", resize: "none", color: "#3a2e26", fontSize: 15, fontFamily: "'Lato', sans-serif", outline: "none", lineHeight: 1.65 }} />

          {imageUrl && (
            <div style={{ position: "relative", display: "inline-block", marginBottom: 10 }}>
              <img src={imageUrl} alt="Attached" style={{ maxHeight: 180, maxWidth: "100%", borderRadius: 12, border: "1px solid #e8ddd0" }} />
              <button onClick={() => setImageUrl(null)}
                style={{ position: "absolute", top: 6, right: 6, background: "rgba(58,46,38,0.7)", border: "none", borderRadius: "50%", width: 24, height: 24, color: "#fff", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>
                ✕
              </button>
            </div>
          )}

          {audioUrl && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, background: "#fdf0e6", border: "1px solid #e8d0b8", borderRadius: 12, padding: "8px 12px" }}>
              <span style={{ fontSize: 18 }}>🎵</span>
              <span style={{ fontSize: 13, color: "#5a4a40", fontFamily: "'Lato', sans-serif", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{audioName}</span>
              <button onClick={() => { setAudioUrl(null); setAudioName(""); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#a08878", fontSize: 16, padding: 0 }}>✕</button>
            </div>
          )}

          {videoUrl && (
            <div style={{ position: "relative", marginBottom: 10 }}>
              <video src={videoUrl} controls style={{ width: "100%", borderRadius: 12, maxHeight: 220, background: "#000" }} preload="metadata" />
              <button onClick={() => setVideoUrl(null)}
                style={{ position: "absolute", top: 6, right: 6, background: "rgba(58,46,38,0.75)", border: "none", borderRadius: "50%", width: 24, height: 24, color: "#fff", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>
                ✕
              </button>
            </div>
          )}

          {uploading && videoProgress > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ height: 4, borderRadius: 4, background: "#e8ddd0", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${videoProgress}%`, background: "linear-gradient(90deg, #c8824a, #e8a870)", transition: "width 0.3s" }} />
              </div>
              <div style={{ fontSize: 11, color: "#a08878", fontFamily: "'Lato', sans-serif", marginTop: 4 }}>Uploading video… {videoProgress}%</div>
            </div>
          )}

          {uploadError && (
            <div style={{ color: "#e05050", fontSize: 12, marginBottom: 8, fontFamily: "'Lato', sans-serif" }}>{uploadError}</div>
          )}

          {(focused || text || imageUrl || audioUrl || videoUrl) && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <label style={{ cursor: "pointer", opacity: uploading ? 0.5 : 0.7, fontSize: 18 }} title="Attach image">
                  {uploading ? "⏳" : "🖼️"}
                  <input type="file" accept="image/*" onChange={handleImagePick} style={{ display: "none" }} disabled={uploading} />
                </label>
                <label style={{ cursor: "pointer", opacity: uploading || audioUrl ? 0.5 : 0.7, fontSize: 18 }} title="Attach song (MP3/AAC/OGG, max 50MB)">
                  🎵
                  <input type="file" accept="audio/mpeg,audio/mp3,audio/aac,audio/ogg,audio/wav" onChange={handleAudioPick} style={{ display: "none" }} disabled={uploading || !!audioUrl} />
                </label>
                <label style={{ cursor: "pointer", opacity: uploading || videoUrl ? 0.5 : 0.7, fontSize: 18 }} title="Attach video (MP4/WebM/MOV, max 10 min, 500 MB)">
                  🎬
                  <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={handleVideoPick} style={{ display: "none" }} disabled={uploading || !!videoUrl} />
                </label>
                <div style={{ position: "relative" }}>
                  <button onClick={() => setShowEmoji(v => !v)}
                    style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", opacity: showEmoji ? 1 : 0.6 }}
                    title="Add emoji">😊</button>
                  {showEmoji && (
                    <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: 0, background: "#fff", border: "1px solid #e8ddd0", borderRadius: 16, padding: 10, boxShadow: "0 8px 28px rgba(180,140,100,0.18)", display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4, zIndex: 100, width: 210 }}>
                      {EMOJI_LIST.map(em => (
                        <button key={em} onClick={() => { setText(t => t + em); setShowEmoji(false); }}
                          style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", padding: "4px", borderRadius: 8, lineHeight: 1 }}
                          onMouseEnter={e => e.currentTarget.style.background = "#fdf0e6"}
                          onMouseLeave={e => e.currentTarget.style.background = "none"}>
                          {em}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ color: text.length > 240 ? "#e05050" : "#c0a898", fontSize: 12 }}>{280 - text.length}</span>
                <button onClick={submit} disabled={!text.trim() || posting}
                  style={{ background: text.trim() ? "linear-gradient(135deg, #c8824a, #e8a870)" : "#e8ddd0", border: "none", borderRadius: 20, padding: "8px 22px", color: text.trim() ? "#fff" : "#b0a090", cursor: text.trim() ? "pointer" : "not-allowed", fontSize: 14, fontWeight: 700, fontFamily: "'Playfair Display', serif", transition: "all 0.2s" }}>
                  {posting ? "Sharing..." : "Share"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
