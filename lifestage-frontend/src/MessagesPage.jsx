// src/MessagesPage.jsx
// Azure Communication Services Chat + AI Chat (Sage)

import { useState, useEffect, useRef, useCallback } from "react";
import { ChatClient } from "@azure/communication-chat";
import { AzureCommunicationTokenCredential } from "@azure/communication-common";
import { api } from "./api";
import { colorForUser } from "./PostCard.jsx";

const AI_THREAD_ID = "__ai__";

// ── Helpers ───────────────────────────────────────────────────────────────────
function msgTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const diff = Math.floor((Date.now() - d) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

// ── ContactItem ───────────────────────────────────────────────────────────────
function ContactItem({ name, avatarUrl, active, onClick, lastMsg, isAi }) {
  const [hover, setHover] = useState(false);
  const initials = name ? name.slice(0, 2).toUpperCase() : "??";
  const avatarBg = isAi
    ? "linear-gradient(135deg, #7a6aec, #b07ae8)"
    : `linear-gradient(135deg, ${colorForUser(name)}dd, ${colorForUser(name)}88)`;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "11px 14px", cursor: "pointer",
        background: active ? "#fdf0e6" : hover ? "#fdf8f3" : "none",
        borderLeft: active ? "3px solid #c8824a" : "3px solid transparent",
        transition: "all 0.15s",
      }}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
      ) : (
        <div style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, background: avatarBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: isAi ? 18 : 14, fontWeight: 700, color: "#fff" }}>
          {isAi ? "🤖" : initials}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: 14, color: active ? "#c8824a" : "#3a2e26", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {name}
          </div>
          {isAi && (
            <span style={{ fontSize: 9, background: "linear-gradient(135deg, #7a6aec, #b07ae8)", color: "#fff", borderRadius: 6, padding: "1px 5px", fontFamily: "'Lato', sans-serif", fontWeight: 700, flexShrink: 0 }}>AI</span>
          )}
        </div>
        {lastMsg && (
          <div style={{ fontSize: 12, color: "#a08878", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "'Lato', sans-serif" }}>
            {lastMsg}
          </div>
        )}
      </div>
    </div>
  );
}

