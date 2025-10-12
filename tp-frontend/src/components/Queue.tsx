import React from "react";
import YoutubePlayer from "./YoutubePlayer";
import LikeButton from "./LikeButton";
import AddToPlaylistButton from "./AddToPlaylist";

//css
import styles from "../assets/styles/community/queue.module.css";

//images
import volumeOff from "../assets/images/playMusic/volume-low.png";
import volumeOn from "../assets/images/playMusic/volume-mute.png";
import volumeHigh from "../assets/images/playMusic/volume-high.png";

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
  userId: string;
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
  userId,
}) => {
  const [volume, setVolume] = React.useState(100);
  const [showVolumeSlider, setShowVolumeSlider] = React.useState(false);
  const volumeRef = React.useRef<HTMLDivElement>(null);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
  };

  // Close slider when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (volumeRef.current && !volumeRef.current.contains(event.target as Node)) {
        setShowVolumeSlider(false);
      }
    };

    if (showVolumeSlider) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showVolumeSlider]);

  return (
    <section className={styles.queueSection}>
      {isProcessing && "⏳"}
      {nowPlaying && (
        <div className={styles.nowPlayingCard}>
          <div className={styles.nowPlayingHeader}>
            <h4 className={styles.nowPlayingTitle}>Now Playing</h4>
            
             {/* Volume Control - แบบ MusicPlayer */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px'
            }}>
              <button 
                onClick={handleToggleMute}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title={isMuted ? "Unmute" : "Mute"}
              >
                <img
                  src={isMuted || volume === 0 ? volumeOn : volume < 50 ? volumeOff : volumeHigh}
                  alt={isMuted || volume === 0 ? "Muted" : volume < 50 ? "Volume low" : "Volume high"}
                  className={styles.volumeIcon}
                  style={{ width: '24px', height: '24px' }}
                />
              </button>
              
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                style={{
                  width: '80px',
                  cursor: 'pointer',
                  accentColor: '#1db954',
                  verticalAlign: 'middle',
                  margin: 0
                }}
                title={`Volume: ${volume}%`}
              />
              
            </div>
          </div>

          <p className={styles.nowPlayingTrack}>
            <strong>{nowPlaying.title}</strong>
          </p>

          <YoutubePlayer
            nowPlaying={nowPlaying}
            isMuted={isMuted}
            volume={volume}
            onEnd={() => {
              socketRef.current?.emit("song-ended", roomIdRef.current);
            }}
          />

          {/*  Like & Add to Playlist */}
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            alignItems: 'center',
            marginTop: '12px',
            marginBottom: '8px'
          }}>
            <LikeButton 
              userId={userId} 
              songId={nowPlaying.id}
            />
            <AddToPlaylistButton
              userId={userId}
              song={nowPlaying}
              iconOnly={false}
              buttonStyle={{
                padding: '6px 12px',
                fontSize: '14px',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            />
          </div>

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