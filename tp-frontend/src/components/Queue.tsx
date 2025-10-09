import React from "react";
import YoutubePlayer from "./YoutubePlayer";
import styles from "../assets/styles/lokchang-rooms.module.css";

interface Props {
  queue: any[];
  nowPlaying: any;
  youtubeUrl: string;
  setYoutubeUrl: (val: string) => void;
  handleAdd: () => void;
  handleRemove: (queueId: string) => void;
  handleSkip: () => void;
  isMuted: boolean;
  handleToggleMute: () => void;
  socketRef: React.MutableRefObject<any>;
  roomIdRef: React.MutableRefObject<string>;
  handleReorder: (queueId: string, direction: 'up' | 'down') => void;
  isHost: boolean; // เพิ่มเพื่อแสดง/ซ่อนปุ่ม
  isProcessing: boolean;
}

const QueueSection: React.FC<Props> = ({
  queue,
  nowPlaying,
  youtubeUrl,
  setYoutubeUrl,
  handleAdd,
  handleRemove,
  handleSkip,
  isMuted,
  handleToggleMute,
  socketRef,
  roomIdRef,
  handleReorder,
  isHost,
  isProcessing,
}) => {
  return (
    <section>
      <h3>🎶 Room Queue  {isProcessing && "⏳"}</h3>
      <div className={styles.queue}>
        {queue.length === 0 ? (
          <div className={styles.queueEmpty}>No songs in queue 🎶</div>
        ) : (
          queue.map((item: any, i: number) => (
            <div key={item.id || i} className={styles.queueItem}>
              {item.song?.coverUrl && (
                <img
                  src={item.song.coverUrl}
                  alt={item.song.title}
                  className={styles.queueCover}
                />
              )}
              <div className={styles.queueInfo}>
                <a
                  href={`https://www.youtube.com/watch?v=${item.song.youtubeVideoId}`}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.queueTitle}
                >
                  {i + 1}. {item.song?.title || "Unknown"}
                </a>
                <div className={styles.queueArtist}>
                  {item.song?.artist || "Unknown Artist"}
                </div>
              </div>

              {isHost && (
                <div className={styles.queueButtons}>
                  <button
                    onClick={() => handleReorder(item.id, "up")}
                    disabled={i === 0 || isProcessing}
                    className={`${styles.queueBtn} ${styles.queueBtnUp}`}
                  >
                    ⬆️
                  </button>
                  <button
                    onClick={() => handleReorder(item.id, "down")}
                    disabled={i === queue.length - 1 || isProcessing}
                    className={`${styles.queueBtn} ${styles.queueBtnDown}`}
                  >
                    ⬇️
                  </button>
                  <button
                    onClick={() => handleRemove(item.id)}
                    disabled={isProcessing}
                    className={`${styles.queueBtn} ${styles.queueBtnRemove}`}
                  >
                    ❌
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <input
        type="text"
        placeholder="Paste YouTube link"
        value={youtubeUrl}
        onChange={(e) => setYoutubeUrl(e.target.value)}
      />
      <button onClick={handleAdd}
      disabled={isProcessing}
      style={{ opacity: isProcessing ? 0.5 : 1 }}
      >➕ Add</button>

      {nowPlaying && (
        <div style={{ marginTop: "1rem", border: "1px solid #ccc", padding: "1rem" }}>
          <h4>▶️ Now Playing</h4>
          <p>
            <strong>{nowPlaying.title}</strong>
          </p>

          <YoutubePlayer
          nowPlaying={nowPlaying}
          isMuted={isMuted}
          onEnd={() => {
            socketRef.current?.emit("song-ended", roomIdRef.current);
          }}
        />


          {/* Controls */}
          <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem" }}>
            <button onClick={handleToggleMute}>
              {isMuted ? "🔇 Unmute" : "🔊 Mute"}
            </button>
            {isHost && (
            <button 
              onClick={handleSkip} 
              disabled={isProcessing}
              style={{ 
                background: isProcessing ? "#ccc" : "#f44336", 
                color: "white",
                padding: "0.5rem 1rem",
                border: "none",
                borderRadius: "4px",
                cursor: isProcessing ? "not-allowed" : "pointer",
                opacity: isProcessing ? 0.5 : 1
              }}
            >
              ⏭️ Skip
            </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default QueueSection;