// ── MessageBubble ─────────────────────────────────────────────────────────────
function MessageBubble({ msg, isMe, isAi }) {
  const aiBubble = !isMe && isAi;
  return (
    <div style={{ display: "flex", flexDirection: isMe ? "row-reverse" : "row", alignItems: "flex-end", gap: 8, marginBottom: 10 }}>
      {aiBubble && (
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #7a6aec, #b07ae8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, marginBottom: 2 }}>
          🤖
        </div>
      )}
      <div style={{
        maxWidth: "72%",
        background: isMe
          ? "linear-gradient(135deg, #c8824a, #e8a870)"
          : aiBubble ? "linear-gradient(135deg, #f0eeff, #e8e0ff)" : "#fff",
        color: isMe ? "#fff" : "#3a2e26",
        borderRadius: isMe ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
        padding: "10px 14px",
        boxShadow: "0 2px 8px rgba(58,46,38,0.10)",
        border: isMe ? "none" : aiBubble ? "1px solid #d8d0f8" : "1px solid #e8ddd0",
      }}>
        <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {msg.content}
        </div>
        <div style={{ fontSize: 10, marginTop: 4, color: isMe ? "rgba(255,255,255,0.7)" : "#b0a090", textAlign: isMe ? "right" : "left", fontFamily: "'Lato', sans-serif" }}>
          {msg.createdOn ? msgTime(msg.createdOn) : "just now"}
        </div>
      </div>
    </div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 10 }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #7a6aec, #b07ae8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>🤖</div>
      <div style={{ background: "linear-gradient(135deg, #f0eeff, #e8e0ff)", border: "1px solid #d8d0f8", borderRadius: "20px 20px 20px 4px", padding: "12px 16px", display: "flex", gap: 4, alignItems: "center" }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#9080e0", animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
        ))}
      </div>
      <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }`}</style>
    </div>
  );
}

// ── Main MessagesPage ─────────────────────────────────────────────────────────
export default function MessagesPage({ token, currentUser }) {
  const [acsInfo, setAcsInfo]             = useState(null);
  const [chatClient, setChatClient]       = useState(null);
  const [threads, setThreads]             = useState([]);
  const [activeThread, setActiveThread]   = useState(null);   // {threadId, name, isAi}
  const [messages, setMessages]           = useState([]);
  const [aiHistoryLoading, setAiHistoryLoading] = useState(false);
  const [newMsg, setNewMsg]               = useState("");
  const [searchQ, setSearchQ]             = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching]         = useState(false);
  const [loadingAcs, setLoadingAcs]       = useState(true);
  const [loadingMsgs, setLoadingMsgs]     = useState(false);
  const [sending, setSending]             = useState(false);
  const [aiTyping, setAiTyping]           = useState(false);
  const [acsError, setAcsError]           = useState(null);
  const threadClientRef = useRef(null);
  const messagesEndRef  = useRef(null);
  const searchTimer     = useRef(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isMobile = windowWidth < 768;

  // ── Initialize ACS ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    let client = null;
    (async () => {
      try {
        const info = await api.getAcsToken(token);
        if (!info?.acsUserId) throw new Error("Failed to get ACS token");
        setAcsInfo(info);

        const credential = new AzureCommunicationTokenCredential(info.token);
        client = new ChatClient(info.endpoint, credential);
        setChatClient(client);

        const threadList = [];
        for await (const t of client.listChatThreads()) {
          threadList.push({ threadId: t.id, topic: t.topic, lastMsg: "", deletedOn: t.deletedOn });
          if (threadList.length >= 20) break;
        }
        setThreads(threadList.filter(t => !t.deletedOn));

        await client.startRealtimeNotifications();
        client.on("chatMessageReceived", (e) => {
          const newMessage = { id: e.id, content: e.message?.content || "", senderAcsId: e.sender?.communicationUserId || "", createdOn: e.createdOn };
          setActiveThread(active => {
            if (active?.threadId === e.threadId) setMessages(prev => [...prev, newMessage]);
            return active;
          });
          setThreads(prev => prev.map(t => t.threadId === e.threadId ? { ...t, lastMsg: e.message?.content || "" } : t));
        });
      } catch (err) {
        setAcsError(err.message || "Could not connect to messaging service");
      } finally {
        setLoadingAcs(false);
      }
    })();
    return () => { client?.stopRealtimeNotifications?.().catch(() => {}); };
  }, [token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiTyping]);

  // ── Open ACS thread ────────────────────────────────────────────────────────
  const openThread = useCallback(async (threadId, name) => {
    if (!chatClient) return;
    threadClientRef.current = null;
    setActiveThread({ threadId, name, isAi: false });
    setMessages([]);
    setLoadingMsgs(true);
    try {
      const tc = chatClient.getChatThreadClient(threadId);
      threadClientRef.current = tc;
      const msgs = [];
      for await (const m of tc.listMessages({ maxPageSize: 50 })) {
        if (m.type === "text") msgs.unshift({ id: m.id, content: m.content?.message || "", senderAcsId: m.sender?.communicationUserId || "", createdOn: m.createdOn });
      }
      setMessages(msgs);
    } catch { setMessages([]); }
    finally { setLoadingMsgs(false); }
  }, [chatClient]);

  // ── Open AI chat — load history from DB ───────────────────────────────────
  const openAiChat = async () => {
    threadClientRef.current = null;
    setActiveThread({ threadId: AI_THREAD_ID, name: "Sage — AI Companion", isAi: true });
    setMessages([]);
    setNewMsg("");
    setAiHistoryLoading(true);
    try {
      const history = await api.getAiChatHistory(token);
      if (Array.isArray(history)) {
        setMessages(history.map(h => ({
          id: h.id,
          content: h.content,
          isUser: h.role === "user",
          createdOn: h.createdAt,
        })));
      }
    } catch { /* show empty if history fails */ }
    finally { setAiHistoryLoading(false); }
  };

  // ── Start chat with a found user ───────────────────────────────────────────
  const startChatWith = async (participant) => {
    if (!chatClient || !acsInfo) return;
    setSearchQ("");
    setSearchResults([]);
    try {
      const { chatThread } = await chatClient.createChatThread(
        { topic: `${acsInfo.displayName} & ${participant.displayName}` },
        { participants: [{ id: { communicationUserId: participant.acsUserId }, displayName: participant.displayName }] }
      );
      const threadId = chatThread.id;
      setThreads(prev => [{ threadId, topic: participant.displayName, lastMsg: "" }, ...prev.filter(t => t.threadId !== threadId)]);
      await openThread(threadId, participant.displayName);
    } catch (err) { console.error("[ACS] createChatThread failed:", err); }
  };

  // ── Send ACS message ───────────────────────────────────────────────────────
  const sendAcsMessage = async (content) => {
    if (!threadClientRef.current || sending) return;
    setSending(true);
    const optimistic = { id: "tmp-" + Date.now(), content, senderAcsId: acsInfo?.acsUserId || "", createdOn: new Date().toISOString() };
    setMessages(prev => [...prev, optimistic]);
    setNewMsg("");
    try {
      const result = await threadClientRef.current.sendMessage({ content }, { senderDisplayName: acsInfo?.displayName || currentUser?.displayName || "" });
      setMessages(prev => prev.map(m => m.id === optimistic.id ? { ...m, id: result.id } : m));
      setThreads(prev => prev.map(t => t.threadId === activeThread?.threadId ? { ...t, lastMsg: content } : t));
    } catch { setMessages(prev => prev.filter(m => m.id !== optimistic.id)); }
    finally { setSending(false); }
  };

  // ── Send AI message ────────────────────────────────────────────────────────
  const sendAiMessage = async (content) => {
    if (sending || aiTyping) return;
    const userMsg = { id: "u-" + Date.now(), content, isUser: true, createdOn: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setNewMsg("");
    setAiTyping(true);
    try {
      const res = await api.aiChat(token, content);
      const reply = res?.reply || "I'm not sure how to respond to that. Try again?";
      setMessages(prev => [...prev, { id: "ai-" + Date.now(), content: reply, isUser: false, createdOn: new Date().toISOString() }]);
    } catch {
      setMessages(prev => [...prev, { id: "err-" + Date.now(), content: "Sorry, I'm having trouble connecting right now. Please try again.", isUser: false, createdOn: new Date().toISOString() }]);
    } finally {
      setAiTyping(false);
    }
  };

  // ── Unified send ───────────────────────────────────────────────────────────
  const sendMessage = () => {
    const content = newMsg.trim();
    if (!content) return;
    if (activeThread?.isAi) sendAiMessage(content);
    else sendAcsMessage(content);
  };

  // ── User search ─────────────────────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (!searchQ.trim()) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await api.searchParticipants(token, searchQ);
        setSearchResults(Array.isArray(results) ? results : []);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 350);
  }, [searchQ, token]);

  // ── Render ─────────────────────────────────────────────────────────────────
  const containerStyle = {
    display: "flex", height: isMobile ? "calc(100vh - 130px)" : "calc(100vh - 170px)", minHeight: isMobile ? 400 : 500,
    background: "#fff", border: isMobile ? "none" : "1px solid #e8ddd0", borderRadius: isMobile ? 16 : 24,
    overflow: "hidden", boxShadow: isMobile ? "none" : "0 4px 20px rgba(58,46,38,0.08)",
  };

  if (loadingAcs) return (
    <div style={containerStyle}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#a08878", fontFamily: "'Playfair Display', serif", fontStyle: "italic" }}>
        <div style={{ textAlign: "center" }}><div style={{ fontSize: 32, marginBottom: 12 }}>💬</div>Connecting to messages...</div>
      </div>
    </div>
  );

  const isAiActive = activeThread?.threadId === AI_THREAD_ID;

  return (
    <div style={containerStyle}>
      {/* ── Left panel ──────────────────────────────────────────── */}
      <div style={{ width: isMobile ? "100%" : 250, flexShrink: 0, borderRight: isMobile ? "none" : "1px solid #f0e8e0", display: isMobile && activeThread ? "none" : "flex", flexDirection: "column" }}>
        {/* Header + search */}
        <div style={{ padding: "18px 16px 12px", borderBottom: "1px solid #f0e8e0" }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 17, color: "#3a2e26", marginBottom: 12 }}>Messages</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#faf6f0", border: "1px solid #e8ddd0", borderRadius: 20, padding: "7px 12px" }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#b0957a" strokeWidth={2} strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Find someone..."
              style={{ background: "none", border: "none", outline: "none", color: "#3a2e26", fontSize: 13, fontFamily: "'Lato', sans-serif", flex: 1 }} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* AI Companion — always pinned at top when not searching */}
          {!searchQ.trim() && (
            <ContactItem
              name="Sage — AI Companion"
              isAi={true}
              active={isAiActive}
              lastMsg="Your AI friend, always here"
              onClick={openAiChat}
            />
          )}

          {searchQ.trim() ? (
            searching ? (
              <div style={{ padding: "20px 16px", color: "#a08878", fontSize: 13, fontFamily: "'Lato', sans-serif", textAlign: "center" }}>Searching...</div>
            ) : searchResults.length === 0 ? (
              <div style={{ padding: "20px 16px", color: "#a08878", fontSize: 13, fontFamily: "'Lato', sans-serif", textAlign: "center" }}>No users found</div>
            ) : (
              searchResults.map(u => (
                <ContactItem key={u.id} name={u.displayName} avatarUrl={u.avatarUrl} active={false} onClick={() => startChatWith(u)} />
              ))
            )
          ) : (
            <>
              {threads.length > 0 && (
                <div style={{ padding: "8px 14px 4px", fontSize: 11, color: "#b0a090", fontFamily: "'Lato', sans-serif", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>
                  Conversations
                </div>
              )}
              {threads.length === 0 && !searchQ && (
                <div style={{ padding: "16px 16px 8px", textAlign: "center", color: "#a08878", fontFamily: "'Lato', sans-serif", fontSize: 12 }}>
                  Search to find someone to chat with
                </div>
              )}
              {threads.map(t => (
                <ContactItem key={t.threadId} name={t.topic || "Chat"} active={activeThread?.threadId === t.threadId} lastMsg={t.lastMsg} onClick={() => openThread(t.threadId, t.topic || "Chat")} />
              ))}
            </>
          )}
        </div>
      </div>

      {/* ── Right: Chat area ─────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, display: isMobile && !activeThread ? "none" : "flex", flexDirection: "column" }}>
        {!activeThread ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#a08878" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 14 }}>💬</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 18, color: "#3a2e26", marginBottom: 6 }}>Start a conversation</div>
              <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 13 }}>Chat with Sage (AI) or search for a friend</div>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #f0e8e0", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              {isMobile && (
                <button onClick={() => setActiveThread(null)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#a08878", padding: "4px 6px 4px 0", display: "flex", alignItems: "center", flexShrink: 0 }}>
                  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
              )}
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: isAiActive ? "linear-gradient(135deg, #7a6aec, #b07ae8)" : "linear-gradient(135deg, #c8824a, #e8a870)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: isAiActive ? 18 : 13, fontWeight: 700, color: "#fff" }}>
                {isAiActive ? "🤖" : (activeThread.name || "?").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16, color: "#3a2e26" }}>{activeThread.name}</div>
                {isAiActive && <div style={{ fontSize: 11, color: "#a08878", fontFamily: "'Lato', sans-serif" }}>Powered by Azure OpenAI · Always available</div>}
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column" }}>
              {isAiActive && aiHistoryLoading && (
                <div style={{ textAlign: "center", color: "#a08878", fontFamily: "'Lato', sans-serif", fontSize: 13, padding: 40 }}>
                  Loading your conversation...
                </div>
              )}
              {isAiActive && !aiHistoryLoading && messages.length === 0 && (
                <div style={{ textAlign: "center", padding: "30px 20px" }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>🤖</div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16, color: "#3a2e26", marginBottom: 6 }}>Hi, I'm Sage!</div>
                  <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 13, color: "#a08878", lineHeight: 1.6 }}>
                    Your AI companion on LifeStage. I'm here for a friendly chat, life advice, or just to listen. What's on your mind?
                  </div>
                </div>
              )}
              {!isAiActive && loadingMsgs ? (
                <div style={{ textAlign: "center", color: "#a08878", fontFamily: "'Playfair Display', serif", fontStyle: "italic", padding: 40 }}>Loading messages...</div>
              ) : !isAiActive && messages.length === 0 ? (
                <div style={{ textAlign: "center", color: "#a08878", fontFamily: "'Playfair Display', serif", fontStyle: "italic", padding: 40 }}>No messages yet. Say hello!</div>
              ) : null}
              {messages.map(m => (
                <MessageBubble
                  key={m.id}
                  msg={m}
                  isMe={isAiActive ? m.isUser : m.senderAcsId === acsInfo?.acsUserId}
                  isAi={isAiActive && !m.isUser}
                />
              ))}
              {aiTyping && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: "12px 16px", borderTop: "1px solid #f0e8e0", display: "flex", gap: 10, alignItems: "flex-end", flexShrink: 0 }}>
              <textarea
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={isAiActive ? "Ask Sage anything..." : "Write a message..."}
                rows={1}
                style={{
                  flex: 1, resize: "none", border: `1px solid ${isAiActive ? "#d8d0f8" : "#e8ddd0"}`,
                  borderRadius: 20, padding: "10px 16px",
                  fontFamily: "'Lato', sans-serif", fontSize: 14,
                  color: "#3a2e26", background: isAiActive ? "#f8f6ff" : "#faf6f0",
                  outline: "none", lineHeight: 1.5, maxHeight: 120, overflowY: "auto",
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!newMsg.trim() || sending || aiTyping}
                style={{
                  background: newMsg.trim()
                    ? isAiActive ? "linear-gradient(135deg, #7a6aec, #b07ae8)" : "linear-gradient(135deg, #c8824a, #e8a870)"
                    : "#e8ddd0",
                  border: "none", borderRadius: "50%",
                  width: 42, height: 42, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: newMsg.trim() ? "pointer" : "default",
                  transition: "all 0.2s",
                  boxShadow: newMsg.trim() ? "0 4px 14px rgba(120,100,230,0.35)" : "none",
                }}
              >
                {aiTyping ? (
                  <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.4)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                ) : (
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={newMsg.trim() ? "#fff" : "#a08878"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                )}
              </button>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </>
        )}
      </div>
    </div>
  );
}
