// src/NotificationToast.jsx
// Real-time notification toast + bell icon with dropdown

import { useState, useEffect, useRef } from "react";

// ── Notification type config ──────────────────────────────────────────────────
const TYPE_CONFIG = {
  Like:    { emoji: "❤️",  color: "#e07050", label: "liked your post" },
  Comment: { emoji: "💬",  color: "#c8824a", label: "commented on your post" },
  Follow:  { emoji: "👤",  color: "#7aaa8a", label: "followed you" },
  Repost:  { emoji: "🔁",  color: "#7aaa8a", label: "reposted your post" },
  Mention: { emoji: "📣",  color: "#c8824a", label: "mentioned you" },
  System:  { emoji: "🎭",  color: "#a08878", label: "system notification" },
};

function cfg(type) {
  return TYPE_CONFIG[type] || TYPE_CONFIG.System;
}

// ── Single Toast ──────────────────────────────────────────────────────────────
function Toast({ notification, onDismiss }) {
  const c = cfg(notification.type);
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // Animate in
    const t1 = setTimeout(() => setVisible(true), 10);
    // Auto-dismiss after 4s
    const t2 = setTimeout(() => dismiss(), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const dismiss = () => {
    setLeaving(true);
    setTimeout(() => onDismiss(notification.id), 300);
  };

  return (
    <div
      onClick={dismiss}
      style={{
        display: "flex", alignItems: "flex-start", gap: 12,
        background: "#fff",
        border: `1px solid ${c.color}33`,
        borderLeft: `4px solid ${c.color}`,
        borderRadius: 16,
        padding: "14px 16px",
        boxShadow: "0 8px 28px rgba(58,46,38,0.14)",
        cursor: "pointer",
        maxWidth: 340,
        opacity: visible && !leaving ? 1 : 0,
        transform: visible && !leaving ? "translateX(0)" : "translateX(20px)",
        transition: "all 0.3s ease",
        marginBottom: 10,
      }}
    >
      <span style={{ fontSize: 22, flexShrink: 0 }}>{c.emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 14, color: "#3a2e26", lineHeight: 1.4 }}>
          <strong>{notification.actorName || "Someone"}</strong>{" "}
          <span style={{ color: "#5a4a40" }}>{notification.message || c.label}</span>
        </div>
        <div style={{ fontSize: 11, color: "#b0a090", marginTop: 4, fontFamily: "'Lato', sans-serif" }}>
          just now · tap to dismiss
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); dismiss(); }}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#c0b0a0", fontSize: 16, padding: 0, flexShrink: 0 }}
      >✕</button>
    </div>
  );
}

