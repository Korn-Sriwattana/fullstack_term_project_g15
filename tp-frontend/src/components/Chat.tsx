import React, { useRef, useEffect } from "react";

interface Props {
  messages: any[];
  message: string;
  setMessage: (val: string) => void;
  handleSendMessage: (e: React.FormEvent) => void;
}

const ChatSection: React.FC<Props> = ({ messages, message, setMessage, handleSendMessage }) => {
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new message arrives
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <section style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ marginBottom: '0.5rem', fontSize: '18px', fontWeight: '600' }}>
        💬 Chat
      </h3>
      
      <div style={{ 
        height: 250, 
        overflowY: "auto", 
        border: "1px solid #3e3e3e",
        borderRadius: '8px',
        marginBottom: "0.75rem",
        padding: '0.75rem',
        backgroundColor: '#1a1a1a'
      }}>
        {messages.map((msg, i) => {
          const isSystem = msg.isSystem || msg.userId === "system";
          
          return (
            <div 
              key={i}
              style={{
                marginBottom: '0.5rem',
                padding: isSystem ? '0.5rem' : '0.25rem 0',
                backgroundColor: isSystem ? 'rgba(29, 185, 84, 0.1)' : 'transparent',
                borderRadius: isSystem ? '6px' : '0',
                borderLeft: isSystem ? '3px solid #1db954' : 'none',
                paddingLeft: isSystem ? '0.75rem' : '0',
                fontSize: isSystem ? '13px' : '14px',
                color: isSystem ? '#1db954' : '#fff',
                fontStyle: isSystem ? 'italic' : 'normal'
              }}
            >
              {isSystem ? (
                // System message
                <span>{msg.message}</span>
              ) : (
                // User message
                <>
                  <strong style={{ color: '#1db954' }}>
                    {msg.userName || msg.userId}:
                  </strong>{' '}
                  <span style={{ color: '#b3b3b3' }}>{msg.message}</span>
                </>
              )}
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>
      
      <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{
            flex: 1,
            padding: '0.75rem',
            fontSize: '14px',
            backgroundColor: '#282828',
            border: '1px solid #3e3e3e',
            borderRadius: '6px',
            color: 'white',
            outline: 'none'
          }}
          onFocus={(e) => e.target.style.borderColor = '#1db954'}
          onBlur={(e) => e.target.style.borderColor = '#3e3e3e'}
        />
        <button 
          type="submit"
          style={{
            padding: '0.75rem 1.5rem',
            width: '100px',
            fontSize: '14px',
            fontWeight: '100',
            backgroundColor: '#1db954',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1ed760'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1db954'}
        >
          Send
        </button>
      </form>
    </section>
  );
};

export default ChatSection;