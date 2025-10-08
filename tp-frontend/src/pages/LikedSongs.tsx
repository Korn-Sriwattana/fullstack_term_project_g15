import { useState, useEffect } from "react";
import { useUser } from "../components/userContext";
import styles from "../assets/styles/LikedSongs.module.css"; 
import emptyImg from "../assets/images/empty/empty-box.png";
import type { Song } from "../types/song.ts";

const API_URL = "http://localhost:3000";

interface LikedSong {
  id: string;
  likedAt: string;
  song: Song;
}

export default function LikedSongs() {
  const { user } = useUser();
  const userId = user?.id;

  const [likedSongs, setLikedSongs] = useState<LikedSong[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadLikedSongs();
    }
  }, [userId]);

  const loadLikedSongs = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/liked-songs/${userId}`);
      const data = await res.json();
      setLikedSongs(data);
    } catch (err) {
      console.error("Load liked songs failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromLiked = async (songId: string) => {
    if (!userId) return;

    try {
      const res = await fetch(`${API_URL}/liked-songs/${userId}/${songId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to remove");

      setLikedSongs(likedSongs.filter(item => item.song.id !== songId));
      alert("Removed from Liked Songs!");
    } catch (err) {
      console.error("Remove failed:", err);
      alert("Failed to remove from Liked Songs");
    }
  };

  const handlePlaySong = async (song: Song) => {
    if (!userId) {
      alert("Please create user first");
      return;
    }

    if ((window as any).musicPlayer) {
      await (window as any).musicPlayer.playSong(song);
    }
  };

  const handleAddToQueue = async (song: Song) => {
    if (!userId) {
      alert("Please create user first");
      return;
    }

    if ((window as any).musicPlayer) {
      await (window as any).musicPlayer.addToQueue(song);
      alert("Added to queue!");
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  if (!userId) {
    return (
      <div className={styles.container}>
        <h2>Please create user first</h2>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
          <div style={{ 
            width: '200px', 
            height: '200px', 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '80px'
          }}>
            💜
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>
              Playlist
            </div>
            <h1 style={{ fontSize: '48px', fontWeight: 'bold', margin: '0 0 12px 0' }}>
              Liked Songs
            </h1>
            <div style={{ fontSize: '14px', color: '#666' }}>
              {user.name} • {likedSongs.length} songs
            </div>
          </div>
        </div>
      </div>

      <section className={styles.section}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            Loading...
          </div>
        ) : likedSongs.length > 0 ? (
          <div className={styles.resultsList}>
            {likedSongs.map((item, index) => (
              <div
                key={item.id}
                className={styles.resultItem}
                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <div style={{ 
                  minWidth: '30px', 
                  textAlign: 'center',
                  color: '#666',
                  fontSize: '14px'
                }}>
                  {index + 1}
                </div>
                
                {item.song.coverUrl && (
                  <img 
                    src={item.song.coverUrl} 
                    alt={item.song.title}
                    className={styles.resultCover}
                  />
                )}
                
                <div className={styles.resultInfo} style={{ flex: 1 }}>
                  <div className={styles.resultTitle}>{item.song.title}</div>
                  <div className={styles.resultArtist}>{item.song.artist}</div>
                </div>
                
                <div style={{ fontSize: '12px', color: '#888', minWidth: '100px' }}>
                  {formatDate(item.likedAt)}
                </div>
                
                <div className={styles.resultDuration}>
                  {formatTime(item.song.duration)}
                </div>
                
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button 
                    onClick={() => handlePlaySong(item.song)}
                    className={styles.buttonPrimary}
                    style={{ padding: '6px 12px', fontSize: '13px' }}
                  >
                    Play
                  </button>
                  <button 
                    onClick={() => handleAddToQueue(item.song)}
                    className={styles.buttonSecondary}
                    style={{ padding: '6px 12px', fontSize: '13px' }}
                  >
                    + Queue
                  </button>
                  <button 
                    onClick={() => handleRemoveFromLiked(item.song.id)}
                    style={{ 
                      padding: '6px 12px', 
                      fontSize: '18px',
                      background: 'transparent',
                      color: '#dc2626',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                    title="Remove from Liked Songs"
                  >
                    💔
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : ( 
          <section className={styles.emptyWrap}>
            <img src={""} alt="empty liked songs" className={styles.emptyImg} />
            <h2 className={styles.emptyTitle}>You haven’t liked any songs yet</h2>
            <p className={styles.emptyHint}>
              Tap the heart on tracks you love to keep them all in one place
            </p>
          </section>
        )}
      </section>
    </div>
  );
}