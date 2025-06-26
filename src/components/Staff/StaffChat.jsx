// src/components/Staff/StaffChat.jsx
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { useSessionContext } from '../../context/SessionContext';

export default function StaffChat() {
  const { session } = useSessionContext();
  const userId = session.user.id;
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const bottomRef = useRef();

  // Load all threads on mount
  useEffect(() => {
    supabase
      .from('chat_threads')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!error) setThreads(data || []);
      });
  }, []);

  // When activeThread changes, fetch its messages and subscribe
  useEffect(() => {
    if (!activeThread) return;

    // fetch existing
    supabase
      .from('chat_messages')
      .select(`
        id, content, sender_id, created_at,
        sender:profiles (first_name, last_name)
      `)
      .eq('thread_id', activeThread.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => setMessages(data || []));

    // subscribe to new ones
    const sub = supabase
      .from(`chat_messages:thread_id=eq.${activeThread.id}`)
      .on('INSERT', payload => {
        setMessages(ms => [...ms, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeSubscription(sub);
      setMessages([]);
    };
  }, [activeThread]);

  // scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMsg.trim() || !activeThread) return;
    await supabase.from('chat_messages').insert({
      thread_id: activeThread.id,
      sender_id: userId,
      content: newMsg.trim(),
    });
    setNewMsg('');
  };

  const createThread = async () => {
    const name = prompt('New thread name:');
    if (!name?.trim()) return;
    const { data, error } = await supabase
      .from('chat_threads')
      .insert([{ name: name.trim() }])
      .single();
    if (!error) {
      setThreads(ts => [...ts, data]);
      setActiveThread(data);
    }
  };

  return (
    <div className="flex h-full">
      {/* Threads list */}
      <aside className="w-1/4 border-r flex flex-col">
        <div className="p-4">
          <button
            onClick={createThread}
            className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600"
          >
            ➕ New Thread
          </button>
        </div>
        <h2 className="px-4 py-2 font-semibold border-b">Threads</h2>
        <div className="flex-1 overflow-y-auto">
          {threads.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveThread(t)}
              className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${
                activeThread?.id === t.id ? 'bg-gray-200' : ''
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
          {activeThread?.name || 'Select a thread'}
        </header>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.map(m => (
            <div
              key={m.id}
              className={`max-w-xs p-2 rounded ${
                m.sender_id === userId
                  ? 'bg-blue-100 self-end'
                  : 'bg-gray-100'
              }`}
            >
              <p className="text-sm font-medium">
                {m.sender.first_name} {m.sender.last_name}
              </p>
              <p>{m.content}</p>
              <p className="text-xs text-gray-500">
                {new Date(m.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <footer className="p-4 border-t flex">
          <input
            type="text"
            className="flex-1 border rounded-l px-2 py-1"
            placeholder="Type a message…"
            value={newMsg}
            onChange={e => setNewMsg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
          />
          <button
            onClick={sendMessage}
            className="ml-2 bg-blue-600 text-white px-4 rounded-r"
          >
            Send
          </button>
        </footer>
      </section>
    </div>
  );
}

