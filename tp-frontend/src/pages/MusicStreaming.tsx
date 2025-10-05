import { useState, useEffect, useRef } from "react";
import { useUser } from "../components/userContext";
import styles from "../assets/styles/MusicStreaming.module.css";

const API_URL = "http://localhost:3000";

interface Song {
  id: string;
  youtubeVideoId: string;
  title: string;
  artist: string;
  coverUrl?: string;
  duration: number;
}

const MusicStreaming = () => {
  const { setUser, user } = useUser();
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);

  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const currentVideoIdRef = useRef("");
  const [youtubeUrl, setYoutubeUrl] = useState("");

  // Load YouTube API
  useEffect(() => {
    if (!(window as any).YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }
  }, []);

  // Initialize player
  useEffect(() => {
    if (playerRef.current) return;

    const interval = setInterval(() => {
      if ((window as any).YT && (window as any).YT.Player && !playerRef.current) {
        clearInterval(interval);

        playerRef.current = new (window as any).YT.Player(containerRef.current, {
          videoId: "",
          playerVars: { 
            autoplay: 0, 
            controls: 0,
            modestbranding: 1,
            rel: 0,
            enablejsapi: 1
          },
          events: {
            onReady: (event: any) => {
              setIsPlayerReady(true);
              event.target.setVolume(volume);
            },
            onStateChange: (event: any) => {
              const YT = (window as any).YT;
              if (event.data === YT.PlayerState.PLAYING) {
                setIsPlaying(true);
              } else if (event.data === YT.PlayerState.PAUSED) {
                setIsPlaying(false);
              } else if (event.data === YT.PlayerState.ENDED) {
                setIsPlaying(false);
                setCurrentTime(0);
              }
            },
          },
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [volume]);

  // Handle loop separately
  useEffect(() => {
    if (!playerRef.current || !isPlayerReady) return;

    const checkLoop = setInterval(() => {
      const player = playerRef.current;
      if (!player || !currentSong || !isLooping) return;

      try {
        const current = player.getCurrentTime();
        const total = player.getDuration();
        
        // ถ้าใกล้จบแล้ว (เหลือ 1 วินาที) ให้เริ่มใหม่
        if (total && current >= total - 1) {
          player.seekTo(0);
          player.playVideo();
        }
      } catch (e) {}
    }, 500);

    return () => clearInterval(checkLoop);
  }, [isLooping, currentSong, isPlayerReady]);

  // Update progress
  useEffect(() => {
    if (!isPlaying || !isPlayerReady) return;
    
    const interval = setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      
      try {
        const current = player.getCurrentTime();
        const total = player.getDuration();
        if (current !== undefined) setCurrentTime(current);
        if (total !== undefined) setDuration(total);
      } catch (e) {}
    }, 500);

    return () => clearInterval(interval);
  }, [isPlaying, isPlayerReady]);

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

    // Debounce: รอ 300ms หลังจากพิมพ์หยุด
    const timeoutId = setTimeout(() => {
      searchSongs();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

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

      setUserId(data.id);
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

  const handlePlaySong = (song: Song) => {
    const player = playerRef.current;
    if (!player || !isPlayerReady) return;

    if (currentVideoIdRef.current === song.youtubeVideoId && isPlaying) {
      player.pauseVideo();
      return;
    }

    currentVideoIdRef.current = song.youtubeVideoId;
    setCurrentSong(song);
    
    player.loadVideoById({
      videoId: song.youtubeVideoId,
      startSeconds: 0,
    });
    player.playVideo();
  };

  const togglePlayPause = () => {
    const player = playerRef.current;
    if (!player || !isPlayerReady || !currentSong) return;

    if (isPlaying) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const player = playerRef.current;
    if (!player || !isPlayerReady || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    
    player.seekTo(newTime, true);
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const player = playerRef.current;
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    
    if (player && isPlayerReady) {
      player.setVolume(newVolume);
      if (newVolume === 0) {
        setIsMuted(true);
      } else if (isMuted) {
        setIsMuted(false);
      }
    }
  };

  const toggleMute = () => {
    const player = playerRef.current;
    if (!player || !isPlayerReady) return;

    if (isMuted) {
      player.unMute();
      player.setVolume(volume);
      setIsMuted(false);
    } else {
      player.mute();
      setIsMuted(true);
    }
  };

  const toggleLoop = () => {
    setIsLooping(!isLooping);
  };

  const skipBackward = () => {
    const player = playerRef.current;
    if (!player || !isPlayerReady) return;
    const newTime = Math.max(0, currentTime - 10);
    player.seekTo(newTime, true);
  };

  const skipForward = () => {
    const player = playerRef.current;
    if (!player || !isPlayerReady || !duration) return;
    const newTime = Math.min(duration, currentTime + 10);
    player.seekTo(newTime, true);
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className={styles.container}>
      {/* ซ่อนวิดีโอ YouTube */}
      <div ref={containerRef} style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }} />

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
          ➕ Add
        </button>
      </section>

      {/* Search */}
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

      {/* No Results */}
      {searchResults.length === 0 && searchQuery.trim() !== "" && (
        <section className={styles.section}>
          <h3>Search Results</h3>
          <p className={styles.noResults}>No results found.</p>
        </section>
      )}

      {/* Results */}
      {searchResults.length > 0 && (
        <section className={styles.section}>
          <h3>Search Results</h3>
          <div className={styles.resultsList}>
            {searchResults.map((song) => (
              <div
                key={song.id}
                onClick={() => handlePlaySong(song)}
                className={currentSong?.id === song.id ? styles.resultItemActive : styles.resultItem}
              >
                {song.coverUrl && (
                  <img 
                    src={song.coverUrl} 
                    alt={song.title}
                    className={styles.resultCover}
                  />
                )}
                <div className={styles.resultInfo}>
                  <div className={styles.resultTitle}>{song.title}</div>
                  <div className={styles.resultArtist}>{song.artist}</div>
                </div>
                <div className={styles.resultDuration}>
                  {formatTime(song.duration)}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Bottom Player */}
      {currentSong && (
        <div className={styles.player}>
          <div className={styles.playerContent}>
            <div className={styles.playerTop}>
              {/* Song Info */}
              <div className={styles.songInfo}>
                {currentSong.coverUrl && (
                  <img 
                    src={currentSong.coverUrl} 
                    alt={currentSong.title}
                    className={styles.songCover}
                  />
                )}
                <div>
                  <div className={styles.songTitle}>{currentSong.title}</div>
                  <div className={styles.songArtist}>{currentSong.artist}</div>
                </div>
              </div>

              {/* Controls */}
              <div className={styles.controls}>
                <button onClick={skipBackward} className={styles.controlButton}>
                  ⏮
                </button>
                <button onClick={togglePlayPause} className={styles.playButton}>
                  {isPlaying ? "⏸" : "▶"}
                </button>
                <button onClick={skipForward} className={styles.controlButton}>
                  ⏭
                </button>
                <button 
                  onClick={toggleLoop} 
                  className={styles.controlButton}
                  style={{ 
                    color: isLooping ? '#1db954' : '#333', 
                    fontWeight: isLooping ? 'bold' : 'normal',
                    background: isLooping ? 'rgba(29, 185, 84, 0.1)' : 'transparent',
                    borderRadius: '4px',
                    padding: '4px 8px'
                  }}
                  title={isLooping ? "Loop: On" : "Loop: Off"}
                >
                🔁
                </button>
              </div>

              {/* Volume */}
              <div className={styles.volume}>
                <button onClick={toggleMute} className={styles.volumeButton}>
                  {isMuted || volume === 0 ? "🔇" : volume < 50 ? "🔉" : "🔊"}
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className={styles.volumeSlider}
                />
              </div>
            </div>

            {/* Progress Bar */}
            <div className={styles.progress}>
              <span className={styles.progressTime}>
                {formatTime(currentTime)}
              </span>
              <div onClick={handleSeek} className={styles.progressBar}>
                <div 
                  className={styles.progressFill}
                  style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
              <span className={styles.progressTimeEnd}>
                {formatTime(duration)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MusicStreaming;