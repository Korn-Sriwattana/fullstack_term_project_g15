import React from "react";
import YoutubePlayer from "./YoutubePlayer";

//css
import styles from "../assets/styles/community/queue.module.css";

//images
import volumeOff from "../assets/images/playMusic/volume-low.png";
import volumeOn from "../assets/images/playMusic/volume-mute.png";

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
  isHost: boolean;
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
    <section className={styles.queueSection}>
      {isProcessing && "⏳"}
      {nowPlaying && (
        <div className={styles.nowPlayingCard}>
          <div className={styles.nowPlayingHeader}>
            <h4 className={styles.nowPlayingTitle}>Now Playing</h4>
            <img
              src={isMuted ? volumeOn : volumeOff}
              alt={isMuted ? "Muted" : "Unmuted"}
              onClick={handleToggleMute}
              className={styles.volumeIcon}
            />
          </div>

          <p className={styles.nowPlayingTrack}>
            <strong>{nowPlaying.title}</strong>
          </p>

          <YoutubePlayer
            nowPlaying={nowPlaying}
            isMuted={isMuted}
            onEnd={() => {
              socketRef.current?.emit("song-ended", roomIdRef.current);
            }}
          />

          <div className={styles.controlsRow}>
            {isHost && (
              <button
                onClick={handleSkip}
                disabled={isProcessing}
                className={styles.skipBtn}
              >
                Skip
              </button>
            )}
          </div>
        </div>
      )}

      {/*next song */}
      <div className={styles.nextSection}>
        <h4 className={styles.nextTitle}>Next</h4>

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

        <div className={styles.addRow}>
          <input
            type="text"
            placeholder="paste youtube link here ..."
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            className={styles.addInput}
          />
          <button
            onClick={handleAdd}
            disabled={isProcessing}
            className={styles.addBtn}
          >
            add
          </button>
        </div>


      </div>

    </section>
  );
};

export default QueueSection;
