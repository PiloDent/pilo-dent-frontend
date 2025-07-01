// src/components/Staff/StaffChat.jsx
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/supabaseClient";
import { useSessionContext } from "../../context/SessionContext.jsx";
import { useTranslation } from "react-i18next";

export default function StaffChat() {
  const { t } = useTranslation();
  const { session } = useSessionContext();
  const userId = session.user.id;

  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [creating, setCreating] = useState(false);
  const [newThreadName, setNewThreadName] = useState("");
  const bottomRef = useRef();

  // Load threads once
  const fetchThreads = async () => {
    const { data } = await supabase
      .from("chat_threads")
      .select("*")
      .order("created_at", { ascending: true });
    setThreads(data || []);
  };

  useEffect(() => {
    fetchThreads();
  }, []);

  // Create a new thread
  const createThread = async () => {
    if (!newThreadName.trim()) return;
    const { data, error } = await supabase
      .from("chat_threads")
      .insert({ name: newThreadName.trim(), created_by: userId })
      .single();
    if (!error && data) {
      setNewThreadName("");
      setCreating(false);
      fetchThreads();
      setActiveThread(data);
    }
  };

  // When the active thread changes: load its messages + subscribe
  useEffect(() => {
    if (!activeThread) {
      setMessages([]);
      return;
    }

    // fetch history
    supabase
      .from("chat_messages")
      .select(
        `
        id,
        content,
        sender_id,
        created_at,
        sender:profiles ( first_name, last_name )
      `
      )
      .eq("thread_id", activeThread.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMessages(data || []));

    // subscribe to new ones
    const sub = supabase
      .from(`chat_messages:thread_id=eq.${activeThread.id}`)
      .on("INSERT", (payload) => {
        setMessages((m) => [...m, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeSubscription(sub);
    };
  }, [activeThread]);

  // Auto-scroll when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send a new message
  const sendMessage = async () => {
    if (!newMsg.trim() || !activeThread) return;
    await supabase.from("chat_messages").insert({
      thread_id: activeThread.id,
      sender_id: userId,
      content: newMsg.trim(),
    });
    setNewMsg("");
  };

  return (
    <div className="flex h-full bg-white shadow rounded overflow-hidden">
      {/* Threads list */}
      <aside className="w-1/4 border-r overflow-y-auto flex flex-col">
        <div className="p-4 border-b flex items-center space-x-2">
          {creating ? (
            <>
              <input
                className="flex-1 border p-1 rounded"
                placeholder={t("staff_chat.new_thread_placeholder")}
                value={newThreadName}
                onChange={(e) => setNewThreadName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createThread()}
              />
              <button
                onClick={createThread}
                className="px-2 py-1 bg-green-600 text-white rounded"
              >
                {t("staff_chat.create")}
              </button>
              <button
                onClick={() => {
                  setCreating(false);
                  setNewThreadName("");
                }}
                className="px-2 py-1 bg-gray-300 rounded"
              >
                {t("staff_chat.cancel")}
              </button>
            </>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="w-full text-left px-2 py-1 bg-blue-100 rounded hover:bg-blue-200"
            >
              {t("staff_chat.new_thread_button")}
            </button>
          )}
        </div>
        <div className="flex-1">
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveThread(t)}
              className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${
                activeThread?.id === t.id ? "bg-gray-200" : ""
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </aside>

      {/* Chat window */}
      <section className="flex-1 flex flex-col">
        <header className="p-4 border-b font-semibold">
          {activeThread?.name || t("staff_chat.select_thread")}
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m) => {
            const isMe = m.sender_id === userId;
            const name = m.sender?.first_name
              ? `${m.sender.first_name} ${m.sender.last_name}`
              : t("staff_chat.unknown");
            return (
              <div
                key={m.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg ${
                    isMe
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-800"
                  }`}
                >
                  {!isMe && (
                    <div className="text-sm font-medium mb-1">{name}</div>
                  )}
                  <div className="whitespace-pre-wrap">{m.content}</div>
                  <div className="text-xs text-gray-500 text-right mt-1">
                    {new Date(m.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <footer className="p-4 border-t flex items-center space-x-2">
          <input
            type="text"
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder={t("staff_chat.type_message")}
            className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring"
            disabled={!activeThread}
          />
          <button
            onClick={sendMessage}
            disabled={!activeThread}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {t("staff_chat.send")}
          </button>
        </footer>
      </section>
    </div>
  );
}
