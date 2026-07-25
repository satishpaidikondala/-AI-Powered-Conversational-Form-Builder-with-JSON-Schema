import React, { useState, useRef, useEffect } from 'react';
import { useConversation } from '../context/ConversationContext';

export default function ChatPane() {
  const { state, sendPrompt, clearConversation } = useConversation();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || state.loading) return;
    const prompt = input.trim();
    setInput('');
    await sendPrompt(prompt);
  };

  return (
    <div data-testid="chat-pane" className="chat-pane">
      <div className="chat-header">
        <h2>Form Builder Chat</h2>
        <button className="clear-btn" onClick={clearConversation}>New Conversation</button>
      </div>
      <div className="chat-messages">
        {state.messages.length === 0 && (
          <div className="welcome-message">
            <p>Welcome! Describe the form you'd like to create.</p>
            <p className="hint">Try: "Create a contact form with name, email, and phone fields"</p>
          </div>
        )}
        {state.messages.map((msg, i) => (
          <div key={i} className={`message message-${msg.role}`}>
            <div className="message-sender">{msg.role === 'user' ? 'You' : 'AI'}</div>
            <div className="message-content">{msg.content}</div>
          </div>
        ))}
        {state.loading && (
          <div className="message message-assistant">
            <div className="message-sender">AI</div>
            <div className="message-content thinking">Thinking...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form className="chat-input" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Describe the form you want..."
          disabled={state.loading}
        />
        <button type="submit" disabled={state.loading || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
