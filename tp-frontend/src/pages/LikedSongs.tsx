import { useState, useEffect } from "react";
import { useUser } from "../components/userContext";
import styles from "../assets/styles/LikedSongs.module.css"; 
import emptyImg from "../assets/images/empty/empty-box.png";
import type { Song, QueueItem } from "../types/song.ts";
import LikeButton from "../components/LikeButton.tsx";
import { useLikedSongs } from "../components/LikedSongsContext.tsx";
import AddToPlaylistButton from "../components/AddToPlaylist";

const API_URL = "http://localhost:3000";

interface LikedSong {
  id: string;
  likedAt: string;
  song: Song;
}

interface LikedSongsProps {
  queue?: QueueItem[];
  currentIndex?: number;
}


export default function LikedSongs({ queue = [], currentIndex = 0 }: LikedSongsProps) {
  const { user } = useUser();
  const userId = user?.id;

  const [likedSongs, setLikedSongs] = useState<LikedSong[]>([]);
  const [loading, setLoading] = useState(true);
  const { likedSongIds, refreshLikedSongs } = useLikedSongs();

  useEffect(() => {
    if (userId) {
      loadLikedSongs();
    }
  }, [userId, likedSongIds]);

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

  // ✅ Play All Liked Songs
  const handlePlayAll = async () => {
    if (!userId || likedSongs.length === 0) {
      alert("No songs to play");
      return;
    }

    if ((window as any).musicPlayer) {
      const [firstSong, ...restSongs] = likedSongs.map(item => item.song);
      
      await (window as any).musicPlayer.playSong(firstSong);
      
      for (const song of restSongs) {
        await (window as any).musicPlayer.addToQueue(song);
      }
      
      alert(`Playing ${likedSongs.length} liked songs`);
    }
  };

  // ✅ Shuffle Liked Songs
  const handleShuffle = async () => {
    if (!userId || likedSongs.length === 0) {
      alert("No songs to shuffle");
      return;
    }

    if ((window as any).musicPlayer) {
      const shuffled = [...likedSongs].sort(() => Math.random() - 0.5);
      const [firstSong, ...restSongs] = shuffled.map(item => item.song);
      
      await (window as any).musicPlayer.playSong(firstSong);
      
      for (const song of restSongs) {
        await (window as any).musicPlayer.addToQueue(song);
      }
      
      alert(`Shuffling ${likedSongs.length} liked songs`);
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
      {/* Header Section */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '24px', marginBottom: '24px' }}>
          {/* Cover Image */}
          <div style={{ 
            width: '232px', 
            height: '232px', 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '80px',
            boxShadow: '0 8px 24px rgba(102, 126, 234, 0.15)',
            flexShrink: 0
          }}>
            💜
          </div>

          {/* Info Section */}
          <div style={{ flex: 1, paddingBottom: '8px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>
              PLAYLIST
            </div>
            <h1 style={{ fontSize: '96px', fontWeight: 'bold', margin: '0 0 24px 0', lineHeight: '96px', letterSpacing: '-0.04em' }}>
              Liked Songs
            </h1>
            <div style={{ fontSize: '14px', color: '#666', fontWeight: 600 }}>
              {user.name} • {likedSongs.length} songs
            </div>
          </div>
        </div>

        {/* ✅ Play Controls - แสดงเฉพาะเมื่อมีเพลง */}
        {likedSongs.length > 0 && (
          <div style={{ 
            display: 'flex', 
            gap: '16px', 
            alignItems: 'center',
            padding: '24px 0',
            borderBottom: '1px solid #e5e5e5'
          }}>
            <button 
              onClick={handlePlayAll}
              style={{
                padding: '12px 32px',
                background: '#1DB954',
                color: 'white',
                border: 'none',
                borderRadius: '500px',
                fontSize: '16px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(29, 185, 84, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.04)';
                e.currentTarget.style.background = '#1ed760';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.background = '#1DB954';
              }}
            >
              <span style={{ fontSize: '20px' }}>▶️</span>
              Play All
            </button>

            <button 
              onClick={handleShuffle}
              style={{
                padding: '12px 24px',
                background: 'transparent',
                color: '#666',
                border: '1px solid #d1d1d1',
                borderRadius: '500px',
                fontSize: '16px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.04)';
                e.currentTarget.style.borderColor = '#000';
                e.currentTarget.style.color = '#000';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.borderColor = '#d1d1d1';
                e.currentTarget.style.color = '#666';
              }}
            >
              <span style={{ fontSize: '18px' }}>🔀</span>
              Shuffle
            </button>
          </div>
        )}
      </div>

      {/* Songs List */}
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
                  <AddToPlaylistButton 
                    userId={userId} 
                    song={item.song}
                    iconOnly={false}
                    buttonClassName={styles.buttonSecondary}
                    buttonStyle={{ padding: '6px 12px', fontSize: '13px' }}
                    onSuccess={async () => {
                      console.log('Song added to playlist');
                    }}
                  />
                  <LikeButton 
                    userId={userId!} 
                    songId={item.song.id}
                    onLikeChange={(isLiked) => {
                      if (!isLiked) {
                        refreshLikedSongs(userId!);
                      }
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : ( 
          <section className={styles.emptyWrap}>
            <img src={emptyImg} alt="empty liked songs" className={styles.emptyImg} />
            <h2 className={styles.emptyTitle}>You haven't liked any songs yet</h2>
            <p className={styles.emptyHint}>
              Tap the heart on tracks you love to keep them all in one place
            </p>
          </section>
        )}
      </section>
    </div>
  );
}