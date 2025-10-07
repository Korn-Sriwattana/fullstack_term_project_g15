import { useState, useEffect } from "react";
import { useUser } from "../components/userContext";
import MusicPlayer from "../components/MusicPlayer";
import styles from "../assets/styles/MusicStreaming.module.css";
import type { Song, QueueItem } from "../types/song.ts";

const API_URL = "http://localhost:3000";

const Home = () => {
  const { setUser, user } = useUser();
  const userId = user?.id || "";

  const [userName, setUserName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [recentlyPlayed, setRecentlyPlayed] = useState<any[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Real-time search with debounce
  useEffect(() => {
    const searchSongs = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/songs/search?q=${encodeURIComponent(searchQuery)}`);
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

  const handleCreateUser = async () => {
    if (!userName.trim()) {
      alert("Please enter a name");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: userName,
          email: `${Date.now()}@test.com`,
          password: "1234",
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      setUserName(data.name);

      console.log("User created:", data);
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

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      const res = await fetch(`${API_URL}/songs/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error("Search failed:", err);
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
      const res = await fetch(`${API_URL}/player/recently-played/${userId}?limit=10`);
      const data = await res.json();
      setRecentlyPlayed(data);
    } catch (err) {
      console.error("Load recently played failed:", err);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className={styles.container}>
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
        <p className={styles.userInfo}>Current User: {user?.name || "Not created"}</p>
      </section>

      <section className={styles.section}>
        <h3>Add Song</h3>
        <input
          type="text"
          placeholder="Paste YouTube link"
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
        />
        <button onClick={handleAdd} className={styles.buttonPrimary}>
          Add
        </button>
      </section>

      {/* Search  Recently Played */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Left: Search */}
        <div>
          <section className={styles.section}>
            <h3>Search Songs</h3>
            <div className={styles.searchForm}>
              <input
                type="text"
                placeholder="Search by title or artist..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className={styles.inputLarge}
              />
              <button onClick={handleSearch} className={styles.buttonSecondary}>
                Search
              </button>
            </div>
          </section>

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
                    style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
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
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button 
                        onClick={() => handlePlaySong(song)}
                        className={styles.buttonPrimary}
                        style={{ padding: '6px 12px', fontSize: '13px' }}
                      >
                        Play
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleAddToQueue(song); }}
                        className={styles.buttonSecondary}
                        style={{ padding: '6px 12px', fontSize: '13px' }}
                      >
                        + Queue
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

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
                        {item.song?.title || 'Unknown'}
                      </div>
                      <div className={styles.recentlyPlayedArtist}>
                        {item.song?.artist || 'Unknown Artist'}
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
                    className={index === currentIndex ? styles.queueItemActive : styles.queueItem}
                  >
                    <div className={styles.queueNumber}>
                      {index + 1}
                    </div>
                    {item.song?.coverUrl && (
                      <img 
                        src={item.song.coverUrl} 
                        alt={item.song.title}
                        className={styles.queueCover}
                      />
                    )}
                    <div className={styles.queueInfo}>
                      <div className={styles.queueTitle}>
                        {item.song?.title || 'Unknown'}
                      </div>
                      <div className={styles.queueArtist}>
                        {item.song?.artist || 'Unknown Artist'}
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
      </div>

      {userId && (
        <MusicPlayer 
          userId={userId}
          onQueueUpdate={setQueue}
          onCurrentIndexUpdate={setCurrentIndex}
        />
      )}
    </div>
  );
};

export default Home;