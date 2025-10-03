import React from "react";

interface Props {
  messages: any[];
  message: string;
  setMessage: (val: string) => void;
  handleSendMessage: (e: React.FormEvent) => void;
}

const ChatSection: React.FC<Props> = ({ messages, message, setMessage, handleSendMessage }) => {
  return (
    <section>
      <h3>💬 Chat</h3>
      <div style={{ height: 200, overflowY: "auto", border: "1px solid gray", marginBottom: "1rem" }}>
        {messages.map((msg, i) => (
          <div key={i}>
            <strong>{msg.userName || msg.userId}:</strong> {msg.message}
          </div>
        ))}
      </div>
      <form onSubmit={handleSendMessage}>
        <input
          type="text"
          placeholder="Type a message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button type="submit">Send</button>
      </form>
    </section>
  );
};

export default ChatSection;
