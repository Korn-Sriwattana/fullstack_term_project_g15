import { useEffect, useRef, useState } from "react";
//css
import styles from "../assets/styles/LikeSongs.module.css"; 
//images
import emptyImg from "../assets/images/empty/empty-box.png";

type Song = {
  id: string;
  title: string;
  artist: string;
  cover_url?: string;
  duration?: number;
};

const API_BASE = import.meta.env.VITE_API_URL || "/api";

export default function LikedSongs() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const ownerId = "user_1";
  const abortRef = useRef<AbortController | null>(null);

  const fetchLiked = async () => {
    try {
      setLoading(true);
      setError("");
      abortRef.current?.abort();
      const ctl = new AbortController();
      abortRef.current = ctl;

      const res = await fetch(`${API_BASE}/liked-songs?ownerId=${ownerId}`, {
        headers: { "Content-Type": "application/json" },
        signal: ctl.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSongs(Array.isArray(data?.items) ? data.items : []);
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      console.error("Fetch liked-songs failed:", e);
      setError("Failed to load liked songs");
      setSongs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiked();
    return () => abortRef.current?.abort();
  }, []);

  const handleUnlike = async (songId: string) => {
    try {
      setSongs((prev) => prev.filter((s) => s.id !== songId)); // ลบออกก่อนแบบ optimistic
      const res = await fetch(`${API_BASE}/liked-songs/${songId}?ownerId=${ownerId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      console.error("Unlike failed:", e);
      fetchLiked();
    }
  };

  const formatTime = (sec?: number) => {
    if (!sec || isNaN(sec)) return "";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const showEmpty = !loading && songs.length === 0;

  return (
    <div className={styles.layout}>
      <main className={styles.content}>
        <h1 className={styles.title}>Liked Songs</h1>

        {loading && <div className={styles.loading}>Loading...</div>}
        {!!error && <div className={styles.error}>{error}</div>}

        {/* empty */}
        {showEmpty && (
          <section className={styles.emptyWrap}>
            <img src={emptyImg} alt="empty liked songs" className={styles.emptyImg} />
            <h2 className={styles.emptyTitle}>You haven’t liked any songs yet</h2>
            <p className={styles.emptyHint}>
              Tap the heart on tracks you love to keep them all in one place
            </p>
          </section>
        )}

        {/* no-empty */}
      </main>
    </div>
  );
}
