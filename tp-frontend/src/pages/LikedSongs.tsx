import { useState, useEffect } from "react";
import { useUser } from "../components/userContext";
import styles from "../assets/styles/LikedSongs.module.css";
import type { Song } from "../types/song.ts";
import LikeButton from "../components/LikeButton.tsx";
import { useLikedSongs } from "../components/LikedSongsContext.tsx";
import AddToPlaylistButton from "../components/AddToPlaylist";
import { useApi } from "../lib/api";

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
  const { apiFetch } = useApi();

  const [sortBy, setSortBy] = useState<
    "dateAdded" | "title" | "artist" | "duration"
  >("dateAdded");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    if (userId) {
      loadLikedSongs();
    }
  }, [userId, likedSongIds]);

  const loadLikedSongs = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const data = await apiFetch(`/liked-songs/${userId}`);
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
      const songsToPlay = sortedLikedSongs;
      const [firstSong, ...restSongs] = songsToPlay.map((item) => item.song);

      await (window as any).musicPlayer.playSong(firstSong);

      for (const song of restSongs) {
        await (window as any).musicPlayer.addToQueue(song);
      }

      alert(`Playing ${songsToPlay.length} liked songs`);
    }
  };

  const handleShuffle = async () => {
    if (!userId || likedSongs.length === 0) {
      alert("No songs to shuffle");
      return;
    }

    if ((window as any).musicPlayer) {
      const songsToShuffle = sortedLikedSongs;
      const shuffled = [...songsToShuffle].sort(() => Math.random() - 0.5);
      const [firstSong, ...restSongs] = shuffled.map((item) => item.song);

      await (window as any).musicPlayer.playSong(firstSong);

      for (const song of restSongs) {
        await (window as any).musicPlayer.addToQueue(song);
      }

      alert(`Shuffling ${shuffled.length} liked songs`);
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
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const sortedLikedSongs = [...likedSongs].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "title":
        comparison = (a.song.title || "").localeCompare(b.song.title || "");
        break;
      case "artist":
        comparison = (a.song.artist || "").localeCompare(b.song.artist || "");
        break;
      case "duration":
        comparison = (a.song.duration || 0) - (b.song.duration || 0);
        break;
      case "dateAdded":
      default:
        comparison =
          new Date(a.likedAt).getTime() - new Date(b.likedAt).getTime();
        break;
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  const handleSortChange = (
    newSortBy: "dateAdded" | "title" | "artist" | "duration"
  ) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(newSortBy);
      setSortOrder("asc");
    }
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
          <div className={styles.cover}>💜</div>
          <div className={styles.info}>
            <div className={styles.playlistLabel}>PLAYLIST</div>
            <h1 className={styles.titleHeading}>Liked Songs</h1>
            <div className={styles.subtitle}>
              {user.name} • {likedSongs.length} songs
            </div>
          </div>
        </div>

        {likedSongs.length > 0 && (
          <div className={styles.controls}>
            <button
              onClick={handlePlayAll}
              className={styles.playAllBtn}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.04)";
                e.currentTarget.style.background = "#1ed760";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.background = "#1DB954";
              }}
            >
              <span className={styles.playIcon}>▶️</span>
              Play All
            </button>

            <button
              onClick={handleShuffle}
              className={styles.shuffleBtn}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.04)";
                e.currentTarget.style.borderColor = "#000";
                e.currentTarget.style.color = "#000";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.borderColor = "#d1d1d1";
                e.currentTarget.style.color = "#666";
              }}
            >
              <span className={styles.shuffleIcon}>🔀</span>
              Shuffle
            </button>
          </div>
        )}
      </div>

      <section className={styles.section}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
            Loading...
          </div>
        ) : likedSongs.length > 0 ? (
          <>
            <div className={styles.sortBar}>
              <span className={styles.sortLabel}>Sort by:</span>
              <button
                onClick={() => handleSortChange("dateAdded")}
                className={`${styles.sortBtn} ${
                  sortBy === "dateAdded" ? styles.sortBtnActive : ""
                }`}
              >
                Date Added{" "}
                {sortBy === "dateAdded" && (sortOrder === "asc" ? "↑" : "↓")}
              </button>
              <button
                onClick={() => handleSortChange("title")}
                className={`${styles.sortBtn} ${
                  sortBy === "title" ? styles.sortBtnActive : ""
                }`}
              >
                Title {sortBy === "title" && (sortOrder === "asc" ? "↑" : "↓")}
              </button>
              <button
                onClick={() => handleSortChange("artist")}
                className={`${styles.sortBtn} ${
                  sortBy === "artist" ? styles.sortBtnActive : ""
                }`}
              >
                Artist{" "}
                {sortBy === "artist" && (sortOrder === "asc" ? "↑" : "↓")}
              </button>
              <button
                onClick={() => handleSortChange("duration")}
                className={`${styles.sortBtn} ${
                  sortBy === "duration" ? styles.sortBtnActive : ""
                }`}
              >
                Duration{" "}
                {sortBy === "duration" && (sortOrder === "asc" ? "↑" : "↓")}
              </button>
            </div>

            <div className={styles.resultsList}>
              {sortedLikedSongs.map((item, index) => (
                <div key={item.id} className={styles.resultItem}>
                  <div className={styles.indexNum}>{index + 1}</div>

                  {item.song.coverUrl && (
                    <img
                      src={item.song.coverUrl}
                      alt={item.song.title}
                      className={styles.resultCover}
                    />
                  )}

                  <div className={styles.resultInfo} style={{ flex: 1 }}>
                    <div className={styles.resultTitle}>{item.song.title}</div>
                    <div className={styles.resultArtist}>
                      {item.song.artist}
                    </div>
                  </div>

                  <div className={styles.dateText}>
                    {formatDate(item.likedAt)}
                  </div>

                  <div className={styles.resultDuration}>
                    {formatTime(item.song.duration)}
                  </div>

                  <div style={{ display: "flex", gap: "5px" }}>
                    <button
                      onClick={() => handlePlaySong(item.song)}
                      className={styles.buttonPrimary}
                      style={{ padding: "6px 12px", fontSize: "13px" }}
                    >
                      Play
                    </button>
                    <button
                      onClick={() => handleAddToQueue(item.song)}
                      className={styles.buttonSecondary}
                      style={{ padding: "6px 12px", fontSize: "13px" }}
                    >
                      + Queue
                    </button>
                    <AddToPlaylistButton
                      userId={userId}
                      song={item.song}
                      iconOnly={false}
                      buttonClassName={styles.buttonSecondary}
                      buttonStyle={{ padding: "6px 12px", fontSize: "13px" }}
                      onSuccess={async () => {
                        console.log("Song added to playlist");
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
          </>
        ) : (
          <section className={styles.emptyWrap}>
            <h2 className={styles.emptyTitle}>
              You haven't liked any songs yet
            </h2>
            <p className={styles.emptyHint}>
              Tap the heart on tracks you love to keep them all in one place
            </p>
          </section>
        )}
      </section>
    </div>
  );
}
