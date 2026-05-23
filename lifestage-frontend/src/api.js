// src/api.js
const BASE_URL = (import.meta.env.VITE_API_URL ?? "") + "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, options);
  if (res.status === 204) return null;
  if (res.status === 401) {
    localStorage.removeItem("ls_token");
    localStorage.removeItem("ls_user");
    window.location.reload();
    return null;
  }
  const data = await res.json().catch(() => ({}));
  return data;
}

function authHeaders(token) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export const api = {
  // ── Auth ───────────────────────────────────────────────────────────────────
  register: (form) =>
    request("/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }),

  login: (email, password) =>
    request("/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) }),

  resendConfirmation: (email) =>
    request("/auth/resend-confirmation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }),

  forgotPassword: (email) =>
    request("/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }),

  resetPassword: (userId, token, newPassword) =>
    request("/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, token, newPassword }) }),

  // ── Posts ──────────────────────────────────────────────────────────────────
  getFeed: (token, page = 1, pageSize = 20) =>
    request(`/posts/feed?page=${page}&pageSize=${pageSize}`, { headers: authHeaders(token) }),

  createPost: (token, content, imageUrl = null, audioUrl = null, videoUrl = null) =>
    request("/posts", { method: "POST", headers: authHeaders(token), body: JSON.stringify({ content, imageUrl, audioUrl, videoUrl }) }),

  likePost: (token, postId) =>
    request(`/posts/${postId}/like`, { method: "POST", headers: authHeaders(token) }),

  editPost: (token, postId, content, imageUrl = null, audioUrl = null, videoUrl = null) =>
    request(`/posts/${postId}`, { method: "PUT", headers: authHeaders(token), body: JSON.stringify({ content, imageUrl, audioUrl, videoUrl }) }),

  repostPost: (token, postId) =>
    request(`/posts/${postId}/repost`, { method: "POST", headers: authHeaders(token) }),

  getUserPosts: (token, username, page = 1) =>
    request(`/posts/user/${username}?page=${page}`, { headers: authHeaders(token) }),

  // ── Comments ───────────────────────────────────────────────────────────────
  getComments: (token, postId) =>
    request(`/posts/${postId}/comments`, { headers: authHeaders(token) }),

  addComment: (token, postId, content) =>
    request(`/posts/${postId}/comments`, { method: "POST", headers: authHeaders(token), body: JSON.stringify({ content }) }),

  // ── Users ──────────────────────────────────────────────────────────────────
  getMe: (token) =>
    request("/users/me", { headers: authHeaders(token) }),

  updateMe: (token, form) =>
    request("/users/me", { method: "PUT", headers: authHeaders(token), body: JSON.stringify(form) }),

  getProfile: (token, username) =>
    request(`/users/${username}`, { headers: authHeaders(token) }),

  followUser: (token, username) =>
    request(`/users/${username}/follow`, { method: "POST", headers: authHeaders(token) }),

  searchUsers: (token, q) =>
    request(`/users/search?q=${encodeURIComponent(q)}`, { headers: authHeaders(token) }),

  // ── Upload ─────────────────────────────────────────────────────────────────
  uploadImage: async (token, file, container = "posts") => {
    const form = new FormData();
    form.append("file", file);
    const res  = await fetch(`${BASE_URL}/upload?container=${container}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    return res.json();
  },

  uploadAudio: async (token, file) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE_URL}/upload/audio`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    return res.json();
  },

  getVideoSasUrl: async (token, ext = '.mp4') => {
    const res = await fetch(`${BASE_URL}/upload/video/sas?ext=${encodeURIComponent(ext)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  uploadVideoToBlob: (sasUrl, file, onProgress) =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', sasUrl);
      xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob');
      xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status === 201 || xhr.status === 200) resolve();
        else reject(new Error(`Upload failed: ${xhr.status}`));
      };
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(file);
    }),

  uploadAvatar: async (token, file) => {
    const form = new FormData();
    form.append("file", file);
    const res  = await fetch(`${BASE_URL}/upload/avatar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    return res.json();
  },

  // ── Notifications ──────────────────────────────────────────────────────────
  getNotifications: (token, page = 1) =>
    request(`/notifications?page=${page}`, { headers: authHeaders(token) }),

  getUnreadCount: (token) =>
    request("/notifications/unread-count", { headers: authHeaders(token) }),

  markAllRead: (token) =>
    request("/notifications/mark-all-read", { method: "PUT", headers: authHeaders(token) }),

  // ── Trending ───────────────────────────────────────────────────────────────
  getTrending: () =>
    request("/posts/trending"),

  // ── Messages (ACS) ─────────────────────────────────────────────────────────
  getAcsToken: (token) =>
    request("/messages/token", { method: "POST", headers: authHeaders(token) }),

  searchParticipants: (token, q) =>
    request(`/messages/participants?q=${encodeURIComponent(q)}`, { headers: authHeaders(token) }),

  aiChat: (token, userMessage) =>
    request("/messages/ai-chat", { method: "POST", headers: authHeaders(token), body: JSON.stringify({ userMessage }) }),

  getAiChatHistory: (token) =>
    request("/messages/ai-chat/history", { headers: authHeaders(token) }),
};
