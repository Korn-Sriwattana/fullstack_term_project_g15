import { useEffect, useMemo, useRef, useState } from "react";
import styles from "../assets/styles/Playlist.module.css";
import searchIcon from "../assets/images/search-icon.png";
import emptyImg from "../assets/images/empty/empty-box.png";

type PlaylistItem = {
  id: string;
  name: string;
};

// ทางเลือก A: เรียกผ่าน Nginx ที่ prefix /api
// ถ้าไม่ได้ตั้งค่า .env Vite จะใช้ค่าเริ่มต้นเป็น "/api"
const API_BASE = import.meta.env.VITE_API_URL || "/api";

export default function Playlist() {
  const [query, setQuery] = useState("");
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const ownerId = "user_1";

  const abortRef = useRef<AbortController | null>(null);

  const searchParams = useMemo(() => {
    const p = new URLSearchParams();
    if (ownerId) p.set("ownerId", ownerId);
    if (query.trim()) p.set("q", query.trim());
    return p.toString();
  }, [ownerId, query]);

  const fetchPlaylists = async () => {
    try {
      setLoading(true);
      setError("");

      // ยกเลิกคำขอรอบก่อน (ถ้ามี)
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      // ⚠️ สำคัญ: ไม่ต้องเติม /api ซ้ำ — ใช้ `${API_BASE}/playlists`
      const res = await fetch(`${API_BASE}/playlists?${searchParams}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setPlaylists(Array.isArray(data?.items) ? data.items : []);
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      console.error("Fetch playlists failed:", e);
      setError("Failed to load playlists");
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      fetchPlaylists();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleCreate = async () => {
    const name = prompt("Playlist name");
    if (!name?.trim()) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${API_BASE}/playlists`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          owner_id: ownerId,
          name: name.trim(),
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const created: PlaylistItem = await res.json();

      setPlaylists((prev) => [created, ...prev]);
      fetchPlaylists();
    } catch (e: any) {
      console.error("Create playlist failed:", e);
      alert("Create failed");
    } finally {
      setLoading(false);
    }
  };

  const showEmpty = !loading && playlists.length === 0;

  return (
    <div className={styles.layout}>
      <main className={styles.content}>
        <div className={styles.page}>
          <h1 className={styles.title}>Your Library</h1>

          {/* Search + Create */}
          <div className={styles.actionsRow}>
            <input
              type="text"
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={styles.searchInput}
              style={{
                backgroundImage: `url(${searchIcon})`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "14px center",
                backgroundSize: "20px",
                paddingLeft: "44px",
              }}
            />
            <button type="button" className={styles.createBtn} onClick={handleCreate}>
              Create
            </button>
          </div>

          {/* states */}
          {loading && <div className={styles.loading}>Loading...</div>}
          {!!error && <div className={styles.error}>{error}</div>}

          {/* Empty state */}
          {showEmpty && (
            <section className={styles.emptyWrap}>
              <img className={styles.emptyImage} src={emptyImg} alt="empty playlist" />
              <h2 className={styles.emptyTitle}>Your playlist is still empty</h2>
              <p className={styles.emptyHint}>
                Tap the + button or start browsing from Search.
              </p>
            </section>
          )}

          {/* no empty playlist */}
          {!showEmpty && (
            <ul className={styles.list}>
              {playlists.map((p) => (
                <li key={p.id} className={styles.listItem}>
                  {p.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
