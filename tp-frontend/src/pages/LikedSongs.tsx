import { useState, useEffect } from "react";
import { useUser } from "../components/userContext";

//css
import styles from "../assets/styles/LikedSongs.module.css"; 

import emptyImg from "../assets/images/empty/empty-box.png";
import type { Song } from "../types/song.ts";
import LikeButton from "../components/LikeButton.tsx";
import { useLikedSongs } from "../components/LikedSongsContext.tsx";
import AddToPlaylistButton from "../components/AddToPlaylist";

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
      <div className={styles.headerWrap}>
        <div className={styles.headerRow}>
          <div className={styles.coverBox}>
            💜
          </div>
          <div className={styles.infoBox}>
            <div className={styles.playlistLabel}>
              PLAYLIST
            </div>
            <h1 className={styles.title}>
              Liked Songs
            </h1>
            <div className={styles.subInfo}>
              {user.name} • {likedSongs.length} songs
            </div>
          </div>
        </div>

        {likedSongs.length > 0 && (
          <div className={styles.controls}>
            <button 
              onClick={handlePlayAll}
              className={`${styles.playAllBtn}`}
            >
              <span className={styles.playIcon}>▶️</span>
              Play All
            </button>

            <button 
              onClick={handleShuffle}
              className={styles.shuffleBtn}
            >
              <span className={styles.shuffleIcon}>🔀</span>
              Shuffle
            </button>
          </div>
        )}
      </div>

      <section className={styles.section}>
        {loading ? (
          <div className={styles.loading}>
            Loading...
          </div>
        ) : likedSongs.length > 0 ? (
          <div className={styles.resultsList}>
            {likedSongs.map((item, index) => (
              <div
                key={item.id}
                className={`${styles.resultItem} ${styles.resultRow}`}
              >
                <div className={styles.indexCol}>
                  {index + 1}
                </div>
                
                {item.song.coverUrl && (
                  <img 
                    src={item.song.coverUrl} 
                    alt={item.song.title}
                    className={styles.resultCover}
                  />
                )}
                
                <div className={`${styles.resultInfo} ${styles.resultInfoGrow}`}>
                  <div className={styles.resultTitle}>{item.song.title}</div>
                  <div className={styles.resultArtist}>{item.song.artist}</div>
                </div>
                
                <div className={styles.likedDate}>
                  {formatDate(item.likedAt)}
                </div>
                
                <div className={styles.resultDuration}>
                  {formatTime(item.song.duration)}
                </div>
                
                <div className={styles.actionButtons}>
                  <button 
                    onClick={() => handlePlaySong(item.song)}
                    className={`${styles.buttonPrimary} ${styles.btnSm}`}
                  >
                    Play
                  </button>
                  <button 
                    onClick={() => handleAddToQueue(item.song)}
                    className={`${styles.buttonSecondary} ${styles.btnSm}`}
                  >
                    + Queue
                  </button>
                  <AddToPlaylistButton 
                    userId={userId} 
                    song={item.song}
                    iconOnly={false}
                    buttonClassName={`${styles.buttonSecondary} ${styles.btnSm}`}
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
