import React, { useRef, useEffect } from "react";

// ปรับ interface ให้ตรงกับโครงสร้างของคุณ
interface Message {
  id: string;
  roomId: string;
  userId: string;
  message: string;
  createdAt: Date | string;
  // Join กับ users table เพื่อได้ชื่อ
  user?: {
    id: string;
    name: string;
    profilePic?: string;
  };
  // สำหรับ system message
  isSystem?: boolean;
}

interface Props {
  messages: Message[];
  message: string;
  setMessage: (val: string) => void;
  handleSendMessage: (e: React.FormEvent) => void;
  currentUserId: string; // userId ของผู้ใช้ปัจจุบัน
}

const ChatSection: React.FC<Props> = ({ 
  messages, 
  message, 
  setMessage, 
  handleSendMessage,
  currentUserId
}) => {
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new message arrives
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ฟังก์ชันสำหรับจัดรูปแบบเวลา
  const formatTime = (timestamp: Date | string) => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleTimeString('th-TH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

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
        {messages.map((msg) => {
          const isSystem = msg.isSystem;
          const isOwnMessage = msg.userId === currentUserId && !isSystem;
          const userName = msg.user?.name || 'Unknown User';
          
          return (
            <div 
              key={msg.id}
              style={{
                marginBottom: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: isSystem ? 'center' : (isOwnMessage ? 'flex-end' : 'flex-start')
              }}
            >
              {isSystem ? (
                // System message (กลาง)
                <div style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'rgba(29, 185, 84, 0.1)',
                  borderRadius: '6px',
                  border: '1px solid rgba(29, 185, 84, 0.3)',
                  fontSize: '13px',
                  color: '#1db954',
                  fontStyle: 'italic',
                  maxWidth: '80%',
                  textAlign: 'center'
                }}>
                  {msg.message}
                </div>
              ) : (
                // User message (ซ้าย/ขวา)
                <div style={{
                  maxWidth: '70%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isOwnMessage ? 'flex-end' : 'flex-start'
                }}>
                  {/* ชื่อผู้ส่ง */}
                  <div style={{
                    fontSize: '12px',
                    color: '#888',
                    marginBottom: '0.25rem',
                    paddingLeft: isOwnMessage ? '0' : '0.5rem',
                    paddingRight: isOwnMessage ? '0.5rem' : '0'
                  }}>
                    {userName}
                  </div>
                  
                  {/* ข้อความ */}
                  <div style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: isOwnMessage ? '#1db954' : '#282828',
                    color: isOwnMessage ? '#fff' : '#e0e0e0',
                    borderRadius: '12px',
                    fontSize: '14px',
                    wordBreak: 'break-word',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                  }}>
                    {msg.message}
                  </div>
                  
                  {/* เวลา */}
                  <div style={{
                    fontSize: '11px',
                    color: '#666',
                    marginTop: '0.25rem',
                    paddingLeft: isOwnMessage ? '0' : '0.5rem',
                    paddingRight: isOwnMessage ? '0.5rem' : '0'
                  }}>
                    {formatTime(msg.createdAt)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>
      
      <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          placeholder="พิมพ์ข้อความ..."
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
          ส่ง
        </button>
      </form>
    </section>
  );
};

export default ChatSection;