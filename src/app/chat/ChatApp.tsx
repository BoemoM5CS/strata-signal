"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Send, Search, LogOut, MessageCircle, ArrowLeft, MoreVertical } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  last_seen?: string;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  sender_name?: string;
}

function avatarColor(name: string) {
  const colors = ["#1e3a5f","#1e3d2f","#3d1e2f","#2f2a1e","#1e2f3d","#3a1e3d","#1e3a2f","#2f1e3a"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ChatApp({ currentUserId, currentUserName, currentUserEmail }: {
  currentUserId: string;
  currentUserName: string;
  currentUserEmail: string;
}) {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeUser, setActiveUser] = useState<Profile | null>(null);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const supabase = createClient();

  // Load all other users from profiles table
  const loadProfiles = useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, last_seen")
      .neq("id", currentUserId);
    if (!error && data) setProfiles(data);
  }, [currentUserId, supabase]);

  // Load messages between current user and active user
  const loadMessages = useCallback(async (otherId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${currentUserId})`)
      .order("created_at", { ascending: true });
    if (!error && data) setMessages(data);
  }, [currentUserId, supabase]);

  // Upsert current user profile
  useEffect(() => {
    supabase.from("profiles").upsert({
      id: currentUserId,
      full_name: currentUserName,
      email: currentUserEmail,
      last_seen: new Date().toISOString(),
    }, { onConflict: "id" }).then(() => loadProfiles());
  }, [currentUserId, currentUserName, currentUserEmail, supabase, loadProfiles]);

  // Subscribe to new messages in real-time
  useEffect(() => {
    if (!activeUser) return;
    loadMessages(activeUser.id);

    const channel = supabase
      .channel(`chat_${[currentUserId, activeUser.id].sort().join("_")}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `receiver_id=eq.${currentUserId}`,
      }, (payload) => {
        const msg = payload.new as Message;
        if (msg.sender_id === activeUser.id) {
          setMessages(prev => [...prev, msg]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeUser, currentUserId, supabase, loadMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectUser = (p: Profile) => {
    setActiveUser(p);
    setMobileChatOpen(true);
    loadMessages(p.id);
  };

  const sendMessage = async () => {
    if (!text.trim() || !activeUser || sending) return;
    const content = text.trim();
    setText("");
    setSending(true);

    // Optimistic update
    const optimistic: Message = {
      id: `tmp_${Date.now()}`,
      sender_id: currentUserId,
      receiver_id: activeUser.id,
      content,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);

    const { data, error } = await supabase.from("messages").insert({
      sender_id: currentUserId,
      receiver_id: activeUser.id,
      content,
    }).select().single();

    if (!error && data) {
      setMessages(prev => prev.map(m => m.id === optimistic.id ? data : m));
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth"); router.refresh();
  };

  // Group messages by date
  const groupedMessages: Array<{ date: string; msgs: Message[] }> = [];
  messages.forEach(msg => {
    const d = fmtDate(msg.created_at);
    const last = groupedMessages[groupedMessages.length - 1];
    if (last?.date === d) last.msgs.push(msg);
    else groupedMessages.push({ date: d, msgs: [msg] });
  });

  const filtered = profiles.filter(p =>
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={`app-shell`}>
      {/* ── SIDEBAR ── */}
      <div className={`sidebar ${mobileChatOpen ? "" : "open"}`}>
        <div className="sidebar-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: "var(--accent)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MessageCircle size={16} color="#fff" strokeWidth={2.5} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>Strata Signal</span>
          </div>
          <button onClick={handleLogout} className="ss-btn-ghost" style={{ padding: "6px 10px", fontSize: 13 }}>
            <LogOut size={14} /> Log out
          </button>
        </div>

        {/* Current user pill */}
        <div style={{ padding: "10px 14px 6px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="avatar" style={{ width: 32, height: 32, fontSize: 12, background: avatarColor(currentUserName) }}>
              {initials(currentUserName)}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{currentUserName}</div>
              <div style={{ fontSize: 11, color: "var(--text3)" }}>You</div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="search-bar">
          <div style={{ position: "relative" }}>
            <Search size={13} color="var(--text3)" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            <input className="search-input" placeholder="Search people…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {/* User list */}
        <div className="user-list">
          {filtered.length === 0 ? (
            <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--text3)", fontSize: 13 }}>
              {profiles.length === 0 ? "No other users yet" : "No results"}
            </div>
          ) : filtered.map(p => (
            <div key={p.id} className={`user-item ${activeUser?.id === p.id ? "active" : ""}`} onClick={() => selectUser(p)}>
              <div className="avatar avatar-online" style={{ background: avatarColor(p.full_name) }}>
                {initials(p.full_name)}
              </div>
              <div className="user-info">
                <div className="user-name">{p.full_name}</div>
                <div className="user-preview">{p.email}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CHAT PANEL ── */}
      <div className="chat-panel" style={{ display: mobileChatOpen || !activeUser ? "flex" : undefined }}>
        {!activeUser ? (
          /* Empty state */
          <div className="empty-chat">
            <div style={{ width: 64, height: 64, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MessageCircle size={28} color="var(--text3)" strokeWidth={1.5} />
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text2)", marginBottom: 4 }}>Select a conversation</div>
              <div style={{ fontSize: 13, color: "var(--text3)" }}>Choose someone from the sidebar to start messaging</div>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="chat-header">
              <button onClick={() => setMobileChatOpen(false)} className="ss-btn-ghost" style={{ padding: "6px 8px", display: "none" }} id="back-btn">
                <ArrowLeft size={16} />
              </button>
              <div className="avatar avatar-online" style={{ background: avatarColor(activeUser.full_name) }}>
                {initials(activeUser.full_name)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text)" }}>{activeUser.full_name}</div>
                <div style={{ fontSize: 12, color: "var(--green)" }}>Online</div>
              </div>
              <button className="ss-btn-ghost" style={{ padding: "6px 8px" }}>
                <MoreVertical size={16} />
              </button>
            </div>

            {/* Messages */}
            <div className="messages-area">
              {groupedMessages.map(group => (
                <div key={group.date}>
                  <div className="date-divider">{group.date}</div>
                  {group.msgs.map((msg, i) => {
                    const mine = msg.sender_id === currentUserId;
                    const showAvatar = !mine && (i === 0 || group.msgs[i - 1]?.sender_id !== msg.sender_id);
                    return (
                      <div key={msg.id} className={`msg-row ${mine ? "mine" : ""} msg-in`} style={{ marginBottom: 2, alignItems: "flex-end" }}>
                        {!mine && (
                          <div className="avatar" style={{ width: 28, height: 28, fontSize: 10, flexShrink: 0, background: showAvatar ? avatarColor(activeUser.full_name) : "transparent", opacity: showAvatar ? 1 : 0 }}>
                            {showAvatar ? initials(activeUser.full_name) : ""}
                          </div>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", gap: 2 }}>
                          <div className={`msg-bubble ${mine ? "mine" : "theirs"}`}>{msg.content}</div>
                          <div className="msg-time">{fmtTime(msg.created_at)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            <div className="input-bar">
              <textarea
                ref={inputRef}
                className="msg-input"
                placeholder={`Message ${activeUser.full_name}…`}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button className="send-btn" onClick={sendMessage} disabled={!text.trim() || sending}>
                <Send size={16} color="#fff" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Mobile: show back button via CSS */}
      <style>{`
        @media (max-width: 700px) {
          .sidebar { display: ${mobileChatOpen ? "none" : "flex"} !important; width: 100% !important; }
          .chat-panel { display: ${mobileChatOpen ? "flex" : "none"} !important; }
          #back-btn { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
