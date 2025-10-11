import React, { useRef, useEffect } from "react";

//css
import styles from "../assets/styles/community/chat.module.css";
//image
import sendIcon from "../assets/images/sent-icon.png";

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
    <section className={styles.chatPanel}>
      <div className={styles.panelHeader}>Chat</div>

      <div className={styles.panelBody}>
        <div className={styles.chatBox}>
          {messages.map((msg) => {
            const isSystem = msg.isSystem;
            const isOwnMessage = msg.userId === currentUserId && !isSystem;
            const userName = msg.user?.name || 'Unknown User';
            
            return (
              <div 
                key={msg.id}
                className={`${styles.msgRow} ${
                  isSystem ? styles.center 
                  : isOwnMessage ? styles.own 
                  : styles.other
                }`}
              >
                {isSystem ? (
                  // System message (กลาง)
                  <div className={styles.systemMsg}>
                    {msg.message}
                  </div>
                ) : (
                  // User message (ซ้าย/ขวา)
                  <div 
                    className={`${styles.userMsg} ${
                      isOwnMessage ? styles.userOwn : styles.userOther
                    }`}
                  >
                    {/* ชื่อผู้ส่ง */}
                    <div 
                      className={`${styles.userName} ${
                        isOwnMessage ? styles.nameOwn : styles.nameOther
                      }`}
                    >
                      {userName}
                    </div>
                    
                    {/* ข้อความ */}
                    <div 
                      className={`${styles.msgBubble} ${
                        isOwnMessage ? styles.bubbleOwn : styles.bubbleOther
                      }`}
                    >
                      {msg.message}
                    </div>
                    
                    {/* เวลา */}
                    <div 
                      className={`${styles.msgTime} ${
                        isOwnMessage ? styles.timeOwn : styles.timeOther
                      }`}
                    >
                      {formatTime(msg.createdAt)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>
        
        <div className={styles.chatInputBox}>
          <form onSubmit={handleSendMessage} className={styles.chatForm}>
            <input
              type="text"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={styles.chatInput}
            />
            <button type="submit" className={styles.sendBtn} aria-label="Send">
              <img src={sendIcon} alt="" className={styles.sendIcon} />
            </button>
          </form>
        </div>

      </div>
    </section>
  );
};

export default ChatSection;
