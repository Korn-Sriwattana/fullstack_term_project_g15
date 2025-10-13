import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Song } from "../types/song.ts";
import LikeButton from "../components/LikeButton";
import AddToPlaylistButton from "../components/AddToPlaylist";
import { useLikedSongs } from "../components/LikedSongsContext";
import { useUser } from "../components/userContext";

import styles from "../assets/styles/Playlist.module.css";
import emptyImg from "../assets/images/empty/empty-box.png";
import detailStyles from "../assets/styles/PlaylistDetail.module.css";

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

export default function FriendProfile() {
  const { id } = useParams();
  const { user } = useUser();
  const navigate = useNavigate();

  const [friend, setFriend] = useState<any>(null);
  const [friendCount, setFriendCount] = useState(0);

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlistSongs, setPlaylistSongs] = useState<PlaylistSong[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "detail">("list");
  const [sortBy, setSortBy] = useState<
    "custom" | "dateAdded" | "title" | "artist" | "duration"
  >("custom");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

   const { refreshLikedSongs } = useLikedSongs();

    useEffect(() => {
      if (user?.id) {
        refreshLikedSongs(user.id);
      }
    }, [user?.id, refreshLikedSongs]);
    useEffect(() => {
      if (user?.id) {
        loadPlaylists();
      }
    }, [user?.id]);

    useEffect(() => {
      const loadFriendCount = async () => {
        if (!user?.id) return;
        try {
          const res = await fetch(`http://localhost:3000/api/friends/list?userId=${user.id}`);
          const data = await res.json();
          setFriendCount(data.friends?.length || 0);
        } catch (err) {
          console.error("Failed to fetch friend count:", err);
        }
      };

      loadFriendCount();
    }, [user?.id]);

  const API_URL = "http://localhost:3000";

  const loadPlaylists = async () => {
    try {
      const res = await fetch(`${API_URL}/playlists/${id}?mode=public`);
      const data = await res.json();
      setPlaylists(data);
    } catch (err) {
      console.error("Load playlists failed:", err);
    }
  };
    
  const handleSongAddedToPlaylist = async () => {
        await loadPlaylists();
        if (selectedPlaylist && viewMode === 'detail') {
          await loadPlaylistSongs(selectedPlaylist.id);
        }
      };
  
  const handlePlayPlaylistFromCard = async (e: React.MouseEvent, playlist: Playlist) => {
      e.stopPropagation();
      
      try {
        const res = await fetch(`${API_URL}/playlists/${playlist.id}/songs?sortBy=custom`);
        const songs: PlaylistSong[] = await res.json();
        
        if (songs.length === 0) {
          alert("No songs in this playlist");
          return;
        }
  
        if ((window as any).musicPlayer) {
          const [firstSong, ...restSongs] = songs.map(item => item.song);
          
          await (window as any).musicPlayer.playSong(firstSong);
          
          for (const song of restSongs) {
            await (window as any).musicPlayer.addToQueue(song);
          }
          
          // alert(`Playing ${songs.length} songs from ${playlist.name}`);
        }
      } catch (err) {
        console.error("Failed to play playlist:", err);
        alert("Failed to play playlist");
      }
    };

  // โหลดข้อมูลเพื่อน
  useEffect(() => {
    const loadData = async () => {
      try {
        const [profileRes, playlistRes] = await Promise.all([
          fetch(`${API_URL}/api/users/${id}/profile`),
          fetch(`${API_URL}/playlists/${id}?mode=public`),
        ]);
        const profileData = await profileRes.json();
        const playlistData = await playlistRes.json();
        setFriend(profileData.user);
        setPlaylists(playlistData);
      } catch (err) {
        console.error("Failed to load friend profile:", err);
      }
    };
    loadData();
  }, [id]);

  // โหลดเพลงใน playlist
  const loadPlaylistSongs = async (playlistId: string) => {
    try {
      const res = await fetch(`${API_URL}/playlists/${playlistId}/songs?sortBy=${sortBy}`);
      const data = await res.json();
      setPlaylistSongs(data);
    } catch (err) {
      console.error("Load playlist songs failed:", err);
    }
  };

  useEffect(() => {
    if (selectedPlaylist && viewMode === "detail") {
      loadPlaylistSongs(selectedPlaylist.id);
    }
  }, [selectedPlaylist, viewMode, sortBy]);

  const handleOpenPlaylist = (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    setViewMode("detail");
    setSortBy("custom");
  };

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedPlaylist(null);
    setPlaylistSongs([]);
  };

  const sortedPlaylistSongs = useMemo(() => {
    if (sortBy === "custom") return playlistSongs;
    const copy = [...playlistSongs];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "dateAdded") cmp = new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
      else if (sortBy === "title") cmp = (a.song.title || "").localeCompare(b.song.title || "");
      else if (sortBy === "artist") cmp = (a.song.artist || "").localeCompare(b.song.artist || "");
      else if (sortBy === "duration") cmp = (a.song.duration || 0) - (b.song.duration || 0);
      return sortOrder === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [playlistSongs, sortBy, sortOrder]);

  const handleSortChange = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy && newSortBy !== "custom") {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(newSortBy);
      setSortOrder("asc");
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
    if (!selectedPlaylist || sortedPlaylistSongs.length === 0) return;
    const [firstSong, ...restSongs] = sortedPlaylistSongs.map((item) => item.song);
    if ((window as any).musicPlayer) {
      await (window as any).musicPlayer.playSong(firstSong);
      for (const s of restSongs) await (window as any).musicPlayer.addToQueue(s);
    }
  };

  const handleShufflePlaylist = async () => {
    if (!selectedPlaylist || sortedPlaylistSongs.length === 0) return;
    const shuffled = [...sortedPlaylistSongs].sort(() => Math.random() - 0.5);
    const [first, ...rest] = shuffled.map((i) => i.song);
    if ((window as any).musicPlayer) {
      await (window as any).musicPlayer.playSong(first);
      for (const s of rest) await (window as any).musicPlayer.addToQueue(s);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  if (!friend) return <p>Loading friend profile...</p>;

  return (
    <div
      style={{
        padding: "3rem 6rem",
        fontFamily: "Inter, sans-serif",
        color: "#222",
      }}
    >
      {/* 🔙 Back Button */}
      <button
        onClick={() => navigate(-1)}
        className={styles.backButton}
        title="Back"
      >
        ←
      </button>

      {/* Header Section */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
        <img
          src={
            friend.profilePic
              ? friend.profilePic.startsWith("http")
                ? friend.profilePic
                : `${API_URL}${friend.profilePic}`
              : "/default-avatar.png"
          }
          alt="Friend"
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
          <p style={{ color: "#6b6b6b", marginTop: "-0.4rem", fontSize: "1.1rem" }}>
            @{friend.email?.split("@")[0]}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ marginTop: "1rem", color: "#555" }}>
        <span style={{ marginRight: "1.5rem" }}>
          <strong>{playlists.length}</strong> Public Playlists
        </span>
        <span>
          <strong>{friendCount}</strong> Friends
        </span>
      </div>

      <hr style={{ margin: "1.5rem 0", border: "1px solid #eee" }} />

      {/* Playlist Section */}
      <div>
          {/* Header */}
                <div className={styles.header}>
                  <div className={styles.headerLeft}>
                    {viewMode === 'detail' && (
                      <button onClick={handleBackToList} className={styles.backButton} title="Back to playlists">
                        ←
                      </button>
                    )}
                    <h1 className={styles.title}>
                      {viewMode === 'list' ? `Public Playlists` : selectedPlaylist?.name}
                    </h1>
                  </div>
                </div>

      {/* LIST VIEW - Playlists Grid */}
      {viewMode === 'list' && (
        <section className={styles.section}>
          {playlists.length > 0 ? (
            <div className={styles.playlistGrid}>
              {playlists.map((playlist) => (
                <div key={playlist.id} className={styles.playlistCard} onClick={() => handleOpenPlaylist(playlist)}>
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
                      onClick={(e) => handlePlayPlaylistFromCard(e, playlist)}
                      className={styles.playlistPlayButton}
                      title={`Play ${playlist.name}`}
                    >
                      ▶
                    </button>
                  </div>

                  <div className={styles.playlistInfo}>
                    <div className={styles.playlistName}>
                      <div className={styles.playlistNameText}>
                        {playlist.name}
                      </div>
                      {!playlist.isPublic && (
                        <span className={styles.playlistPrivateBadge}>
                          Private
                        </span>
                      )}
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
              <h2 className={styles.emptyTitle}>Your playlist is still empty</h2>
              <p className={styles.emptyHint}>
                Tap the Create button to start building your collection
              </p>
            </section>
          )}
        </section>
      )}

      {/* DETAIL VIEW - Playlist Songs */}
      {viewMode === 'detail' && selectedPlaylist && (
        <section className={detailStyles.container} style={{ padding: 0 }}>
          <div className={detailStyles.headerWrap}>
            <div className={detailStyles.headerRow}>
              {selectedPlaylist.coverUrl ? (
                <img
                  src={`${API_URL}${selectedPlaylist.coverUrl}`}
                  alt={selectedPlaylist.name}
                  className={styles.playlistHeaderCover}
                  style={{ width: 160, height: 160, borderRadius: 12, objectFit: 'cover' }}
                />
              ) : (
                <div className={detailStyles.cover}>🎵</div>
              )}

              <div className={detailStyles.info}>
                <div className={detailStyles.playlistLabel}>PLAYLIST</div>
                <h1 className={detailStyles.titleHeading}>{selectedPlaylist.name}</h1>
                <div className={detailStyles.subtitle}>
                  {(user?.name ?? 'You')} • {selectedPlaylist.songCount} songs • Created {formatDate(selectedPlaylist.createdAt)}
                  {!selectedPlaylist.isPublic ? ' • Private' : ''}
                </div>
              </div>
            </div>

            {sortedPlaylistSongs.length > 0 && (
              <div className={detailStyles.controls}>
                <button
                  onClick={handlePlayPlaylist}
                  className={detailStyles.playAllBtn}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.04)';
                    e.currentTarget.style.background = '#1ed760';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.background = '#1DB954';
                  }}
                >
                  <span className={detailStyles.playIcon}>▶️</span>
                  Play All
                </button>

                <button
                  onClick={handleShufflePlaylist}
                  className={detailStyles.shuffleBtn}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.04)';
                    e.currentTarget.style.borderColor = '#000';
                    e.currentTarget.style.color = '#000';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.borderColor = '#d1d1d1';
                    e.currentTarget.style.color = '#666';
                  }}
                >
                  <span className={detailStyles.shuffleIcon}>🔀</span>
                  Shuffle
                </button>
              </div>
            )}
          </div>

          {/* Sort Controls */}
          {sortedPlaylistSongs.length > 0 && (
            <div className={detailStyles.sortBar}>
              <span className={detailStyles.sortLabel}>Sort by:</span>

               <button
                onClick={() => handleSortChange('custom')}
                style={{
                  padding: '4px 12px',
                  fontSize: '13px',
                  border: sortBy === 'custom' ? '1px solid #1DB954' : '1px solid #ddd',
                  background: sortBy === 'custom' ? '#f0fff4' : 'white',
                  color: sortBy === 'custom' ? '#1DB954' : '#666',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  fontWeight: sortBy === 'custom' ? '600' : '400',
                  position: 'relative'
                }}
                title="Drag songs to reorder. Changes apply on next play."
              >
                🎯 Custom Order (View-only)
              </button>

              <button
                onClick={() => handleSortChange('dateAdded')}
                className={`${detailStyles.sortBtn} ${sortBy === 'dateAdded' ? detailStyles.sortBtnActive : ''}`}
              >
                Date Added {sortBy === 'dateAdded' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>

              <button
                onClick={() => handleSortChange('title')}
                className={`${detailStyles.sortBtn} ${sortBy === 'title' ? detailStyles.sortBtnActive : ''}`}
              >
                Title {sortBy === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>

              <button
                onClick={() => handleSortChange('artist')}
                className={`${detailStyles.sortBtn} ${sortBy === 'artist' ? detailStyles.sortBtnActive : ''}`}
              >
                Artist {sortBy === 'artist' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>

              <button
                onClick={() => handleSortChange('duration')}
                className={`${detailStyles.sortBtn} ${sortBy === 'duration' ? detailStyles.sortBtnActive : ''}`}
              >
                Duration {sortBy === 'duration' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
            </div>
          )}

          <div className={styles.resultsList}>
            {sortedPlaylistSongs.length > 0 ? (
              sortedPlaylistSongs.map((item, index) => (
                <div 
                  key={item.id} 
                  className={styles.resultItem}
                  style={{
                          cursor: sortBy === 'custom' ? 'grab' : 'default',
                          transition: 'opacity 0.2s'
                         }}
                >
                  <div className={styles.resultIndex}>
                    {index + 1}
                  </div>
                  
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

                  <div className={detailStyles.dateText}>
                    {formatDate(item.addedAt)}
                  </div>

                  <div className={detailStyles.resultDuration}>
                    {formatTime(item.song.duration)}
                  </div>

                  <div style={{ display: 'flex', gap: 5 }}>
                    <button
                      onClick={() => handlePlaySong(item.song)}
                      className={detailStyles.buttonPrimary}
                      style={{ padding: '6px 12px', fontSize: 13 }}
                    >
                      Play
                    </button>

                    <button
                      onClick={() => handleAddToQueue(item.song)}
                      className={detailStyles.buttonSecondary}
                      style={{ padding: '6px 12px', fontSize: 13 }}
                    >
                      + Queue
                    </button>
                    {user?.id && (
                      <>
                       <AddToPlaylistButton 
                                        userId={user?.id} 
                                        song={item.song}
                                        iconOnly={false}
                                        buttonClassName={styles.buttonSecondary}
                                        buttonStyle={{ padding: '6px 12px', fontSize: '13px' }}
                                        onSuccess={handleSongAddedToPlaylist}
                                      />
                    <LikeButton 
                      userId={user?.id} 
                      songId={item.song.id}
                    />
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyCenter}>
                <div className={styles.emptyIcon}>🎵</div>
                <h3>No songs in this playlist</h3>
                <p style={{ marginTop: '8px' }}>
                  Search for songs and add them to this playlist
                </p>
              </div>
            )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
