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

interface QueueItem {
  id: string;
  queueIndex: number;
  source: string;
  song: Song;
}

const MusicStreaming = () => {
  const { setUser, user } = useUser();
  const userId = user?.id || "";

  const [userName, setUserName] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
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
  const [recentlyPlayed, setRecentlyPlayed] = useState<any[]>([]);

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
                // Auto play next (ถ้าไม่เปิด loop)
                if (!isLooping) {
                  handleNext();
                }
              }
            },
          },
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [volume, isLooping]);

  // Handle loop separately
  useEffect(() => {
    if (!playerRef.current || !isPlayerReady) return;

    const checkLoop = setInterval(() => {
      const player = playerRef.current;
      if (!player || !currentSong || !isLooping) return;

      try {
        const current = player.getCurrentTime();
        const total = player.getDuration();
        
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

    const timeoutId = setTimeout(() => {
      searchSongs();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    if (userId) {
      loadQueue();
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

  const loadQueue = async () => {
    if (!userId) return;
    
    try {
      const res = await fetch(`${API_URL}/player/queue/${userId}`);
      const data = await res.json();
      setQueue(data);
    } catch (err) {
      console.error("Load queue failed:", err);
    }
  };

  const handlePlaySong = async (song: Song) => {
    if (!userId) {
      alert("Please create user first");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/player/play-song`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, songId: song.id }),
      });

      const data = await res.json();
      setCurrentSong(data.song);
      setQueue(data.queue.map((s: Song, i: number) => ({
        id: s.id,
        queueIndex: i,
        source: 'manual',
        song: s
      })));
      setCurrentIndex(0);

      const player = playerRef.current;
      if (player && isPlayerReady) {
        currentVideoIdRef.current = data.song.youtubeVideoId;
        player.loadVideoById({ videoId: data.song.youtubeVideoId, startSeconds: 0 });
        player.playVideo();
      }

      
      loadRecentlyPlayed();
    } catch (err) {
      console.error("Play song failed:", err);
    }
  };

  const handleAddToQueue = async (song: Song) => {
    if (!userId) {
      alert("Please create user first");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/player/queue/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, songId: song.id }),
      });

      const data = await res.json();

      // ถ้าเป็นเพลงแรก ให้เล่นทันที
      if (data.autoPlay) {
        setCurrentSong(data.song);
        setCurrentIndex(0);

        const player = playerRef.current;
        if (player && isPlayerReady) {
          currentVideoIdRef.current = data.song.youtubeVideoId;
          player.loadVideoById({ videoId: data.song.youtubeVideoId, startSeconds: 0 });
          player.playVideo();
        }

        alert("Added to queue and started playing!");
      } else {
        alert("Added to queue!");
      }

      loadQueue();
      loadRecentlyPlayed();
    } catch (err) {
      console.error("Add to queue failed:", err);
    }
  };

  const handleNext = async () => {
    if (!userId) return;

    try {
      const res = await fetch(`${API_URL}/player/next`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();
      
      if (data.song) {
        setCurrentSong(data.song);
        setCurrentIndex(data.currentIndex);
        
        const player = playerRef.current;
        if (player && isPlayerReady) {
          currentVideoIdRef.current = data.song.youtubeVideoId;
          player.loadVideoById({ videoId: data.song.youtubeVideoId, startSeconds: 0 });
          player.playVideo();
        }
        
        loadQueue();
        loadRecentlyPlayed();
      } else {
        console.log("End of queue");
      }
    } catch (err) {
      console.error("Next failed:", err);
    }
  };

  const handlePrevious = async () => {
    if (!userId) return;

    try {
      const res = await fetch(`${API_URL}/player/previous`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();
      
      if (data.song) {
        setCurrentSong(data.song);
        setCurrentIndex(data.currentIndex);
        
        const player = playerRef.current;
        if (player && isPlayerReady) {
          currentVideoIdRef.current = data.song.youtubeVideoId;
          player.loadVideoById({ videoId: data.song.youtubeVideoId, startSeconds: 0 });
          player.playVideo();
        }
        
        loadQueue();
        loadRecentlyPlayed();
      }
    } catch (err) {
      console.error("Previous failed:", err);
    }
  };

  // โหลด Recently Played
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

  useEffect(() => {
    if (userId) {
      loadRecentlyPlayed();
    }
  }, [userId]);

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

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className={styles.container}>
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

      {/* ✅ แสดง Queue และ Search ข้างกัน */}
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
                    className={currentSong?.id === song.id ? styles.resultItemActive : styles.resultItem}
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
                    {/* ✅ ปุ่ม Play และ Add to Queue */}
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button 
                        onClick={() => handlePlaySong(song)}
                        className={styles.buttonPrimary}
                        style={{ padding: '6px 12px', fontSize: '13px' }}
                      >
                        ▶ Play
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
                    ▶
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

              <div className={styles.controls}>
                <button onClick={handlePrevious} className={styles.controlButton} title="Previous">
                  ⏮
                </button>

                <button onClick={togglePlayPause} className={styles.playButton}>
                  {isPlaying ? "⏸" : "▶"}
                </button>

                <button onClick={handleNext} className={styles.controlButton} title="Next">
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