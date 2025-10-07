import { useState, useEffect, useRef } from "react";

const API_URL = "http://localhost:3000";

interface Song {
  id: string;
  youtubeVideoId: string;
  title: string;
  artist: string;
  coverUrl?: string;
  duration: number;
}

interface PlayerProps {
  userId: string;
  onQueueUpdate?: (queue: any[]) => void;
  onCurrentIndexUpdate?: (index: number) => void;
  className?: string;
}

const SharedMusicPlayer = ({ userId, onQueueUpdate, onCurrentIndexUpdate, className }: PlayerProps) => {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [debugInfo, setDebugInfo] = useState("Initializing...");
  const [apiReady, setApiReady] = useState(false);

  const playerRef = useRef<any>(null);
  const playerDivRef = useRef<HTMLDivElement>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const initAttemptedRef = useRef(false);

  // Step 1: Load YouTube IFrame API
  useEffect(() => {
    const loadYouTubeAPI = () => {
      if ((window as any).YT?.Player) {
        console.log("✅ YouTube API already available");
        setApiReady(true);
        setDebugInfo("API Ready");
        return;
      }

      if ((window as any).onYouTubeIframeAPIReady) {
        console.log("⏳ YouTube API loading...");
        setDebugInfo("Loading API...");
        return;
      }

      console.log("📺 Loading YouTube IFrame API...");
      setDebugInfo("Loading YouTube API...");

      // Define callback
      (window as any).onYouTubeIframeAPIReady = () => {
        console.log("✅ YouTube API loaded successfully!");
        setApiReady(true);
        setDebugInfo("API Loaded");
      };

      // Load script
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.onerror = () => {
        console.error("❌ Failed to load YouTube API script");
        setDebugInfo("Failed to load API");
      };
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    };

    loadYouTubeAPI();
  }, []);

  // Step 2: Initialize Player when API is ready
  useEffect(() => {
    if (!apiReady || initAttemptedRef.current || playerRef.current) {
      return;
    }

    // Ensure div exists
    if (!playerDivRef.current) {
      console.error("❌ Player div not found!");
      setDebugInfo("No player div");
      return;
    }

    initAttemptedRef.current = true;
    console.log("🎬 Creating YouTube Player...");
    setDebugInfo("Creating player...");

    try {
      // Create a unique ID for the player div
      const playerId = `youtube-player-${Date.now()}`;
      playerDivRef.current.id = playerId;

      playerRef.current = new (window as any).YT.Player(playerId, {
        height: '0',
        width: '0',
        videoId: '',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          enablejsapi: 1
        },
        events: {
          onReady: (event: any) => {
            console.log("✅ YouTube Player is ready!");
            setIsPlayerReady(true);
            setDebugInfo("Player Ready ✓");
            event.target.setVolume(volume);
          },
          onStateChange: (event: any) => {
            const YT = (window as any).YT;
            const states: any = {
              [-1]: 'UNSTARTED',
              [0]: 'ENDED',
              [1]: 'PLAYING',
              [2]: 'PAUSED',
              [3]: 'BUFFERING',
              [5]: 'CUED'
            };
            
            console.log(`🎵 State: ${states[event.data] || event.data}`);

            if (event.data === YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              setDebugInfo("▶️ Playing");
            } else if (event.data === YT.PlayerState.PAUSED) {
              setIsPlaying(false);
              setDebugInfo("⏸️ Paused");
            } else if (event.data === YT.PlayerState.ENDED) {
              setIsPlaying(false);
              setCurrentTime(0);
              setDebugInfo("⏹️ Ended");
              if (!isLooping) {
                handleNext();
              }
            } else if (event.data === YT.PlayerState.BUFFERING) {
              setDebugInfo("⏳ Buffering...");
            } else if (event.data === YT.PlayerState.CUED) {
              setDebugInfo("📋 Cued");
            }
          },
          onError: (event: any) => {
            const errors: any = {
              2: 'Invalid video ID',
              5: 'HTML5 player error',
              100: 'Video not found',
              101: 'Video not allowed in embedded player',
              150: 'Video not allowed in embedded player'
            };
            console.error(`❌ Player Error: ${errors[event.data] || event.data}`);
            setDebugInfo(`Error: ${errors[event.data] || 'Unknown'}`);
          }
        }
      });

      console.log("✅ Player object created");
    } catch (error) {
      console.error("❌ Error creating player:", error);
      setDebugInfo("Creation failed!");
      initAttemptedRef.current = false; // Allow retry
    }
  }, [apiReady, volume, isLooping]);

  // Handle loop
  useEffect(() => {
    if (!playerRef.current || !isPlayerReady || !currentSong || !isLooping) return;

    const checkLoop = setInterval(() => {
      try {
        const current = playerRef.current.getCurrentTime();
        const total = playerRef.current.getDuration();
        
        if (total && current >= total - 1) {
          console.log("🔁 Looping...");
          playerRef.current.seekTo(0);
          playerRef.current.playVideo();
        }
      } catch (e) {
        // Silent fail
      }
    }, 500);

    return () => clearInterval(checkLoop);
  }, [isLooping, currentSong, isPlayerReady]);

  // Update progress
  useEffect(() => {
    if (!isPlaying || !isPlayerReady) return;
    
    const interval = setInterval(() => {
      try {
        const current = playerRef.current?.getCurrentTime();
        const total = playerRef.current?.getDuration();
        if (current !== undefined) setCurrentTime(current);
        if (total !== undefined) setDuration(total);
      } catch (e) {
        // Silent fail
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isPlaying, isPlayerReady]);

  // Load queue
  const loadQueue = async () => {
    if (!userId) return;
    
    try {
      const res = await fetch(`${API_URL}/player/queue/${userId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setQueue(data);
      if (onQueueUpdate) onQueueUpdate(data);
    } catch (err) {
      console.error("❌ Load queue failed:", err);
    }
  };

  useEffect(() => {
    if (userId) loadQueue();
  }, [userId]);

  // Expose global functions
  useEffect(() => {
    const playSong = async (song: Song) => {
      console.log("🎵 Play requested:", song.title);
      
      if (!isPlayerReady) {
        alert("Player is not ready yet. Please wait a moment and try again.");
        console.error("❌ Player not ready");
        return;
      }

      try {
        const res = await fetch(`${API_URL}/player/play-song`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, songId: song.id }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        
        console.log("✅ Song data received:", data.song.title);
        
        setCurrentSong(data.song);
        setQueue(data.queue.map((s: Song, i: number) => ({
          id: s.id,
          queueIndex: i,
          source: 'manual',
          song: s
        })));
        setCurrentIndex(0);
        
        if (onQueueUpdate) {
          onQueueUpdate(data.queue.map((s: Song, i: number) => ({
            id: s.id,
            queueIndex: i,
            source: 'manual',
            song: s
          })));
        }
        if (onCurrentIndexUpdate) onCurrentIndexUpdate(0);

        // Load and play video
        if (playerRef.current && isPlayerReady) {
          console.log("🎬 Loading video:", data.song.youtubeVideoId);
          
          // Use cueVideoById first, then play (more reliable)
          playerRef.current.cueVideoById({
            videoId: data.song.youtubeVideoId,
            startSeconds: 0
          });
          
          // Small delay before playing
          setTimeout(() => {
            console.log("▶️ Starting playback");
            playerRef.current.playVideo();
          }, 300);
        }

        loadQueue();
      } catch (err) {
        console.error("❌ Play song failed:", err);
        alert(`Failed to play song: ${err}`);
      }
    };

    const addToQueue = async (song: Song) => {
        console.log("➕ Add to queue:", song.title);

        try {
            const res = await fetch(`${API_URL}/player/queue/add`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, songId: song.id }),
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            // ถ้าเป็นเพลงแรก -> เล่นทันที
            if (data.autoPlay) {
            setCurrentSong(data.song);
            setCurrentIndex(0);

            const player = playerRef.current;
            if (player && isPlayerReady) {
                console.log("🎬 Autoplay first song:", data.song.youtubeVideoId);
                player.loadVideoById({
                videoId: data.song.youtubeVideoId,
                startSeconds: 0,
                });
                player.playVideo();
            } else {
                console.warn("⚠️ Player not ready yet, retrying...");
                const retry = setInterval(() => {
                if (playerRef.current && isPlayerReady) {
                    clearInterval(retry);
                    playerRef.current.loadVideoById({
                    videoId: data.song.youtubeVideoId,
                    startSeconds: 0,
                    });
                    playerRef.current.playVideo();
                    console.log("▶️ Player ready, started playback");
                }
                }, 300);
            }
            }

            // โหลดคิวใหม่
            loadQueue();
        } catch (err) {
            console.error("❌ Add to queue failed:", err);
        }
        };

    (window as any).musicPlayer = { playSong, addToQueue };
    console.log("✅ Global musicPlayer created");
  }, [userId, isPlayerReady]);

  const handleNext = async () => {
    if (!userId) return;

    try {
      const res = await fetch(`${API_URL}/player/next`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      if (data.song && playerRef.current && isPlayerReady) {
        setCurrentSong(data.song);
        setCurrentIndex(data.currentIndex);
        if (onCurrentIndexUpdate) onCurrentIndexUpdate(data.currentIndex);
        
        playerRef.current.cueVideoById({
          videoId: data.song.youtubeVideoId,
          startSeconds: 0
        });
        
        setTimeout(() => {
          playerRef.current.playVideo();
        }, 300);
        
        loadQueue();
      }
    } catch (err) {
      console.error("❌ Next failed:", err);
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

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      if (data.song && playerRef.current && isPlayerReady) {
        setCurrentSong(data.song);
        setCurrentIndex(data.currentIndex);
        if (onCurrentIndexUpdate) onCurrentIndexUpdate(data.currentIndex);
        
        playerRef.current.cueVideoById({
          videoId: data.song.youtubeVideoId,
          startSeconds: 0
        });
        
        setTimeout(() => {
          playerRef.current.playVideo();
        }, 300);
        
        loadQueue();
      }
    } catch (err) {
      console.error("❌ Previous failed:", err);
    }
  };

  const togglePlayPause = () => {
    if (!playerRef.current || !isPlayerReady || !currentSong) {
      console.log("⚠️ Cannot toggle - not ready");
      return;
    }

    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current || !isPlayerReady || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    
    playerRef.current.seekTo(newTime, true);
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    
    if (playerRef.current && isPlayerReady) {
      playerRef.current.setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = () => {
    if (!playerRef.current || !isPlayerReady) return;

    if (isMuted) {
      playerRef.current.unMute();
      playerRef.current.setVolume(volume);
      setIsMuted(false);
    } else {
      playerRef.current.mute();
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
    <>
      {/* Hidden YouTube Player */}
      <div 
        ref={playerDivRef}
        style={{ 
          position: 'fixed',
          bottom: '-100px',
          left: '-100px',
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none',
          overflow: 'hidden'
        }} 
      />
      
      {/* Debug Info */}
      <div style={{
        position: 'fixed',
        top: 10,
        right: 10,
        background: isPlayerReady ? 'rgba(29, 185, 84, 0.9)' : 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '11px',
        zIndex: 9999,
        fontFamily: 'monospace',
        maxWidth: '250px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
      }}>
        <div><strong>Status:</strong> {debugInfo}</div>
        <div><strong>API:</strong> {apiReady ? '✅ Ready' : '⏳ Loading'}</div>
        <div><strong>Player:</strong> {isPlayerReady ? '✅ Ready' : '⏳ Initializing'}</div>
        {currentSong && (
          <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.3)' }}>
            <div style={{ fontSize: '10px', opacity: 0.8 }}>Now: {currentSong.title.substring(0, 30)}...</div>
          </div>
        )}
      </div>

      {/* Music Player UI */}
      {currentSong && (
        <div className={className} style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#fff',
          borderTop: '1px solid #ddd',
          padding: '16px',
          zIndex: 1000,
          boxShadow: '0 -2px 10px rgba(0,0,0,0.1)'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              {/* Song Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '0 0 300px' }}>
                {currentSong.coverUrl && (
                  <img 
                    src={currentSong.coverUrl} 
                    alt={currentSong.title}
                    style={{ width: '56px', height: '56px', borderRadius: '4px', objectFit: 'cover' }}
                  />
                )}
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {currentSong.title}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {currentSong.artist}
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button 
                  onClick={handlePrevious}
                  disabled={!isPlayerReady}
                  style={{ background: 'none', border: 'none', fontSize: '24px', cursor: isPlayerReady ? 'pointer' : 'not-allowed', padding: '8px', opacity: isPlayerReady ? 1 : 0.5 }}
                  title="Previous"
                >
                  ⮜
                </button>

                <button 
                  onClick={togglePlayPause}
                  disabled={!isPlayerReady}
                  style={{ 
                    background: isPlayerReady ? '#1db954' : '#ccc', 
                    border: 'none', 
                    borderRadius: '50%', 
                    width: '48px', 
                    height: '48px', 
                    fontSize: '20px', 
                    cursor: isPlayerReady ? 'pointer' : 'not-allowed',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.1s'
                  }}
                  onMouseDown={(e) => isPlayerReady && (e.currentTarget.style.transform = 'scale(0.95)')}
                  onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {isPlaying ? "⏸" : "▶"}
                </button>

                <button 
                  onClick={handleNext}
                  disabled={!isPlayerReady}
                  style={{ background: 'none', border: 'none', fontSize: '24px', cursor: isPlayerReady ? 'pointer' : 'not-allowed', padding: '8px', opacity: isPlayerReady ? 1 : 0.5 }}
                  title="Next"
                >
                  ⮞
                </button>

                <button 
                  onClick={toggleLoop}
                  disabled={!isPlayerReady}
                  style={{ 
                    background: isLooping ? 'rgba(29, 185, 84, 0.1)' : 'transparent',
                    border: 'none', 
                    fontSize: '20px', 
                    cursor: isPlayerReady ? 'pointer' : 'not-allowed', 
                    padding: '8px',
                    color: isLooping ? '#1db954' : '#666',
                    borderRadius: '4px',
                    opacity: isPlayerReady ? 1 : 0.5
                  }}
                  title={isLooping ? "Loop: On" : "Loop: Off"}
                >
                  🔁
                </button>
              </div>

              {/* Volume */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 0 150px' }}>
                <button 
                  onClick={toggleMute}
                  disabled={!isPlayerReady}
                  style={{ background: 'none', border: 'none', fontSize: '20px', cursor: isPlayerReady ? 'pointer' : 'not-allowed', opacity: isPlayerReady ? 1 : 0.5 }}
                >
                  {isMuted || volume === 0 ? "🔇" : volume < 50 ? "🔉" : "🔊"}
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  disabled={!isPlayerReady}
                  style={{ flex: 1, cursor: isPlayerReady ? 'pointer' : 'not-allowed', opacity: isPlayerReady ? 1 : 0.5 }}
                />
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#666', minWidth: '40px' }}>
                {formatTime(currentTime)}
              </span>
              <div 
                onClick={handleSeek}
                style={{ 
                  flex: 1, 
                  height: '6px', 
                  backgroundColor: '#ddd', 
                  borderRadius: '3px', 
                  cursor: isPlayerReady ? 'pointer' : 'not-allowed',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div 
                  style={{ 
                    height: '100%', 
                    backgroundColor: '#1db954', 
                    width: `${duration ? (currentTime / duration) * 100 : 0}%`,
                    transition: 'width 0.1s'
                  }}
                />
              </div>
              <span style={{ fontSize: '12px', color: '#666', minWidth: '40px', textAlign: 'right' }}>
                {formatTime(duration)}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SharedMusicPlayer;