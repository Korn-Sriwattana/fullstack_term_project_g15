import { useState, useEffect, useRef } from "react";
import { useUser } from "../components/userContext";
import type { Song } from "../types/song.ts";
import LikeButton from "../components/LikeButton";
import AddToPlaylistButton from "../components/AddToPlaylist";

import styles from "../assets/styles/Playlist.module.css";
import searchIcon from "../assets/images/search-icon.png";
import emptyImg from "../assets/images/empty/empty-box.png";

const API_URL = "http://localhost:3000";

interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  songCount: number;
  isPublic: boolean;
  createdAt: string;
}

interface PlaylistSong {
  id: string;
  song: Song;
  addedAt: string;
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
  
  useEffect(() => {
    if (userId) {
      loadPlaylists();
    }
  }, [userId]);

  useEffect(() => {
    if (selectedPlaylist && viewMode === 'detail') {
      loadPlaylistSongs(selectedPlaylist.id);
    }
  }, [selectedPlaylist, viewMode]);

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
      const res = await fetch(`${API_URL}/playlists/${userId}`);
      const data = await res.json();
      setPlaylists(data);
      
      if (selectedPlaylist) {
        const updatedPlaylist = data.find((p: Playlist) => p.id === selectedPlaylist.id);
        if (updatedPlaylist) {
          setSelectedPlaylist(updatedPlaylist);
        }
      }
    } catch (err) {
      console.error("Load playlists failed:", err);
    }
  };

  const loadPlaylistSongs = async (playlistId: string) => {
    try {
      const res = await fetch(`${API_URL}/playlists/${playlistId}/songs`);
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

  // ✅ เล่น playlist จากหน้า Grid
  const handlePlayPlaylistFromCard = async (e: React.MouseEvent, playlist: Playlist) => {
    e.stopPropagation(); // ป้องกันไม่ให้เปิด playlist
    
    try {
      // Load เพลงใน playlist
      const res = await fetch(`${API_URL}/playlists/${playlist.id}/songs`);
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
      
      alert(`Shuffling ${playlistSongs.length} songs from ${selectedPlaylist.name}`);
    }
  };

  const handleSongAddedToPlaylist = async () => {
    await loadPlaylists();
    if (selectedPlaylist && viewMode === 'detail') {
      await loadPlaylistSongs(selectedPlaylist.id);
    }
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
                    
                    {/* ✅ ปุ่ม Play ตรง Cover */}
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
        <section className={styles.section}>
          <div className={styles.playlistHeader}>
            {selectedPlaylist.coverUrl ? (
              <img 
                src={`${API_URL}${selectedPlaylist.coverUrl}`}
                alt={selectedPlaylist.name}
                className={styles.playlistHeaderCover}
              />
            ) : (
              <div className={styles.playlistHeaderCoverPlaceholder}>
                🎵
              </div>
            )}

            <div className={styles.playlistHeaderInfo}>
              <div>
                <div className={styles.playlistHeaderLabel}>
                  PLAYLIST
                </div>
                <h1 className={styles.playlistHeaderTitle}>
                  {selectedPlaylist.name}
                </h1>
                {selectedPlaylist.description && (
                  <p className={styles.playlistHeaderDescription}>
                    {selectedPlaylist.description}
                  </p>
                )}
                <div className={styles.playlistHeaderMeta}>
                  {selectedPlaylist.songCount} songs · Created {formatDate(selectedPlaylist.createdAt)}
                  {!selectedPlaylist.isPublic && ' · Private'}
                </div>
              </div>

              {playlistSongs.length > 0 && (
                <div className={styles.playlistControls}>
                  <button onClick={handlePlayPlaylist} className={styles.playButton}>
                    ▶️ Play All
                  </button>

                  <button onClick={handleShufflePlaylist} className={styles.shuffleButton}>
                    🔀 Shuffle
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className={styles.resultsList}>
            {playlistSongs.length > 0 ? (
              playlistSongs.map((item, index) => (
                <div key={item.id} className={styles.resultItem}>
                  <div className={styles.resultIndex}>
                    {index + 1}
                  </div>
                  
                  {item.song.coverUrl && (
                    <img 
                      src={item.song.coverUrl} 
                      alt={item.song.title}
                      className={styles.resultCover}
                    />
                  )}
                  
                  <div className={styles.resultInfo}>
                    <div className={styles.resultTitle}>{item.song.title}</div>
                    <div className={styles.resultArtist}>{item.song.artist}</div>
                  </div>
                  
                  <div className={styles.resultDuration}>
                    {formatTime(item.song.duration)}
                  </div>
                  
                  <div className={styles.resultActions}>
                    <button 
                      onClick={() => handlePlaySong(item.song)}
                      className={styles.buttonPrimary}
                      style={{ padding: '6px 12px', fontSize: '13px' }}
                    >
                      Play
                    </button>
                    <button 
                      onClick={() => handleAddToQueue(item.song)}
                      className={styles.buttonSecondary}
                      style={{ padding: '6px 12px', fontSize: '13px' }}
                    >
                      + Queue
                    </button>
                    <LikeButton 
                      userId={userId} 
                      songId={item.song.id}
                    />
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

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Create New Playlist</h2>
            
            <div className={styles.coverUploadSection}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverSelect}
                style={{ display: 'none' }}
              />
              
              <div className={styles.coverUploadBox} onClick={() => fileInputRef.current?.click()}>
                {coverPreview ? (
                  <img src={coverPreview} alt="Preview" className={styles.coverPreview} />
                ) : (
                  <div className={styles.coverUploadPlaceholder}>
                    <div>
                      <div style={{ fontSize: '32px' }}>📷</div>
                      <div style={{ fontSize: '12px', marginTop: '4px' }}>
                        {uploadingCover ? 'Uploading...' : 'Add Cover'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <small className={styles.coverUploadHint}>
                Click to upload cover image (Max 5MB)
              </small>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Playlist Name *
              </label>
              <input
                type="text"
                placeholder="My Awesome Playlist"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                className={styles.formInput}
                autoFocus
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Description (optional)
              </label>
              <textarea
                placeholder="Describe your playlist..."
                value={newPlaylistDesc}
                onChange={(e) => setNewPlaylistDesc(e.target.value)}
                rows={3}
                className={styles.formTextarea}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Privacy
              </label>
              <div className={styles.privacyToggle}>
                <button
                  type="button"
                  onClick={() => setNewPlaylistIsPublic(true)}
                  className={`${styles.privacyButton} ${newPlaylistIsPublic ? styles.privacyButtonActive : styles.privacyButtonInactive}`}
                >
                  🌍 Public
                </button>
                <button
                  type="button"
                  onClick={() => setNewPlaylistIsPublic(false)}
                  className={`${styles.privacyButton} ${!newPlaylistIsPublic ? styles.privacyButtonActive : styles.privacyButtonInactive}`}
                >
                  🔒 Private
                </button>
              </div>
              <small className={styles.privacyHint}>
                {newPlaylistIsPublic 
                  ? 'Anyone can see this playlist' 
                  : 'Only you can see this playlist'}
              </small>
            </div>

            <div className={styles.modalActions}>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewPlaylistName("");
                  setNewPlaylistDesc("");
                  setNewPlaylistIsPublic(true);
                  setNewPlaylistCoverUrl("");
                  setCoverPreview(null);
                }}
                className={styles.buttonSecondary}
                style={{ padding: '10px 20px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePlaylist}
                disabled={uploadingCover}
                className={styles.buttonPrimary}
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
    </div>
  );
}