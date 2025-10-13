import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { Song } from "../types/song.ts";
import LikeButton from "../components/LikeButton";
import AddToPlaylistButton from "../components/AddToPlaylist";
import styles from "../assets/styles/Playlist.module.css";
import detailStyles from "../assets/styles/PlaylistDetail.module.css";
import emptyImg from "../assets/images/empty/empty-box.png";

interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  songCount: number;
  isPublic: boolean;
  createdAt: string;
  ownerId: string;
}

interface PlaylistSong {
  id: string;
  song: Song;
  addedAt: string;
}

export default function FriendProfile() {
  const { id } = useParams(); // friendId จาก URL
  const API_URL = "http://localhost:3000";

  const [friend, setFriend] = useState<any>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlistSongs, setPlaylistSongs] = useState<PlaylistSong[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "detail">("list");
  const [loading, setLoading] = useState(true);

  // ✅ โหลดข้อมูลโปรไฟล์เพื่อน
  useEffect(() => {
    const fetchFriend = async () => {
      try {
        const res = await fetch(`${API_URL}/api/users/${id}/profile`);
        const data = await res.json();
        setFriend(data.user);

        const playlistRes = await fetch(`${API_URL}/playlists/${id}?mode=public`);
        const playlistData = await playlistRes.json();
        setPlaylists(playlistData);
      } catch (err) {
        console.error("Failed to fetch friend data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFriend();
  }, [id]);

  const handleOpenPlaylist = (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    setViewMode("detail");
    loadPlaylistSongs(playlist.id);
  };

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedPlaylist(null);
  };

  const loadPlaylistSongs = async (playlistId: string) => {
    try {
      const res = await fetch(`${API_URL}/playlists/${playlistId}/songs`);
      const data = await res.json();
      setPlaylistSongs(data);
    } catch (err) {
      console.error("Failed to load songs:", err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const getImageUrl = (picUrl?: string | null) => {
    if (!picUrl) return "/default-avatar.png";
    if (picUrl.startsWith("http")) return picUrl;
    return `${API_URL}${picUrl}`;
  };

  if (loading) return <p>Loading...</p>;
  if (!friend) return <p>User not found.</p>;

  return (
    <div
      style={{
        padding: "3rem 6rem",
        fontFamily: "Inter, sans-serif",
        color: "#222",
      }}
    >
      {/* ---------- Header ---------- */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
        <img
          src={getImageUrl(friend.profilePic)}
          alt={friend.name}
          style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            objectFit: "cover",
          }}
        />

        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: "2rem", fontWeight: "700" }}>{friend.name}</h1>
          <p
            style={{
              color: "#6b6b6b",
              marginTop: "-0.4rem",
              fontSize: "1.1rem",
            }}
          >
            @{friend.email?.split("@")[0]}
          </p>
        </div>
      </div>

      {/* ---------- Stats ---------- */}
      <div style={{ marginTop: "1rem", color: "#555" }}>
        <span style={{ marginRight: "1.5rem" }}>
          <strong>{playlists.length}</strong> Public Playlists
        </span>
      </div>

      <hr style={{ margin: "1.5rem 0", border: "1px solid #eee" }} />

      {/* ---------- Playlist Section ---------- */}
      <div>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            {viewMode === "detail" && (
              <button
                onClick={handleBackToList}
                className={styles.backButton}
                title="Back to playlists"
              >
                ←
              </button>
            )}
            <h1 className={styles.title}>
              {viewMode === "list"
                ? `${friend.name}'s Public Playlists (${playlists.length})`
                : selectedPlaylist?.name}
            </h1>
          </div>
        </div>

        {/* ---------- LIST VIEW ---------- */}
        {viewMode === "list" && (
          <section className={styles.section}>
            {playlists.length > 0 ? (
              <div className={styles.playlistGrid}>
                {playlists.map((playlist) => (
                  <div
                    key={playlist.id}
                    className={styles.playlistCard}
                    onClick={() => handleOpenPlaylist(playlist)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className={styles.playlistCoverWrapper}>
                      {playlist.coverUrl ? (
                        <img
                          src={`${API_URL}${playlist.coverUrl}`}
                          alt={playlist.name}
                          className={styles.playlistCover}
                        />
                      ) : (
                        <div className={styles.playlistCoverPlaceholder}>🎵</div>
                      )}
                    </div>

                    <div className={styles.playlistInfo}>
                      <div className={styles.playlistName}>
                        <div className={styles.playlistNameText}>
                          {playlist.name}
                        </div>
                      </div>

                      <div className={styles.playlistSongCount}>
                        {playlist.songCount} songs
                      </div>

                      {playlist.description && (
                        <div className={styles.playlistDescription}>
                          {playlist.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <section className={styles.emptyWrap}>
                <img className={styles.emptyImage} src={emptyImg} alt="empty playlist" />
                <h2 className={styles.emptyTitle}>No public playlists</h2>
              </section>
            )}
          </section>
        )}

        {/* ---------- DETAIL VIEW ---------- */}
        {viewMode === "detail" && selectedPlaylist && (
          <section className={detailStyles.container} style={{ padding: 0 }}>
            <div className={detailStyles.headerWrap}>
              <div className={detailStyles.headerRow}>
                {selectedPlaylist.coverUrl ? (
                  <img
                    src={`${API_URL}${selectedPlaylist.coverUrl}`}
                    alt={selectedPlaylist.name}
                    className={styles.playlistHeaderCover}
                    style={{
                      width: 160,
                      height: 160,
                      borderRadius: 12,
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div className={detailStyles.cover}>🎵</div>
                )}

                <div className={detailStyles.info}>
                  <div className={detailStyles.playlistLabel}>PLAYLIST</div>
                  <h1 className={detailStyles.titleHeading}>
                    {selectedPlaylist.name}
                  </h1>
                  <div className={detailStyles.subtitle}>
                    {friend.name} • {selectedPlaylist.songCount} songs • Created{" "}
                    {formatDate(selectedPlaylist.createdAt)}
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.resultsList}>
              {playlistSongs.length > 0 ? (
                playlistSongs.map((item, index) => (
                  <div key={item.id} className={styles.resultItem}>
                    <div className={styles.resultIndex}>{index + 1}</div>
                    {item.song.coverUrl && (
                      <img
                        src={item.song.coverUrl}
                        alt={item.song.title}
                        className={detailStyles.resultCover}
                      />
                    )}
                    <div className={detailStyles.resultInfo} style={{ flex: 1 }}>
                      <div className={detailStyles.resultTitle}>{item.song.title}</div>
                      <div className={detailStyles.resultArtist}>{item.song.artist}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyCenter}>
                  <div className={styles.emptyIcon}>🎵</div>
                  <h3>No songs in this playlist</h3>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
