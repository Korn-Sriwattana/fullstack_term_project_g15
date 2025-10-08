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
  
  // Load playlists
  useEffect(() => {
    if (userId) {
      loadPlaylists();
    }
  }, [userId]);

  // Load songs when playlist selected
  useEffect(() => {
    if (selectedPlaylist) {
      loadPlaylistSongs(selectedPlaylist.id);
    }
  }, [selectedPlaylist]);

  // Real-time search with debounce
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

    // แสดง preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // อัปโหลดรูป
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

      const data = await res.json();
      setPlaylists([...playlists, data]);
      
      // Reset form
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

      setPlaylists(playlists.filter(p => p.id !== playlistId));
      if (selectedPlaylist?.id === playlistId) {
        setSelectedPlaylist(null);
        setPlaylistSongs([]);
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

      setPlaylistSongs(playlistSongs.filter(ps => ps.id !== playlistSongId));
      
      // Update song count
      setPlaylists(playlists.map(p => 
        p.id === selectedPlaylist.id 
          ? { ...p, songCount: p.songCount - 1 }
          : p
      ));
      
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Your Library</h1>
      </div>
      
      {/* Search + Create */}
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

      {/* search result */}
      {searchResults.length === 0 && searchQuery.trim() !== "" && (
        <section className={styles.section}>
          <h3>Search Results</h3>
          <p className={styles.noResults}>No results found.</p>
        </section>
      )}

      {searchResults.length > 0 && (
        <section className={styles.section}>
          <h3>Search Results</h3>
          <div className={styles.resultsList}>
            {searchResults.map((song) => (
              <div
                key={song.id}
                className={styles.resultItem}
                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                {song.coverUrl && (
                  <img 
                    src={song.coverUrl} 
                    alt={song.title}
                    className={styles.resultCover}
                  />
                )}
                <div className={styles.resultInfo} style={{ flex: 1 }}>
                  <div className={styles.resultTitle}>{song.title}</div>
                  <div className={styles.resultArtist}>{song.artist}</div>
                </div>
                <div className={styles.resultDuration}>
                  {formatTime(song.duration)}
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
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
                  {userId && (
                    <>
                      <AddToPlaylistButton 
                        userId={userId} 
                        song={song}
                        iconOnly={false}
                        buttonClassName={styles.buttonSecondary}
                        buttonStyle={{ padding: '6px 12px', fontSize: '13px' }}
                      />
                      <LikeButton 
                        userId={userId} 
                        songId={song.id}
                        onLikeChange={(isLiked) => {
                          console.log(`Song ${song.title} is now ${isLiked ? 'liked' : 'unliked'}`);
                        }}
                      />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' }}>
        {/* Left: Playlists List */}
        <div>
          <section className={styles.section}>
            <h3>Playlists ({playlists.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {playlists.length > 0 ? (
                playlists.map((playlist) => (
                  <div
                    key={playlist.id}
                    onClick={() => setSelectedPlaylist(playlist)}
                    style={{
                      padding: '12px',
                      border: selectedPlaylist?.id === playlist.id ? '2px solid #1db954' : '1px solid #ddd',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: selectedPlaylist?.id === playlist.id ? '#f0fdf4' : 'white',
                      transition: 'all 0.2s',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'center'
                    }}
                  >
                    {/* Cover Image */}
                    {playlist.coverUrl ? (
                      <img 
                        src={`${API_URL}${playlist.coverUrl}`}
                        alt={playlist.name}
                        style={{
                          width: '50px',
                          height: '50px',
                          borderRadius: '4px',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '4px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px'
                      }}>
                        🎵
                      </div>
                    )}

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600 }}>
                          {playlist.name}
                        </span>
                        {!playlist.isPublic && (
                          <span style={{ 
                            fontSize: '10px', 
                            padding: '2px 6px', 
                            background: '#666', 
                            color: 'white', 
                            borderRadius: '4px' 
                          }}>
                            Private
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {playlist.songCount} songs
                      </div>
                      {playlist.description && (
                        <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                          {playlist.description}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePlaylist(playlist.id);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '16px',
                        padding: '4px'
                      }}
                      title="Delete playlist"
                    >
                      🗑️
                    </button>
                  </div>
                ))
              ) : (
                <section className={styles.emptyWrap}>
                  <img className={styles.emptyImage} src={emptyImg} alt="empty playlist" />
                  <h2 className={styles.emptyTitle}>Your playlist is still empty</h2>
                  <p className={styles.emptyHint}>
                    Tap the + button or start browsing from Search.
                  </p>
                </section>
              )}
            </div>
          </section>
        </div>

        {/* Right: Playlist Songs */}
        <div>
          {selectedPlaylist ? (
            <section className={styles.section}>
              <div style={{ marginBottom: '20px' }}>
                <h2>{selectedPlaylist.name}</h2>
                {selectedPlaylist.description && (
                  <p style={{ color: '#666', marginTop: '8px' }}>
                    {selectedPlaylist.description}
                  </p>
                )}
                <div style={{ fontSize: '14px', color: '#888', marginTop: '8px' }}>
                  {selectedPlaylist.songCount} songs · Created {formatDate(selectedPlaylist.createdAt)}
                  {!selectedPlaylist.isPublic && ' · Private'}
                </div>
              </div>

              <div className={styles.resultsList}>
                {playlistSongs.length > 0 ? (
                  playlistSongs.map((item, index) => (
                    <div
                      key={item.id}
                      className={styles.resultItem}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                    >
                      <div style={{ 
                        minWidth: '30px', 
                        textAlign: 'center',
                        color: '#666',
                        fontSize: '14px'
                      }}>
                        {index + 1}
                      </div>
                      
                      {item.song.coverUrl && (
                        <img 
                          src={item.song.coverUrl} 
                          alt={item.song.title}
                          className={styles.resultCover}
                        />
                      )}
                      
                      <div className={styles.resultInfo} style={{ flex: 1 }}>
                        <div className={styles.resultTitle}>{item.song.title}</div>
                        <div className={styles.resultArtist}>{item.song.artist}</div>
                      </div>
                      
                      <div className={styles.resultDuration}>
                        {formatTime(item.song.duration)}
                      </div>
                      
                      <div style={{ display: 'flex', gap: '5px' }}>
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
                          style={{ 
                            padding: '6px 12px', 
                            fontSize: '13px',
                            background: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px', 
                    color: '#666' 
                  }}>
                    No songs in this playlist
                    <br />
                    <small>Search for songs and add them to this playlist</small>
                  </div>
                )}
              </div>
            </section>
          ) : (
            <section className={styles.section}>
              <div style={{ 
                textAlign: 'center', 
                padding: '60px', 
                color: '#666' 
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎵</div>
                <h3>Select a playlist</h3>
                <p style={{ marginTop: '8px' }}>
                  Choose a playlist from the left to view its songs
                </p>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            width: '450px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}>
            <h2 style={{ marginBottom: '20px' }}>Create New Playlist</h2>
            
            {/* Cover Upload */}
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverSelect}
                style={{ display: 'none' }}
              />
              
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '120px',
                  height: '120px',
                  margin: '0 auto',
                  borderRadius: '8px',
                  border: '2px dashed #ddd',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  transition: 'all 0.2s',
                  position: 'relative',
                  background: coverPreview ? 'transparent' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                }}
              >
                {coverPreview ? (
                  <img 
                    src={coverPreview} 
                    alt="Preview" 
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <div style={{ 
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center', 
                    color: 'white' 
                  }}>
                    <div>
                      <div style={{ fontSize: '32px' }}>📷</div>
                      <div style={{ fontSize: '12px', marginTop: '4px' }}>
                        {uploadingCover ? 'Uploading...' : 'Add Cover'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <small style={{ color: '#666', marginTop: '8px', display: 'block' }}>
                Click to upload cover image (Max 5MB)
              </small>
            </div>

            {/* Playlist Name */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                Playlist Name *
              </label>
              <input
                type="text"
                placeholder="My Awesome Playlist"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                autoFocus
              />
            </div>

            {/* Description */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                Description (optional)
              </label>
              <textarea
                placeholder="Describe your playlist..."
                value={newPlaylistDesc}
                onChange={(e) => setNewPlaylistDesc(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Privacy Toggle */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                Privacy
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setNewPlaylistIsPublic(true)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: newPlaylistIsPublic ? '2px solid #1db954' : '1px solid #ddd',
                    borderRadius: '6px',
                    background: newPlaylistIsPublic ? '#f0fdf4' : 'white',
                    cursor: 'pointer',
                    fontWeight: newPlaylistIsPublic ? 600 : 400,
                    transition: 'all 0.2s'
                  }}
                >
                  🌍 Public
                </button>
                <button
                  type="button"
                  onClick={() => setNewPlaylistIsPublic(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: !newPlaylistIsPublic ? '2px solid #1db954' : '1px solid #ddd',
                    borderRadius: '6px',
                    background: !newPlaylistIsPublic ? '#f0fdf4' : 'white',
                    cursor: 'pointer',
                    fontWeight: !newPlaylistIsPublic ? 600 : 400,
                    transition: 'all 0.2s'
                  }}
                >
                  🔒 Private
                </button>
              </div>
              <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
                {newPlaylistIsPublic 
                  ? 'Anyone can see this playlist' 
                  : 'Only you can see this playlist'}
              </small>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewPlaylistName("");
                  setNewPlaylistDesc("");
                  setNewPlaylistIsPublic(true);
                  setNewPlaylistCoverUrl("");
                  setCoverPreview(null);
                }}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  background: 'white',
                  cursor: 'pointer'
                }}
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