import { useState, useEffect, useRef } from "react";
import { useUser } from "../components/userContext";
import styles from "../assets/styles/Home.module.css";
import type { Song, QueueItem } from "../types/song.ts";
import LikeButton from "../components/LikeButton";
import AddToPlaylistButton from "../components/AddToPlaylist";
import searchIcon from "../assets/images/search-icon.png";
import { authClient } from "../lib/auth-client";
import { useLikedSongs } from "../components/LikedSongsContext";

const API_URL = "http://localhost:3000";

interface HomeProps {
  queue?: QueueItem[];
  currentIndex?: number;
}

const Home = ({ queue = [], currentIndex = 0 }: HomeProps) => {
  const { setUser, user } = useUser();
  const userId = user?.id || "";
  const [email, setEmail] = useState(localStorage.getItem("email") || ""); // ✅ mock email จาก signup
  
  const { refreshLikedSongs } = useLikedSongs();
   
  //  ตรวจสอบผู้ใช้จาก database โดยตรง
  useEffect(() => {
    const checkUserInDatabase = async () => {
      try {
        if (!email) return;

        const res = await fetch(`${API_URL}/api/user/check?email=${email}`);
        const data = await res.json();

        if (data.exists && data.user) {
          setUser({
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
          });
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Database user check failed:", err);
      }
    };

    checkUserInDatabase();
  }, [email, setUser]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [recentlyPlayed, setRecentlyPlayed] = useState<any[]>([]);
  const [popularSongs, setPopularSongs] = useState<any[]>([]);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showAllPopular, setShowAllPopular] = useState(false);
  const quickAddRef = useRef<HTMLDivElement>(null);

  // Popup for login reminder
  const [showLoginPopup, setShowLoginPopup] = useState(false);

  useEffect(() => {
    if (!userId) {
      setShowLoginPopup(true);
    } else {
      setShowLoginPopup(false); // ✅ ปิด popup เมื่อ login แล้ว
    }
  }, [userId]);

   useEffect(() => {
      if (userId) {
        console.log("🔄 Auto-refreshing liked songs for user:", userId);
        refreshLikedSongs(userId);
      }
    }, [userId, refreshLikedSongs]);


  // Real-time search with debounce
  useEffect(() => {
    const searchSongs = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        const res = await fetch(
          `${API_URL}/songs/search?q=${encodeURIComponent(searchQuery)}`
        );
        const data = await res.json();
        setSearchResults(data);
      } catch (err) {
        console.error("Search failed:", err);
      }
    };

    const timeoutId = setTimeout(() => {
      searchSongs();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Load recently played when user changes
  useEffect(() => {
    if (userId) {
      loadRecentlyPlayed();
    }
  }, [userId]);

  // Load popular songs on mount
  useEffect(() => {
    loadPopularSongs();
  }, []);

  function extractVideoId(url: string): string | null {
    try {
      const parsed = new URL(url);
      if (parsed.hostname === "youtu.be") {
        return parsed.pathname.slice(1);
      }
      if (parsed.searchParams.has("v")) {
        return parsed.searchParams.get("v");
      }
      return null;
    } catch {
      return null;
    }
  }

  const handleAdd = async () => {
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      alert("Invalid YouTube URL");
      return;
    }

    const res = await fetch(`${API_URL}/songs/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        youtubeVideoId: videoId,
      }),
    });

    const song = await res.json();

    if (!song.id) {
      alert("Failed to add/find song");
      return;
    }

    setYoutubeUrl("");
    alert("Song added!");
  };

  const handlePlaySong = async (song: Song) => {
    if (!userId) {
      alert("Please create user first");
      return;
    }

    if ((window as any).musicPlayer) {
      await (window as any).musicPlayer.playSong(song);
      loadRecentlyPlayed();
      loadPopularSongs(); // Refresh popular songs after play
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
      loadRecentlyPlayed();
    }
  };

  const loadRecentlyPlayed = async () => {
    if (!userId) return;

    try {
      const res = await fetch(
        `${API_URL}/player/recently-played/${userId}?limit=10`
      );
      const data = await res.json();
      setRecentlyPlayed(data);
    } catch (err) {
      console.error("Load recently played failed:", err);
    }
  };

  const loadPopularSongs = async () => {
    try {
      const res = await fetch(`${API_URL}/songs/popular?limit=20`);
      const data = await res.json();
      setPopularSongs(data);
    } catch (err) {
      console.error("Load popular songs failed:", err);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatPlayCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  // Click-outside + Esc for quick add
  useEffect(() => {
    const handleDocMouseDown = (e: MouseEvent) => {
      if (!showQuickAdd) return;
      const el = quickAddRef.current;
      if (el && !el.contains(e.target as Node)) {
        setShowQuickAdd(false);
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowQuickAdd(false);
      }
    };

    document.addEventListener("mousedown", handleDocMouseDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleDocMouseDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [showQuickAdd]);

  return (
    <div className={styles.container}>
      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
          style={{
            backgroundImage: `url(${searchIcon})`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "16px center",
            backgroundSize: "20px",
            paddingLeft: 56,
          }}
        />

        {/* Add songs */}
        <div ref={quickAddRef}>
          <div>
            <button
              type="button"
              onClick={() => setShowQuickAdd((v) => !v)}
              className={styles.buttonSecondary}
            >
              + Add song
            </button>
          </div>

          {showQuickAdd && (
            <div>
              <input
                type="text"
                placeholder="Paste a YouTube link"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                className={styles.inputSmall}
              />
              <button
                type="button"
                onClick={handleAdd}
                className={styles.buttonPrimary}
              >
                +
              </button>
            </div>
          )}
        </div>

        {/* Search results */}
        {searchResults.length === 0 && searchQuery.trim() !== "" && (
          <section className={styles.section}>
            <h3>Search Results</h3>
            <p className={styles.noResults}>No results found.</p>
          </section>
        )}

        {searchResults.length > 0 && (
          <section className={styles.section}>
            <h3>Search Results</h3>
            <div className={styles.resultsList}>
              {searchResults.map((song) => (
                <div
                  key={song.id}
                  className={styles.resultItem}
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  {song.coverUrl && (
                    <img
                      src={song.coverUrl}
                      alt={song.title}
                      className={styles.resultCover}
                    />
                  )}
                  <div className={styles.resultInfo} style={{ flex: 1 }}>
                    <div className={styles.resultTitle}>{song.title}</div>
                    <div className={styles.resultArtist}>{song.artist}</div>
                  </div>
                  <div className={styles.resultDuration}>
                    {formatTime(song.duration)}
                  </div>
                  <div style={{ display: "flex", gap: "5px" }}>
                    <button
                      onClick={() => handlePlaySong(song)}
                      className={styles.buttonPrimary}
                      style={{ padding: "6px 12px", fontSize: "13px" }}
                    >
                      Play
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToQueue(song);
                      }}
                      className={styles.buttonSecondary}
                      style={{ padding: "6px 12px", fontSize: "13px" }}
                    >
                      + Queue
                    </button>
                    {userId && (
                      <>
                        <AddToPlaylistButton
                          userId={userId}
                          song={song}
                          iconOnly={false}
                          buttonClassName={styles.buttonSecondary}
                          buttonStyle={{
                            padding: "6px 12px",
                            fontSize: "13px",
                          }}
                        />
                        <LikeButton
                          userId={userId}
                          songId={song.id}
                          onLikeChange={async (isLiked) => {
                            console.log(
                              `Song ${song.title} is now ${
                                isLiked ? "liked" : "unliked"
                              }`
                            );
                            loadRecentlyPlayed();
                          }}
                        />
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Popular Songs */}
      {popularSongs.length > 0 && searchQuery.trim() === "" && (
        <section className={styles.section}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "10px",
            }}
          >
            <h3>🔥 Popular Songs</h3>
            {popularSongs.length > 5 && (
              <button
                onClick={() => setShowAllPopular(!showAllPopular)}
                className={styles.buttonSecondary}
                style={{ padding: "4px 12px", fontSize: "13px" }}
              >
                {showAllPopular
                  ? "Show Less"
                  : `Show More (${popularSongs.length})`}
              </button>
            )}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: "15px",
            }}
          >
            {(showAllPopular ? popularSongs : popularSongs.slice(0, 5)).map(
              (item) => (
                <div
                  key={item.song.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "12px",
                    borderRadius: "8px",
                    backgroundColor: "#f5f5f5",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    position: "relative",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#e8e8e8";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#f5f5f5";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {item.song.coverUrl && (
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        paddingBottom: "100%",
                        marginBottom: "8px",
                      }}
                    >
                      <img
                        src={item.song.coverUrl}
                        alt={item.song.title}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          borderRadius: "6px",
                        }}
                      />
                    </div>
                  )}
                  <div
                    style={{
                      textAlign: "center",
                      width: "100%",
                      marginBottom: "8px",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: "600",
                        fontSize: "14px",
                        marginBottom: "4px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.song.title}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#666",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.song.artist}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#999",
                        marginTop: "2px",
                      }}
                    >
                      {formatPlayCount(item.playCount)} plays
                    </div>
                  </div>
                  <button
                    onClick={() => handlePlaySong(item.song)}
                    className={styles.buttonPrimary}
                    style={{
                      padding: "6px 16px",
                      fontSize: "13px",
                      width: "100%",
                      borderRadius: "20px",
                    }}
                  >
                    ▶ Play
                  </button>
                </div>
              )
            )}
          </div>
        </section>
      )}

      {/* Right: Recently Played & Queue */}
      <div>
        <section className={styles.section}>
          <h3>Recently Played</h3>
          <div className={styles.recentlyPlayed}>
            {recentlyPlayed.length > 0 ? (
              recentlyPlayed.map((item) => (
                <div key={item.id} className={styles.recentlyPlayedItem}>
                  {item.song?.coverUrl && (
                    <img
                      src={item.song.coverUrl}
                      alt={item.song.title}
                      className={styles.recentlyPlayedCover}
                    />
                  )}
                  <div className={styles.recentlyPlayedInfo}>
                    <div className={styles.recentlyPlayedTitle}>
                      {item.song?.title || "Unknown"}
                    </div>
                    <div className={styles.recentlyPlayedArtist}>
                      {item.song?.artist || "Unknown Artist"}
                    </div>
                  </div>
                  <button
                    onClick={() => handlePlaySong(item.song)}
                    className={styles.recentlyPlayedButton}
                  >
                    Play
                  </button>
                </div>
              ))
            ) : (
              <div className={styles.recentlyPlayedEmpty}>
                No recently played songs
                <br />
                <small>Start playing to see history</small>
              </div>
            )}
          </div>
        </section>

        <section className={styles.section}>
          <h3>Queue ({queue.length} songs)</h3>
          <div className={styles.queueContainer}>
            {queue.length > 0 ? (
              queue.map((item, index) => (
                <div
                  key={item.id}
                  className={
                    index === currentIndex
                      ? styles.queueItemActive
                      : styles.queueItem
                  }
                >
                  <div className={styles.queueNumber}>{index + 1}</div>
                  {item.song?.coverUrl && (
                    <img
                      src={item.song.coverUrl}
                      alt={item.song.title}
                      className={styles.queueCover}
                    />
                  )}
                  <div className={styles.queueInfo}>
                    <div className={styles.queueTitle}>
                      {item.song?.title || "Unknown"}
                    </div>
                    <div className={styles.queueArtist}>
                      {item.song?.artist || "Unknown Artist"}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.queueEmpty}>
                No songs in queue
                <br />
                <small>Play a song or add to queue</small>
              </div>
            )}
          </div>
        </section>
      </div>
      {showLoginPopup && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "20px",
              padding: "48px 56px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
              textAlign: "center",
              maxWidth: "420px",
              animation: "fadeIn 0.3s ease-out",
            }}
          >
            {/* ✅ โลโก้ด้านบน */}
            <img
              src="src\assets\images\logo.png" // 🔸 import logo จาก assets ด้านบนของไฟล์ เช่น: import logo from "../assets/images/logo.png";
              alt="Lukchang Vibe Logo"
              style={{
                width: "100px",
                height: "100px",
                objectFit: "contain",
                marginBottom: "20px",
              }}
            />

            {/* ✅ ข้อความหลัก */}
            <h2
              style={{
                marginBottom: "10px",
                fontSize: "24px",
                fontWeight: 700,
                color: "#A855F7", // 💜 สีม่วงจากภาพ
              }}
            >
              This is Lukchang Vibe
            </h2>

            <p
              style={{ marginBottom: "28px", color: "#555", fontSize: "12px" }}
            >
              Create an account to enjoy with <strong>Lukchang Vibe!</strong>
            </p>

            {/* ✅ ปุ่มเดียว สีม่วง */}
            <button
              onClick={() => (window.location.href = "/signin")}
              style={{
                backgroundColor: "#A855F7",
                color: "white",
                border: "none",
                borderRadius: "10px",
                padding: "12px 28px",
                fontWeight: "600",
                fontSize: "15px",
                cursor: "pointer",
                boxShadow: "0 4px 10px rgba(168,85,247,0.4)",
                transition: "background 0.2s ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#B97DFB")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "#A855F7")
              }
            >
              Sign In / Log In
            </button>
          </div>

          <style>{`
      @keyframes fadeIn {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
    `}</style>
        </div>
      )}
    </div>
  );
};

export default Home;
