import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  customOrder?: number;
}

const API_URL = "http://localhost:3000";

export default function FriendProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [friend, setFriend] = useState<any>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlistSongs, setPlaylistSongs] = useState<PlaylistSong[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "detail">("list");
  const [loading, setLoading] = useState(true);

  // โหลดข้อมูลเพื่อน + playlists
  useEffect(() => {
    const loadFriend = async () => {
      try {
        const [profileRes, playlistRes] = await Promise.all([
          fetch(`${API_URL}/api/users/${id}/profile`),
          fetch(`${API_URL}/playlists/${id}?mode=public`)
        ]);
        const profileData = await profileRes.json();
        const playlistData = await playlistRes.json();

        setFriend(profileData.user);
        setPlaylists(playlistData);
      } catch (err) {
        console.error("Failed to load friend:", err);
      } finally {
        setLoading(false);
      }
    };
    loadFriend();
  }, [id]);

  const getImageUrl = (url?: string) => {
    if (!url) return "/default-avatar.png";
    if (url.startsWith("http")) return url;
    return `${API_URL}${url}`;
  };

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedPlaylist(null);
    setPlaylistSongs([]);
  };

  const handleOpenPlaylist = async (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    setViewMode("detail");

    try {
      const res = await fetch(`${API_URL}/playlists/${playlist.id}/songs`);
      const data = await res.json();
      setPlaylistSongs(data);
    } catch (err) {
      console.error("Load playlist songs failed:", err);
    }
  };

  const handlePlaySong = async (song: Song) => {
    if ((window as any).musicPlayer) {
      await (window as any).musicPlayer.playSong(song);
    }
  };

  const handleAddToQueue = async (song: Song) => {
    if ((window as any).musicPlayer) {
      await (window as any).musicPlayer.addToQueue(song);
    }
  };

  const handlePlayPlaylist = async () => {
    if (!playlistSongs.length) return;
    const [first, ...rest] = playlistSongs.map((i) => i.song);
    if ((window as any).musicPlayer) {
      await (window as any).musicPlayer.playSong(first);
      for (const s of rest) await (window as any).musicPlayer.addToQueue(s);
    }
  };

  const handleShufflePlaylist = async () => {
    if (!playlistSongs.length) return;
    const shuffled = [...playlistSongs].sort(() => Math.random() - 0.5);
    const [first, ...rest] = shuffled.map((i) => i.song);
    if ((window as any).musicPlayer) {
      await (window as any).musicPlayer.playSong(first);
      for (const s of rest) await (window as any).musicPlayer.addToQueue(s);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  if (loading) return <p>Loading...</p>;
  if (!friend) return <p>User not found</p>;

  return (
    <div
      style={{
        padding: "3rem 6rem",
        fontFamily: "Inter, sans-serif",
        color: "#222",
      }}
    >
      {/* 🔙 ปุ่มย้อนกลับ */}
      <button
        onClick={() => navigate(-1)}
        className={styles.backButton}
        title="Back"
      >
        ←
      </button>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
        <img
          src={getImageUrl(friend.profilePic)}
          alt={friend.name}
          style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            objectFit: "cover",
            border: "none",
          }}
        />
        <div>
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

      {/* Stats */}
      <div style={{ marginTop: "1rem", color: "#555" }}>
        <span>
          <strong>{playlists.length}</strong> Public Playlists
        </span>
      </div>

      <hr style={{ margin: "1.5rem 0", border: "1px solid #eee" }} />

      {/* Playlist Section */}
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
                ? `Public Playlists (${playlists.length})`
                : selectedPlaylist?.name}
            </h1>
          </div>
        </div>

        {/* LIST VIEW */}
        {viewMode === "list" && (
          <section className={styles.section}>
            {playlists.length > 0 ? (
              <div className={styles.playlistGrid}>
                {playlists.map((playlist) => (
                  <div
                    key={playlist.id}
                    className={styles.playlistCard}
                    onClick={() => handleOpenPlaylist(playlist)}
                  >
                    <div className={styles.playlistCoverWrapper}>
                      {playlist.coverUrl ? (
                        <img
                          src={`${API_URL}${playlist.coverUrl}`}
                          alt={playlist.name}
                          className={styles.playlistCover}
                        />
                      ) : (
                        <div className={styles.playlistCoverPlaceholder}>
                          🎵
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayPlaylist();
                        }}
                        className={styles.playlistPlayButton}
                      >
                        ▶
                      </button>
                    </div>

                    <div className={styles.playlistInfo}>
                      <div className={styles.playlistNameText}>
                        {playlist.name}
                      </div>
                      <div className={styles.playlistSongCount}>
                        {playlist.songCount} songs
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <section className={styles.emptyWrap}>
                <img src={emptyImg} alt="empty" className={styles.emptyImage} />
                <h2 className={styles.emptyTitle}>No public playlists</h2>
              </section>
            )}
          </section>
        )}

        {/* DETAIL VIEW */}
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

              {playlistSongs.length > 0 && (
                <div className={detailStyles.controls}>
                  <button
                    onClick={handlePlayPlaylist}
                    className={detailStyles.playAllBtn}
                  >
                    <span className={detailStyles.playIcon}>▶️</span>
                    Play All
                  </button>

                  <button
                    onClick={handleShufflePlaylist}
                    className={detailStyles.shuffleBtn}
                  >
                    <span className={detailStyles.shuffleIcon}>🔀</span>
                    Shuffle
                  </button>
                </div>
              )}
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
                      <div className={detailStyles.resultTitle}>
                        {item.song.title}
                      </div>
                      <div className={detailStyles.resultArtist}>
                        {item.song.artist}
                      </div>
                    </div>

                    <div className={detailStyles.dateText}>
                      {formatDate(item.addedAt)}
                    </div>

                    <div className={detailStyles.resultDuration}>
                      {Math.floor(item.song.duration / 60)}:
                      {Math.floor(item.song.duration % 60)
                        .toString()
                        .padStart(2, "0")}
                    </div>

                    <div style={{ display: "flex", gap: 5 }}>
                      <button
                        onClick={() => handlePlaySong(item.song)}
                        className={detailStyles.buttonPrimary}
                      >
                        Play
                      </button>

                      <button
                        onClick={() => handleAddToQueue(item.song)}
                        className={detailStyles.buttonSecondary}
                      >
                        + Queue
                      </button>

                      <AddToPlaylistButton userId={id!} song={item.song} />
                      <LikeButton userId={id!} songId={item.song.id} />
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
