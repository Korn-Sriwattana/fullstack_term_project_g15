import { useState, useEffect, useMemo, useRef } from "react";
import { useUser } from "../components/userContext";
import type { Song } from "../types/song.ts";
import LikeButton from "../components/LikeButton";

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
        }),
      });

      if (!res.ok) throw new Error("Failed to create playlist");

      const data = await res.json();
      setPlaylists([...playlists, data]);
      setNewPlaylistName("");
      setNewPlaylistDesc("");
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
        <button 
          onClick={() => setShowCreateModal(true)}
          className={styles.buttonPrimary}
          style={{ padding: '10px 20px' }}
        >
          + Create Playlist
        </button>
      </div>

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
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                          {playlist.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {playlist.songCount} songs
                        </div>
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
                    {playlist.description && (
                      <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                        {playlist.description}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                  No playlists yet
                  <br />
                  <small>Create your first playlist!</small>
                </div>
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
                  <section className={styles.emptyWrap}>
                    <img className={styles.emptyImage} src={""} alt="empty playlist" />
                    <h2 className={styles.emptyTitle}>Your playlist is still empty</h2>
                    <p className={styles.emptyHint}>
                      Tap the + button or start browsing from Search.
                    </p>
                  </section>
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
            width: '400px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}>
            <h2 style={{ marginBottom: '20px' }}>Create New Playlist</h2>
            
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

            <div style={{ marginBottom: '20px' }}>
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

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewPlaylistName("");
                  setNewPlaylistDesc("");
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
                className={styles.buttonPrimary}
                style={{ padding: '10px 20px' }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}