// ── Toast Container ───────────────────────────────────────────────────────────
export function ToastContainer({ toasts, onDismiss }) {
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24,
      zIndex: 9999,
      display: "flex", flexDirection: "column-reverse",
      pointerEvents: "none",
    }}>
      {toasts.map(n => (
        <div key={n.id} style={{ pointerEvents: "auto" }}>
          <Toast notification={n} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}

// ── Bell Icon with Badge ──────────────────────────────────────────────────────
export function NotificationBell({ id, unreadCount, notifications, onMarkAllRead, signalRStatus }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const statusColor = {
    connected: "#50b870",
    reconnecting: "#e8a050",
    disconnected: "#e05050",
  }[signalRStatus] || "#a08878";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Bell button */}
      <button
        id={id}
        onClick={() => { setOpen(v => !v); if (!open && onMarkAllRead) onMarkAllRead(); }}
        style={{
          position: "relative", background: open ? "#fdf0e6" : "none",
          border: `1px solid ${open ? "#e0c8b0" : "transparent"}`,
          borderRadius: 12, padding: "6px 10px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
          transition: "all 0.15s",
        }}
        title={`Notifications · SignalR ${signalRStatus}`}
      >
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none"
          stroke={open ? "#c8824a" : "#a08878"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: -4, right: -4,
            background: "#e06050", color: "#fff",
            borderRadius: 10, fontSize: 10, fontWeight: 700,
            padding: "1px 6px", minWidth: 16, textAlign: "center",
            border: "2px solid #faf6f0",
            fontFamily: "'Lato', sans-serif",
          }}>{unreadCount > 99 ? "99+" : unreadCount}</span>
        )}

        {/* SignalR status dot */}
        <div style={{
          position: "absolute", bottom: 4, right: 4,
          width: 7, height: 7, borderRadius: "50%",
          background: statusColor,
          border: "1.5px solid #faf6f0",
        }} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 10px)", right: 0,
          width: 340, background: "#fff",
          border: "1px solid #e8ddd0", borderRadius: 20,
          boxShadow: "0 12px 40px rgba(58,46,38,0.16)",
          zIndex: 500, overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px 12px", borderBottom: "1px solid #f0e8e0" }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16, color: "#3a2e26" }}>
              Notifications
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor }} />
                <span style={{ fontSize: 11, color: "#a08878", fontFamily: "'Lato', sans-serif", textTransform: "capitalize" }}>
                  {signalRStatus}
                </span>
              </div>
              {notifications.length > 0 && (
                <button onClick={onMarkAllRead} style={{ background: "none", border: "none", color: "#c8824a", fontSize: 12, cursor: "pointer", fontFamily: "'Lato', sans-serif", fontWeight: 600 }}>
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: 380, overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#a08878" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>🔔</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontStyle: "italic" }}>
                  No notifications yet
                </div>
                <div style={{ fontSize: 12, marginTop: 6, fontFamily: "'Lato', sans-serif" }}>
                  We'll let you know when something happens
                </div>
              </div>
            ) : (
              notifications.map((n, i) => {
                const c = cfg(n.type);
                return (
                  <div key={n.id || i} style={{
                    display: "flex", gap: 12, padding: "13px 18px",
                    borderBottom: i < notifications.length - 1 ? "1px solid #f8f0e8" : "none",
                    background: n.isRead ? "#fff" : "#fdf8f4",
                    transition: "background 0.2s",
                    cursor: "pointer",
                  }}>
                    <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{c.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: "#3a2e26", fontFamily: "'Lato', sans-serif", lineHeight: 1.4 }}>
                        <strong>{n.actorName || "Someone"}</strong>{" "}
                        <span style={{ color: "#5a4a40" }}>{n.message || c.label}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "#b0a090", marginTop: 3, fontFamily: "'Lato', sans-serif" }}>
                        {n.time || "just now"}
                      </div>
                    </div>
                    {!n.isRead && (
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.color, flexShrink: 0, marginTop: 6 }} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── useNotifications hook ─────────────────────────────────────────────────────
// Usage: const { toasts, notifications, unreadCount, addNotification, dismissToast, markAllRead } = useNotifications();
export function useNotifications(token, api) {
  const [toasts, setToasts]             = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]   = useState(0);
  const [signalRStatus, setSignalRStatus] = useState("disconnected");

  // Load existing notifications from API on mount
  useEffect(() => {
    if (!token) return;
    api.getNotifications(token)
      .then(data => {
        if (Array.isArray(data)) {
          const mapped = data.map(n => ({
            ...n,
            actorName: n.actor?.displayName || n.actor?.userName || "Someone",
            time: n.createdAt ? timeAgo(n.createdAt) : "",
          }));
          setNotifications(mapped);
          setUnreadCount(mapped.filter(n => !n.isRead).length);
        }
      })
      .catch(() => {});

    api.getUnreadCount(token)
      .then(data => { if (typeof data?.count === "number") setUnreadCount(data.count); })
      .catch(() => {});
  }, [token]);

  // Add a new real-time notification (called by SignalR handler)
  const addNotification = (payload) => {
    const n = {
      id: Date.now(),
      type: payload.type || "System",
      actorName: payload.actor || "Someone",
      message: payload.message || "",
      time: "just now",
      isRead: false,
    };
    // Add to toast queue
    setToasts(ts => [...ts, n]);
    // Add to notification list
    setNotifications(prev => [n, ...prev]);
    // Increment badge
    setUnreadCount(c => c + 1);
  };

  const dismissToast = (id) => setToasts(ts => ts.filter(t => t.id !== id));

  const markAllRead = () => {
    setNotifications(ns => ns.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
    if (token) api.getUnreadCount && fetch("/api/notifications/mark-all-read", {
      method: "PUT", headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  };

  return { toasts, notifications, unreadCount, signalRStatus, setSignalRStatus, addNotification, dismissToast, markAllRead };
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  return Math.floor(diff / 86400) + "d ago";
}
