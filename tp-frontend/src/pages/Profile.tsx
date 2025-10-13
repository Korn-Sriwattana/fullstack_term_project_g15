import { useEffect, useState, useRef } from "react";
import { useUser } from "../components/userContext";
import type { Song } from "../types/song.ts";
import LikeButton from "../components/LikeButton";
import AddToPlaylistButton from "../components/AddToPlaylist";

import styles from "../assets/styles/Playlist.module.css";
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
  ownerId: string; 
}

interface PlaylistSong {
  id: string;
  song: Song;
  addedAt: string;
  customOrder?: number;
}

export default function Profile() {
  const { user, setUser, loading } = useUser(); // ✅ ดึงข้อมูลจาก context
  
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [profilePic, setProfilePic] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlistSongs, setPlaylistSongs] = useState<PlaylistSong[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const API_URL = "http://localhost:3000";
    
    // Sort state
    const [sortBy, setSortBy] = useState<'custom' | 'dateAdded' | 'title' | 'artist' | 'duration'>('custom');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    
    useEffect(() => {
      if (user?.id) {
        loadPlaylists();
      }
    }, [user?.id]);

    useEffect(() => {
      // บันทึก id ของผู้ใช้ที่กำลังดู (ล็อกอินอยู่)
      if (user?.id) {
        localStorage.setItem("viewerId", user.id);
      }
    }, [user]);

  
    // Reload เมื่อ sortBy เปลี่ยน
    useEffect(() => {
      if (selectedPlaylist && viewMode === 'detail') {
        loadPlaylistSongs(selectedPlaylist.id);
      }
    }, [selectedPlaylist, viewMode, sortBy]);
  
    const loadPlaylists = async () => {
      try {
        if (!user?.id) return;

        const viewerId = localStorage.getItem("viewerId") || user.id;
        const res = await fetch(`${API_URL}/playlists/${user.id}?viewerId=${viewerId}`);
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
  
  // ✅ ฟังก์ชันสร้าง Avatar SVG
  const createSvgAvatar = (name: string) => {
    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const svg = `
      <svg width="120" height="120" xmlns="http://www.w3.org/2000/svg">
        <rect width="120" height="120" fill="#a855f7"/>
        <text x="50%" y="50%" font-family="Arial" font-size="48" font-weight="bold"
              fill="white" text-anchor="middle" dominant-baseline="central">
          ${initials}
        </text>
      </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  // ✅ Helper สำหรับแปลง URL ของรูป
  const getImageUrl = (picUrl: string | null) => {
    if (!picUrl) return createSvgAvatar(name || "User");

    if (picUrl.startsWith("http://") || picUrl.startsWith("https://")) {
      if (picUrl.includes("googleusercontent.com")) {
        return `${API_URL}/api/proxy-image?url=${encodeURIComponent(picUrl)}`;
      }
      return picUrl;
    }

    return `${API_URL}${picUrl}`;
  };

  // ✅ โหลด playlist ของ user
  useEffect(() => {
    const loadPlaylists = async () => {
      if (!user?.id) return;
      try {
        const res = await fetch(`${API_URL}/playlists/${user.id}`);
        const data = await res.json();
        setPlaylists(data);
      } catch (err) {
        console.error("Failed to load playlists:", err);
      }
    };

    loadPlaylists();
  }, [user]);

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
      if (!user?.id) {
        alert("Please create user first");
        return;
      }
  
      if ((window as any).musicPlayer) {
        await (window as any).musicPlayer.playSong(song);
      }
    };
  
    const handleAddToQueue = async (song: Song) => {
      if (!user?.id) {
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
  
    if (!user?.id) {
      return (
        <div className={styles.container}>
          <h2>Please create user first</h2>
        </div>
      );
    }

  // ✅ เมื่อ user โหลดเสร็จ ให้ sync ชื่อและรูป
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      // ถ้า backend เพิ่ม field profilePic ในตาราง user ให้ใช้ตรงนี้
      setProfilePic((user as any).profilePic || "");
    }
  }, [user]);

  // ✅ อัปโหลดรูปโปรไฟล์
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File size too large. Maximum 5MB allowed.");
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch(`${API_URL}/upload/profile-pic`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      setProfilePic(data.imageUrl);
      setPreview(null);
      setImageError(false);

      // ✅ อัปเดตข้อมูลใน backend
      await fetch(`${API_URL}/api/profile/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, profilePic: data.imageUrl }),
      });

      // ✅ sync user context
      setUser((prev: any) => ({ ...prev, profilePic: data.imageUrl }));
      alert("Profile picture updated!");
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to upload image.");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  // ✅ บันทึกชื่อใหม่
  const handleSave = async () => {
    try {
      await fetch(`${API_URL}/api/profile/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, profilePic }),
      });
      setUser((prev: any) => ({ ...prev, name, profilePic }));
      alert("Profile updated!");
      setEditing(false);
    } catch (err) {
      console.error("Failed to update profile:", err);
    }
  };

  // ✅ Loading & Redirect
  if (loading) return <p>Loading...</p>;
  if (!user) {
    window.location.href = "/signin";
    return null;
  }

  // ✅ ส่วนแสดงผล (UI เหมือนเดิม)
  return (
    <div
      style={{
        padding: "3rem 6rem",
        fontFamily: "Inter, sans-serif",
        color: "#222",
      }}
    >
      {/* Header Section */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
        <div style={{ position: "relative" }}>
          <img
            src={
              preview ||
              (imageError ? createSvgAvatar(name) : getImageUrl(profilePic))
            }
            alt="Profile"
            onError={() => setImageError(true)}
            style={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              objectFit: "cover",
              border: "none",
            }}
          />

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: "none" }}
          />

          {editing && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                transform: "translate(30%, 30%)",
                background: uploading ? "#ddd" : "white",
                color: uploading ? "#999" : "#444",
                border: "1px solid #ccc",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                cursor: uploading ? "not-allowed" : "pointer",
                boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
                transition: "all 0.2s ease",
              }}
              title={uploading ? "Uploading..." : "Change profile picture"}
            >
              {uploading ? "⏳" : "📷"}
            </button>
          )}
        </div>

        <div style={{ flex: 1 }}>
          {editing ? (
            <>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  fontSize: "1.8rem",
                  fontWeight: "600",
                  border: "1px solid #ccc",
                  borderRadius: 6,
                  padding: "4px 8px",
                  marginBottom: "0.5rem",
                }}
              />
              <button
                onClick={handleSave}
                style={{
                  marginTop: "0.8rem",
                  backgroundColor: "#a855f7",
                  color: "#fff",
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Save
              </button>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: "2rem", fontWeight: "700" }}>{name}</h1>
              <p
                style={{
                  color: "#6b6b6b",
                  marginTop: "-0.4rem",
                  fontSize: "1.1rem",
                }}
              >
                @{user.email?.split("@")[0] || "username"}
              </p>
            </>
          )}
        </div>

        {!editing && (
          <button
            onClick={() => setEditing(true)}
            title="Edit Profile"
            style={{
              background: "none",
              border: "none",
              fontSize: "1.3rem",
              cursor: "pointer",
              color: "#a855f7",
            }}
          >
            ✏️
          </button>
        )}
      </div>

      {/* Stats */}
      <div style={{ marginTop: "1rem", color: "#555" }}>
        <span style={{ marginRight: "1.5rem" }}>
          <strong>{playlists.length}</strong> Playlists
        </span>
        <span>
          <strong>{(user as any).friendCount || 0}</strong> Friends
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
                      {viewMode === 'list' ? 'Public Playlists' : selectedPlaylist?.name}
                    </h1>
                  </div>
                </div>

      {/* LIST VIEW - Playlists Grid */}
      {viewMode === 'list' && (
        <section className={styles.section}>
          <h3>Playlists ({playlists.length})</h3>
          
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

          {/* Sort Controls */}
          {playlistSongs.length > 0 && (
            <div style={{
              display: 'flex',
              gap: '8px',
              padding: '12px 0',
              borderBottom: '1px solid #e5e5e5',
              marginBottom: '12px',
              flexWrap: 'wrap'
            }}>
              <span style={{ fontSize: '13px', color: '#666', marginRight: '8px', lineHeight: '28px' }}>Sort by:</span>
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
                style={{
                  padding: '4px 12px',
                  fontSize: '13px',
                  border: sortBy === 'dateAdded' ? '1px solid #1DB954' : '1px solid #ddd',
                  background: sortBy === 'dateAdded' ? '#f0fff4' : 'white',
                  color: sortBy === 'dateAdded' ? '#1DB954' : '#666',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  fontWeight: sortBy === 'dateAdded' ? '600' : '400'
                }}
              >
                Date Added {sortBy === 'dateAdded' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button
                onClick={() => handleSortChange('title')}
                style={{
                  padding: '4px 12px',
                  fontSize: '13px',
                  border: sortBy === 'title' ? '1px solid #1DB954' : '1px solid #ddd',
                  background: sortBy === 'title' ? '#f0fff4' : 'white',
                  color: sortBy === 'title' ? '#1DB954' : '#666',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  fontWeight: sortBy === 'title' ? '600' : '400'
                }}
              >
                Title {sortBy === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button
                onClick={() => handleSortChange('artist')}
                style={{
                  padding: '4px 12px',
                  fontSize: '13px',
                  border: sortBy === 'artist' ? '1px solid #1DB954' : '1px solid #ddd',
                  background: sortBy === 'artist' ? '#f0fff4' : 'white',
                  color: sortBy === 'artist' ? '#1DB954' : '#666',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  fontWeight: sortBy === 'artist' ? '600' : '400'
                }}
              >
                Artist {sortBy === 'artist' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button
                onClick={() => handleSortChange('duration')}
                style={{
                  padding: '4px 12px',
                  fontSize: '13px',
                  border: sortBy === 'duration' ? '1px solid #1DB954' : '1px solid #ddd',
                  background: sortBy === 'duration' ? '#f0fff4' : 'white',
                  color: sortBy === 'duration' ? '#1DB954' : '#666',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  fontWeight: sortBy === 'duration' ? '600' : '400'
                }}
              >
                Duration {sortBy === 'duration' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
            </div>
          )}

          <div className={styles.resultsList}>
            {playlistSongs.length > 0 ? (
              playlistSongs.map((item, index) => (
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
