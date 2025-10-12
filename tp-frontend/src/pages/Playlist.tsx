// src/pages/Home.tsx
import { useState, useEffect, useRef } from "react";
import { useUser } from "../components/userContext";
import styles from "../assets/styles/Home.module.css";
import type { Song, QueueItem } from "../types/song.ts";
import LikeButton from "../components/LikeButton";
import AddToPlaylistButton from "../components/AddToPlaylist";

import styles from "../assets/styles/Playlist.module.css";
import modalStyles from "../assets/styles/CreatePlaylistModal.module.css";


import searchIcon from "../assets/images/search-icon.png";
import { authClient } from "../lib/auth-client.ts";
import { useNavigate } from "react-router-dom";
import { useApi } from "../lib/api";

const API_URL = "http://localhost:3000";

interface HomeProps {
  queue?: QueueItem[];
  currentIndex?: number;
}

const Home = ({ queue = [], currentIndex = 0 }: HomeProps) => {
  const { setUser, user } = useUser();
  const userId = user?.id || "";
  const { apiFetch } = useApi();

  const [userName, setUserName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [recentlyPlayed, setRecentlyPlayed] = useState<any[]>([]);
  const [popularSongs, setPopularSongs] = useState<any[]>([]);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showAllPopular, setShowAllPopular] = useState(false);
  const quickAddRef = useRef<HTMLDivElement>(null);
  const { data: session, isPending } = authClient.useSession();
  const [showPopup, setShowPopup] = useState(false);
  const navigate = useNavigate();

  // ✅ ตรวจสอบสถานะ login
  useEffect(() => {
    if (!isPending && !session?.user) {
      setShowPopup(true);
    } else if (session?.user && !user) {
      setUser({
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      });
    }
  }, [session, isPending]);

  // ✅ ค้นหาเพลงแบบ realtime (debounce)
  useEffect(() => {
    const searchSongs = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        const data = await apiFetch(
          `/songs/search?q=${encodeURIComponent(searchQuery)}`
        );
        setSearchResults(data);
      } catch (err) {
        console.error("Search failed:", err);
      }
    };

    const timeoutId = setTimeout(() => {
      searchSongs();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, apiFetch]);

  // ✅ โหลด recently played เมื่อ user เปลี่ยน
  useEffect(() => {
    if (userId) {
      loadRecentlyPlayed();
    }
  }, [userId]);

  // ✅ โหลด popular songs ตอนเปิดหน้า
  useEffect(() => {
    loadPopularSongs();
  }, []);

  const handleCreateUser = async () => {
    if (!userName.trim()) {
      alert("Please enter a name");
      return;
    }

    try {
      const data = await apiFetch("/users", {
        method: "POST",
        body: JSON.stringify({
          name: userName,
          email: `${Date.now()}@test.com`,
          password: "1234",
        }),
      });

      setUserName(data.name);
      setUser({
        id: data.id,
        name: data.name,
        email: data.email,
      });

      alert(`User created: ${data.name}`);
    } catch (err) {
      console.error("Create user failed:", err);
      alert("Failed to create user, check console for details.");
    }
  };

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

    try {
      const song = await apiFetch("/songs/add", {
        method: "POST",
        body: JSON.stringify({
          youtubeVideoId: videoId,
        }),
      });

      if (!song.id) {
        alert("Failed to add/find song");
        return;
      }

      setYoutubeUrl("");
      alert("Song added!");
    } catch (err) {
      console.error("Add song failed:", err);
    }
  };

  const handlePlaySong = async (song: Song) => {
    if (!userId) {
      alert("Please create user first");
      return;
    }

    if ((window as any).musicPlayer) {
      await (window as any).musicPlayer.playSong(song);
      loadRecentlyPlayed();
      loadPopularSongs();
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
      const data = await apiFetch(`/player/recently-played/${userId}?limit=10`);
      setRecentlyPlayed(data);
    } catch (err) {
      console.error("Load recently played failed:", err);
    }
  };

  const loadPopularSongs = async () => {
    try {
      const data = await apiFetch("/songs/popular?limit=20");
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

  // ✅ ปิด Quick Add เมื่อคลิกข้างนอก / กด ESC
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
                          onLikeChange={async () => {
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

      {/* Create User */}
      <section className={styles.section}>
        <h3>Create User (Test)</h3>
        <input
          type="text"
          placeholder="Enter your name"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          className={styles.inputSmall}
        />
        <button onClick={handleCreateUser} className={styles.buttonPrimary}>
          Create User
        </button>
        <p className={styles.userInfo}>
          Current User: {user?.name || "Not created"}
        </p>
      </section>

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

      {/* Recently Played & Queue */}
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

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <div className={modalStyles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={modalStyles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={modalStyles.modalTitle}>Create New Playlist</h2>
            
            <div className={modalStyles.coverUploadSection}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverSelect}
                style={{ display: 'none' }}
              />
              
              <div className={modalStyles.coverUploadBox} onClick={() => fileInputRef.current?.click()}>
                {coverPreview ? (
                  <img src={coverPreview} alt="Preview" className={modalStyles.coverPreview} />
                ) : (
                  <div className={modalStyles.coverUploadPlaceholder}>
                    <div>
                      <div style={{ fontSize: '32px' }}>📷</div>
                      <div style={{ fontSize: '12px', marginTop: '4px' }}>
                        {uploadingCover ? 'Uploading...' : 'Add Cover'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <small className={modalStyles.coverUploadHint}>
                Click to upload cover image (Max 5MB)
              </small>
            </div>

            <div className={modalStyles.formGroup}>
              <label className={modalStyles.formLabel}>
                Playlist Name *
              </label>
              <input
                type="text"
                placeholder="My Awesome Playlist"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                className={modalStyles.formInput}
                autoFocus
              />
            </div>

            <div className={modalStyles.formGroup}>
              <label className={modalStyles.formLabel}>
                Description (optional)
              </label>
              <textarea
                placeholder="Describe your playlist..."
                value={newPlaylistDesc}
                onChange={(e) => setNewPlaylistDesc(e.target.value)}
                rows={3}
                className={modalStyles.formTextarea}
              />
            </div>

            <div className={modalStyles.formGroup}>
              <label className={modalStyles.formLabel}>
                Privacy
              </label>
              <select
                value={newPlaylistIsPublic ? "public" : "private"}
                onChange={(e) => setNewPlaylistIsPublic(e.target.value === "public")}
                className={modalStyles.formSelect}
              >
                <option value="public">🌐 Public</option>
                <option value="private">🔒 Private</option>
              </select>
              <small className={modalStyles.privacyHint}>
                {newPlaylistIsPublic 
                  ? 'This playlist will appear in your profile and be accessible to others' 
                  : 'Only you can access this playlist'}
              </small>
            </div>

            <div className={modalStyles.modalActions}>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewPlaylistName("");
                  setNewPlaylistDesc("");
                  setNewPlaylistIsPublic(true);
                  setNewPlaylistCoverUrl("");
                  setCoverPreview(null);
                }}
                className={modalStyles.buttonSecondary}
                style={{ padding: '10px 20px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePlaylist}
                disabled={uploadingCover}
                className={modalStyles.buttonPrimary}
                style={{ 
                  padding: '10px 20px',
                  opacity: uploadingCover ? 0.5 : 1,
                  cursor: uploadingCover ? 'not-allowed' : 'pointer'
                }}
              >
                {uploadingCover ? 'Uploading...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Toast Notification */}
      {showToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#282828',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'slideUp 0.3s ease-out',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* CSS Animation */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default Home;
