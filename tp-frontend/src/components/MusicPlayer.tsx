import { useState, useEffect, useRef } from "react";  
import type { Song } from "../types/song.ts";
import { useUser } from "../components/userContext";
import LikeButton from "./LikeButton";
import AddToPlaylist from "./AddToPlaylist";
// css
import styles from "../assets/styles/MusicPlayer.module.css";
// images
import playPng from "../assets/images/playMusic/play-icon.png";
import pausePng from "../assets/images/playMusic/pause-icon.png";
import loopPng from "../assets/images/playMusic/loop-icon.png";
import volMutePng from "../assets/images/playMusic/volume-mute.png";
import volLowPng from "../assets/images/playMusic/volume-low.png";
import volHighPng from "../assets/images/playMusic/volume-high.png";
import prevPng from "../assets/images/playMusic/prev-icon.png";
import nextPng from "../assets/images/playMusic/next-icon.png";

const API_URL = "http://localhost:3000";

interface PlayerProps {
  userId: string;
  onQueueUpdate?: (queue: any[]) => void;
  onCurrentIndexUpdate?: (index: number) => void;
  className?: string;
}

const MusicPlayer = ({ userId, onQueueUpdate, onCurrentIndexUpdate, className }: PlayerProps) => {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { user } = useUser();
  
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

  // Handle loop and auto-next
  useEffect(() => {
    if (!playerRef.current || !isPlayerReady || !currentSong) return;

    const checkPlayback = setInterval(() => {
      try {
        const current = playerRef.current.getCurrentTime();
        const total = playerRef.current.getDuration();
        
        // Check if song is near end (within 1 second)
        if (total && current >= total - 1) {
          if (isLooping) {
            console.log("🔁 Looping...");
            playerRef.current.seekTo(0);
            playerRef.current.playVideo();
          } else {
            console.log("⏭️ Song ended, playing next...");
            // Clear interval to prevent multiple calls
            clearInterval(checkPlayback);
            handleNext();
          }
        }
      } catch (e) {
        // Silent fail
      }
    }, 500);

    return () => clearInterval(checkPlayback);
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

        if (playerRef.current && isPlayerReady) {
          console.log("🎬 Loading video:", data.song.youtubeVideoId);
          playerRef.current.cueVideoById({
            videoId: data.song.youtubeVideoId,
            startSeconds: 0
          });
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
        className={styles.hiddenPlayer} 
      />
      
      {/* Debug Info */}
      {/* <div style={{
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
      </div> */}

      {/* Music Player UI */}
       {currentSong && (
        <div className={`${className ? className + " " : ""}${styles.player}`}>
          <div className={styles.inner}>
            <div className={styles.topRow}>
              {/* Song Info */}
              <div className={styles.songInfo}>
                {currentSong.coverUrl && (
                  <img 
                    src={currentSong.coverUrl} 
                    alt={currentSong.title}
                    className={styles.cover}
                  />
                )}
                <div className={styles.meta}>
                  <div className={styles.title}>
                    {currentSong.title}
                  </div>
                  <div className={styles.artist}>
                    {currentSong.artist}
                  </div>
                </div>
              </div>

              {user?.id && (
              <>
                <AddToPlaylist
                  userId={user.id} 
                  song={currentSong}
                  iconOnly={false}
                  buttonStyle={{ padding: '6px 12px', fontSize: '13px' }}
                />
                <LikeButton 
                  userId={user.id} 
                  songId={currentSong.id}
                  onLikeChange={(isLiked) => {
                    console.log(`Song ${currentSong.title} is now ${isLiked ? 'liked' : 'unliked'}`);
                  }}
                />
              </>
            )}

              {/* Controls */}
              <div className={styles.controls}>
                <button 
                  onClick={handlePrevious}
                  disabled={!isPlayerReady}
                  className={styles.iconBtn}
                  title="Previous"
                >
                  <img src={prevPng} alt="Previous" width={28} height={22} draggable={false} />
                </button>

                <button 
                  onClick={togglePlayPause}
                  disabled={!isPlayerReady}
                  className={styles.playButton}
                  onMouseDown={(e) => isPlayerReady && (e.currentTarget.style.transform = 'scale(0.95)')}
                  onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <img
                    src={isPlaying ? pausePng : playPng}
                    alt={isPlaying ? "Pause" : "Play"}
                    width={40}
                    height={40}
                    draggable={false}
                  />
                </button>

                <button 
                  onClick={handleNext}
                  disabled={!isPlayerReady}
                  className={styles.iconBtn}
                  title="Next"
                >
                  <img src={nextPng} alt="Next" width={28} height={22} draggable={false} />
                </button>

                <button 
                  onClick={toggleLoop}
                  disabled={!isPlayerReady}
                  className={`${styles.loopBtn} ${isLooping ? styles.loopActive : ""}`}
                  title={isLooping ? "Loop: On" : "Loop: Off"}
                >
                  <img src={loopPng} alt="Loop" width={25} height={18} draggable={false} />
                </button>
              </div>

              {/* Volume */}
              <div className={styles.volume}>
                <button 
                  onClick={toggleMute}
                  disabled={!isPlayerReady}
                  className={styles.muteBtn}
                >
                  <img 
                    src={isMuted || volume === 0 ? volMutePng : volume < 50 ? volLowPng : volHighPng}
                    alt={isMuted || volume === 0 ? "Muted" : volume < 50 ? "Volume low" : "Volume high"}
                    width={35}
                    height={35}
                    draggable={false}
                  />
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  disabled={!isPlayerReady}
                  className={styles.volumeRange}
                />
              </div>
            </div>

            {/* Progress Bar */}
            <div className={styles.progressRow}>
              <span className={styles.time}>
                {formatTime(currentTime)}
              </span>
              <div 
                onClick={handleSeek}
                className={styles.progressBar}
              >
                <div 
                  className={styles.progressFill}
                  style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
              <span className={styles.time}>
                {formatTime(duration)}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MusicPlayer;
