import React, { useEffect, useRef, useState } from "react";

interface Song {
  id: string;
  youtubeVideoId: string;
  title: string;
  artist: string;
  coverUrl?: string;
  duration: number;
}

interface NowPlaying extends Song {
  startTime: number; // วินาที
  queueId: string;
}

interface YoutubePlayerProps {
  nowPlaying?: NowPlaying | null;
  isMuted: boolean;
  volume?: number; // เพิ่ม volume prop (0-100)
  onEnd: (songId: string) => void;
}

const YoutubePlayer: React.FC<YoutubePlayerProps> = ({
  nowPlaying,
  isMuted,
  volume = 70, // default 70%
  onEnd,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const currentVideoIdRef = useRef<string>("");

  const onEndRef = useRef(onEnd);
  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  // โหลด YouTube API
  useEffect(() => {
    if (!(window as any).YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }
  }, []);

  // สร้าง player ครั้งแรก
  useEffect(() => {
    if (playerRef.current) return;

    const interval = setInterval(() => {
      if ((window as any).YT && (window as any).YT.Player && !playerRef.current) {
        clearInterval(interval);

        playerRef.current = new (window as any).YT.Player(containerRef.current, {
          videoId: nowPlaying?.youtubeVideoId || "",
          playerVars: { 
            autoplay: 1, 
            controls: 0, 
            modestbranding: 1, 
            rel: 0,
            enablejsapi: 1
          },
          events: {
            onReady: (event: any) => {
              setIsReady(true);
              // Set initial volume and mute state
              if (isMuted) {
                event.target.mute();
              } else {
                event.target.unMute();
                event.target.setVolume(volume);
              }
            },
            onStateChange: (event: any) => {
              const YT = (window as any).YT;
              if (event.data === YT.PlayerState.ENDED && nowPlaying) {
                onEndRef.current(nowPlaying.queueId);
              }
            },
          },
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // เปลี่ยนเพลงเมื่อ nowPlaying เปลี่ยน
  useEffect(() => {
    const player = playerRef.current;
    if (!player || !isReady || !nowPlaying) return;

    if (currentVideoIdRef.current === nowPlaying.youtubeVideoId) {
      // same video: seek ถ้าต่างกัน
      player.seekTo(nowPlaying.startTime || 0, true);
      player.playVideo();
      return;
    }

    currentVideoIdRef.current = nowPlaying.youtubeVideoId;
    player.loadVideoById({
      videoId: nowPlaying.youtubeVideoId,
      startSeconds: nowPlaying.startTime || 0,
    });
    player.playVideo();
  }, [nowPlaying, isReady]);

  // Sync mute/unmute และ volume
  useEffect(() => {
    const player = playerRef.current;
    if (!player || !isReady) return;
    
    if (isMuted) {
      player.mute();
    } else {
      player.unMute();
      player.setVolume(volume);
    }
  }, [isMuted, volume, isReady]);

  // Progress bar
  useEffect(() => {
    const interval = setInterval(() => {
      const player = playerRef.current;
      if (!player || !isReady || !nowPlaying) return;
      try {
        const current = player.getCurrentTime();
        if (current !== undefined) {
          setProgress(Math.min((current / nowPlaying.duration) * 100, 100));
        }
      } catch (e) {}
    }, 500);

    return () => clearInterval(interval);
  }, [isReady, nowPlaying]);

  const formatDuration = (d: number) => {
    const min = Math.floor(d / 60);
    const sec = Math.floor(d % 60).toString().padStart(2, "0");
    return `${min}:${sec}`;
  };

  return (
    <div>
      <div ref={containerRef} style={{ width: 0, height: 0, overflow: "hidden" }} />
      <p>
        🎵 {nowPlaying ? `${formatDuration(nowPlaying.duration)} นาที` : "No song playing"}
      </p>
      <div style={{ width: "100%", background: "#ccc", height: 8, borderRadius: 4 }}>
        <div
          style={{
            width: `${progress}%`,
            background: "#4caf50",
            height: "100%",
            borderRadius: 4,
            transition: "width 0.3s linear",
          }}
        />
      </div>
    </div>
  );
};

export default YoutubePlayer;