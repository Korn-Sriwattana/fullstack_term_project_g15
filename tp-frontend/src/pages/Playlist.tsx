import { useState, useEffect, useRef } from "react";
import { useUser } from "../components/userContext";
import type { Song } from "../types/song.ts";
import LikeButton from "../components/LikeButton";
import AddToPlaylistButton from "../components/AddToPlaylist";

import styles from "../assets/styles/Playlist.module.css";
import modalStyles from "../assets/styles/CreatePlaylistModal.module.css";
import detailStyles from "../assets/styles/PlaylistDetail.module.css";

import searchIcon from "../assets/images/search-icon.png";
import emptyImg from "../assets/images/empty/empty-box.png";
import { useLikedSongs } from "../components/LikedSongsContext.tsx";

const API_URL = "http://localhost:3000";

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

export default function Playlist() {
  const { user } = useUser();
  const userId = user?.id;

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlistSongs, setPlaylistSongs] = useState<PlaylistSong[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDesc, setNewPlaylistDesc] = useState("");
  const [newPlaylistIsPublic, setNewPlaylistIsPublic] = useState(true);
  const [newPlaylistCoverUrl, setNewPlaylistCoverUrl] = useState("");
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  
  // Sort state
  const [sortBy, setSortBy] = useState<'custom' | 'dateAdded' | 'title' | 'artist' | 'duration'>('custom');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Drag & Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  const { refreshLikedSongs } = useLikedSongs();
  useEffect(() => {
    if (userId) {
      loadPlaylists();
    }
  }, [userId]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem("viewerId", user.id);
    }
  }, [user]);

  useEffect(() => {
    if (user?.id) {
      refreshLikedSongs(user.id);
    }
  }, [user?.id, refreshLikedSongs]);

  // Reload เมื่อ sortBy เปลี่ยน
  useEffect(() => {
    if (selectedPlaylist && viewMode === 'detail') {
      loadPlaylistSongs(selectedPlaylist.id);
    }
  }, [selectedPlaylist, viewMode, sortBy]);

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

  const loadPlaylists = async () => {
    try {
      if (!user?.id) return;

     const res = await fetch(`${API_URL}/playlists/${user.id}?mode=owner`);
      const data = await res.json();
      setPlaylists(data);

      if (selectedPlaylist) {
        const updatedPlaylist = data.find((p: Playlist) => p.id === selectedPlaylist.id);
        if (updatedPlaylist) setSelectedPlaylist(updatedPlaylist);
      }
    } catch (err) {
      console.error("Load playlists failed:", err);
    }
  };

  // ส่ง sortBy ไป backend
  const loadPlaylistSongs = async (playlistId: string) => {
    try {
      const res = await fetch(`${API_URL}/playlists/${playlistId}/songs?sortBy=${sortBy}`);
      const data = await res.json();
      setPlaylistSongs(data);
    } catch (err) {
      console.error("Load playlist songs failed:", err);
    }
  };

  const handleCoverSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append("cover", file);

      const res = await fetch(`${API_URL}/upload/playlist-cover`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to upload image");

      const data = await res.json();
      setNewPlaylistCoverUrl(data.coverUrl);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Failed to upload image");
      setCoverPreview(null);
    } finally {
      setUploadingCover(false);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      alert("Please enter playlist name");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/playlists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          name: newPlaylistName,
          description: newPlaylistDesc || undefined,
          isPublic: newPlaylistIsPublic,
          coverUrl: newPlaylistCoverUrl || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to create playlist");

      await loadPlaylists();
      
      setNewPlaylistName("");
      setNewPlaylistDesc("");
      setNewPlaylistIsPublic(true);
      setNewPlaylistCoverUrl("");
      setCoverPreview(null);
      setShowCreateModal(false);
      
      alert("Playlist created!");
    } catch (err) {
      console.error("Create playlist failed:", err);
      alert("Failed to create playlist");
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    if (!confirm("Delete this playlist?")) return;

    try {
      const res = await fetch(`${API_URL}/playlists/${playlistId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete");

      await loadPlaylists();
      
      if (selectedPlaylist?.id === playlistId) {
        setSelectedPlaylist(null);
        setPlaylistSongs([]);
        setViewMode('list');
      }
      
      alert("Playlist deleted!");
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete playlist");
    }
  };

  const handleRemoveSong = async (playlistSongId: string) => {
    if (!selectedPlaylist) return;

    try {
      const res = await fetch(
        `${API_URL}/playlists/${selectedPlaylist.id}/songs/${playlistSongId}`,
        { method: "DELETE" }
      );

      if (!res.ok) throw new Error("Failed to remove");

      await Promise.all([
        loadPlaylists(),
        loadPlaylistSongs(selectedPlaylist.id)
      ]);
      
      alert("Song removed from playlist!");
    } catch (err) {
      console.error("Remove song failed:", err);
      alert("Failed to remove song");
    }
  };

  const handlePlaySong = async (song: Song) => {
    if (!userId) {
      alert("Please create user first");
      return;
    }

    if ((window as any).musicPlayer) {
      await (window as any).musicPlayer.playSong(song);
    }
  };

  const handleAddToQueue = async (song: Song) => {
    if (!userId) {
      alert("Please create user first");
      return;
    }

    if ((window as any).musicPlayer) {
      await (window as any).musicPlayer.addToQueue(song);
      alert("Added to queue!");
    }
  };

  const handleOpenPlaylist = (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    setViewMode('detail');
    setSortBy('custom'); // Reset เป็น custom เมื่อเปิด playlist ใหม่
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedPlaylist(null);
    setPlaylistSongs([]);
  };

  const handlePlayPlaylist = async () => {
    if (!selectedPlaylist || playlistSongs.length === 0) {
      alert("No songs in this playlist");
      return;
    }

    if ((window as any).musicPlayer) {
      const [firstSong, ...restSongs] = playlistSongs.map(item => item.song);
      
      await (window as any).musicPlayer.playSong(firstSong);
      
      for (const song of restSongs) {
        await (window as any).musicPlayer.addToQueue(song);
      }
      
      alert(`Playing ${playlistSongs.length} songs from ${selectedPlaylist.name}`);
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
        
        alert(`Playing ${songs.length} songs from ${playlist.name}`);
      }
    } catch (err) {
      console.error("Failed to play playlist:", err);
      alert("Failed to play playlist");
    }
  };

  const handleShufflePlaylist = async () => {
    if (!selectedPlaylist || playlistSongs.length === 0) {
      alert("No songs in this playlist");
      return;
    }

    if ((window as any).musicPlayer) {
      const shuffled = [...playlistSongs].sort(() => Math.random() - 0.5);
      const [firstSong, ...restSongs] = shuffled.map(item => item.song);
      
      await (window as any).musicPlayer.playSong(firstSong);
      
      for (const song of restSongs) {
        await (window as any).musicPlayer.addToQueue(song);
      }
      
      alert(`Shuffling ${shuffled.length} songs from ${selectedPlaylist.name}`);
    }
  };

  const handleSongAddedToPlaylist = async () => {
    await loadPlaylists();
    if (selectedPlaylist && viewMode === 'detail') {
      await loadPlaylistSongs(selectedPlaylist.id);
    }
  };

  //  จัดการ sort โดยไม่ทำ client-side sorting
  const handleSortChange = (newSortBy: 'custom' | 'dateAdded' | 'title' | 'artist' | 'duration') => {
    if (sortBy === newSortBy && newSortBy !== 'custom') {
      // Toggle sort order
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  //  Drag & Drop พร้อมบันทึก backend ทันที
  const handleDragStart = (index: number) => {
    if (sortBy !== 'custom') {
      alert('Please switch to "Custom Order" mode to reorder songs');
      return;
    }
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // 🆕 เพิ่ม state สำหรับ toast notification
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const showNotification = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleDrop = async (dropIndex: number) => {
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    if (!selectedPlaylist) return;

    try {
      const draggedSong = playlistSongs[draggedIndex];
      
      // Optimistic update
      const newSongs = [...playlistSongs];
      const [draggedItem] = newSongs.splice(draggedIndex, 1);
      newSongs.splice(dropIndex, 0, draggedItem);
      setPlaylistSongs(newSongs);
      
      // บันทึกลง backend ทันที
      const res = await fetch(
        `${API_URL}/playlists/${selectedPlaylist.id}/reorder`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            songId: draggedSong.song.id,
            newOrder: dropIndex,
          }),
        }
      );

      if (!res.ok) throw new Error("Failed to reorder");

      // Reload เพื่อ sync กับ backend
      await loadPlaylistSongs(selectedPlaylist.id);

      // แสดง notification
      showNotification("Order saved. Changes will apply on next play.");
      
    } catch (err) {
      console.error("Reorder failed:", err);
      showNotification("❌ Failed to reorder songs");
      // Revert optimistic update
      await loadPlaylistSongs(selectedPlaylist.id);
    }

    setDraggedIndex(null);
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  if (!userId) {
    return (
      <div className={styles.container}>
        <h2>Please create user first</h2>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          {viewMode === 'detail' && (
            <button onClick={handleBackToList} className={styles.backButton} title="Back to playlists">
              ←
            </button>
          )}
          <h1 className={styles.title}>
            {viewMode === 'list' ? 'Your Library' : selectedPlaylist?.name}
          </h1>
        </div>
      </div>
      
      {/* Search + Create */}
      {viewMode === 'list' && (
        <div className={styles.actionsRow}>
          <input
            type="text"           
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
            style={{
              backgroundImage: `url(${searchIcon})`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: '16px center',
              backgroundSize: '20px',
              paddingLeft: 56,                  
            }}
          />
          <button type="button" className={styles.createBtn} onClick={() => setShowCreateModal(true)}>
            Create
          </button>
        </div>
      )}

      {/* Search Results */}
      {viewMode === 'list' && searchResults.length === 0 && searchQuery.trim() !== "" && (
        <section className={styles.section}>
          <h3>Search Results</h3>
          <p className={styles.noResults}>No results found.</p>
        </section>
      )}

      {viewMode === 'list' && searchResults.length > 0 && (
        <section className={styles.section}>
          <h3>Search Results</h3>
          <div className={styles.resultsList}>
            {searchResults.map((song) => (
              <div key={song.id} className={styles.resultItem}>
                {song.coverUrl && (
                  <img src={song.coverUrl} alt={song.title} className={styles.resultCover} />
                )}
                <div className={styles.resultInfo}>
                  <div className={styles.resultTitle}>{song.title}</div>
                  <div className={styles.resultArtist}>{song.artist}</div>
                </div>
                <div className={styles.resultDuration}>
                  {formatTime(song.duration)}
                </div>
                <div className={styles.resultActions}>
                  <button 
                    onClick={() => handlePlaySong(song)}
                    className={styles.buttonPrimary}
                    style={{ padding: '6px 12px', fontSize: '13px' }}
                  >
                    Play
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleAddToQueue(song); }}
                    className={styles.buttonSecondary}
                    style={{ padding: '6px 12px', fontSize: '13px' }}
                  >
                    + Queue
                  </button>
                  <AddToPlaylistButton 
                    userId={userId} 
                    song={song}
                    iconOnly={false}
                    buttonClassName={styles.buttonSecondary}
                    buttonStyle={{ padding: '6px 12px', fontSize: '13px' }}
                    onSuccess={handleSongAddedToPlaylist}
                  />
                  <LikeButton 
                    userId={userId} 
                    songId={song.id}
                    onLikeChange={(isLiked) => {
                      console.log(`Song ${song.title} is now ${isLiked ? 'liked' : 'unliked'}`);
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* LIST VIEW - Playlists Grid */}
      {viewMode === 'list' && (
        <section className={styles.section}>
          <h3>Playlists ({playlists.length})</h3>
          
          {playlists.length > 0 ? (
            <div className={styles.playlistGrid}>
              {playlists.map((playlist) => (
                <div key={playlist.id} className={styles.playlistCard} onClick={() => handleOpenPlaylist(playlist)}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePlaylist(playlist.id);
                    }}
                    className={styles.deleteButton}
                    title="Delete playlist"
                  >
                    🗑️
                  </button>

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

      {/* DETAIL VIEW - Playlist Songs (use dedicated CSS) */}
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

            {playlistSongs.length > 0 && (
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

          {playlistSongs.length > 0 && (
            <div className={detailStyles.sortBar}>
              <span className={detailStyles.sortLabel}>Sort by:</span>

              <button
                onClick={() => handleSortChange('custom')}
                className={`${detailStyles.sortBtn} ${sortBy === 'custom' ? detailStyles.sortBtnActive : ''}`}
                title="Drag songs to reorder. Changes apply on next play."
              >
                Custom Order {sortBy === 'custom' ? '✓' : ''}
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

          <div className={detailStyles.resultsList}>
            {playlistSongs.length > 0 ? (
              playlistSongs.map((item, index) => (
                <div
                  key={item.id}
                  className={detailStyles.resultItem}
                  draggable={sortBy === 'custom'}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(index)}
                  style={{
                    cursor: sortBy === 'custom' ? 'grab' : 'default',
                    opacity: draggedIndex === index ? 0.5 : 1,
                    transition: 'opacity 0.2s'
                  }}
                >
                  {sortBy === 'custom' && (
                    <div
                      style={{
                        marginRight: 8,
                        color: '#999',
                        fontSize: 16,
                        cursor: 'grab'
                      }}
                    >
                      ⋮⋮
                    </div>
                  )}

                  <div className={detailStyles.indexNum}>{index + 1}</div>

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

                    <LikeButton userId={userId} songId={item.song.id} />

                    <button
                      onClick={() => handleRemoveSong(item.id)}
                      className={styles.buttonDanger}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <section className={detailStyles.emptyWrap}>
                <div className={detailStyles.emptyCenter}>
                  <div className={detailStyles.emptyIcon}>🎵</div>
                  <h3 className={detailStyles.emptyTitle}>No songs in this playlist</h3>
                  <p className={detailStyles.emptyHint} >
                    Search for songs and add them to this playlist
                  </p>
                </div>
              </section>
            )}
          </div>
        </section>
      )}


      {/* Create Playlist Modal */}
      {showCreateModal && (
        <div className={modalStyles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={modalStyles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={modalStyles.modalTitle}>Create New Playlist</h2>
            
            <div className={modalStyles.coverUploadSection}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverSelect}
                style={{ display: 'none' }}
              />
              
              <div className={modalStyles.coverUploadBox} onClick={() => fileInputRef.current?.click()}>
                {coverPreview ? (
                  <img src={coverPreview} alt="Preview" className={modalStyles.coverPreview} />
                ) : (
                  <div className={modalStyles.coverUploadPlaceholder}>
                    <div>
                      <div style={{ fontSize: '32px' }}>📷</div>
                      <div style={{ fontSize: '12px', marginTop: '4px' }}>
                        {uploadingCover ? 'Uploading...' : 'Add Cover'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <small className={modalStyles.coverUploadHint}>
                Click to upload cover image (Max 5MB)
              </small>
            </div>

            <div className={modalStyles.formGroup}>
              <label className={modalStyles.formLabel}>
                Playlist Name *
              </label>
              <input
                type="text"
                placeholder="My Awesome Playlist"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                className={modalStyles.formInput}
                autoFocus
              />
            </div>

            <div className={modalStyles.formGroup}>
              <label className={modalStyles.formLabel}>
                Description (optional)
              </label>
              <textarea
                placeholder="Describe your playlist..."
                value={newPlaylistDesc}
                onChange={(e) => setNewPlaylistDesc(e.target.value)}
                rows={3}
                className={modalStyles.formTextarea}
              />
            </div>

            <div className={modalStyles.formGroup}>
              <label className={modalStyles.formLabel}>
                Privacy
              </label>
              <select
                value={newPlaylistIsPublic ? "public" : "private"}
                onChange={(e) => setNewPlaylistIsPublic(e.target.value === "public")}
                className={modalStyles.formSelect}
              >
                <option value="public">🌐 Public</option>
                <option value="private">🔒 Private</option>
              </select>
              <small className={modalStyles.privacyHint}>
                {newPlaylistIsPublic 
                  ? 'This playlist will appear in your profile and be accessible to others' 
                  : 'Only you can access this playlist'}
              </small>
            </div>

            <div className={modalStyles.modalActions}>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewPlaylistName("");
                  setNewPlaylistDesc("");
                  setNewPlaylistIsPublic(true);
                  setNewPlaylistCoverUrl("");
                  setCoverPreview(null);
                }}
                className={modalStyles.buttonSecondary}
                style={{ padding: '10px 20px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePlaylist}
                disabled={uploadingCover}
                className={modalStyles.buttonPrimary}
                style={{ 
                  padding: '10px 20px',
                  opacity: uploadingCover ? 0.5 : 1,
                  cursor: uploadingCover ? 'not-allowed' : 'pointer'
                }}
              >
                {uploadingCover ? 'Uploading...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#282828',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'slideUp 0.3s ease-out',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* CSS Animation */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
