cat > src/components/Staff/StaffChat.jsx << 'EOF'
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../supabaseClient';

export default function StaffChat({ user }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef();

  // load existing messages
  useEffect(() => {
    supabase
      .from('chat_messages')
      .select('id, content, sender_id, inserted_at')
      .order('inserted_at', { ascending: true })
      .then(({ data }) => setMessages(data || []));
  }, []);

  // subscribe in real-time
  useEffect(() => {
    const subscription = supabase
      .from('chat_messages')
      .on('INSERT', payload => {
        setMessages(prev => [...prev, payload.new]);
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      })
      .subscribe();
    return () => supabase.removeSubscription(subscription);
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;
    await supabase.from('chat_messages').insert({
      content: input,
      sender_id: user.id
    });
    setInput('');
  };

  return (
    <div className="max-w-xl mx-auto p-4 flex flex-col h-screen">
      <h1 className="text-2xl mb-4">Staff Chat</h1>
      <div className="flex-1 overflow-auto border p-2 space-y-2">
        {messages.map(m => (
          <div
            key={m.id}
            className={\`p-2 rounded \${m.sender_id === user.id ? 'bg-blue-100 self-end' : 'bg-gray-100 self-start'}\`}
          >
            <div className="text-sm text-gray-600">
              {new Date(m.inserted_at).toLocaleTimeString()}
            </div>
            <div>{m.content}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="mt-2 flex">
        <input
          className="flex-1 border p-2 rounded-l"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message…"
        />
        <button
          onClick={sendMessage}
          className="px-4 bg-blue-600 text-white rounded-r"
        >
          Send
        </button>
      </div>
    </div>
  );
}
EOF

