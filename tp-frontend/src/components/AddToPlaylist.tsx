import { useState, useEffect } from "react";
import type { Song } from "../types/song";

const API_URL = "http://localhost:3000";

interface Playlist {
  id: string;
  name: string;
  songCount: number;
}

export interface AddToPlaylistButtonProps {
  userId: string;
  song: Song;
  iconOnly?: boolean;
  buttonClassName?: string;
  buttonStyle?: React.CSSProperties;
  onSuccess?: () => void | Promise<void>;
}

export default function AddToPlaylistButton({
  userId,
  song,
  iconOnly = false,
  buttonClassName = "",
  buttonStyle = {},
  onSuccess,
}: AddToPlaylistButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (showModal && userId) {
      loadPlaylists();
    }
  }, [showModal, userId]);

  const loadPlaylists = async () => {
    try {
      const res = await fetch(`${API_URL}/playlists/${userId}`);
      const data = await res.json();
      setPlaylists(data);
    } catch (err) {
      console.error("Load playlists failed:", err);
    }
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/playlists/${playlistId}/songs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId: song.id }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        if (res.status === 409) {
          alert(errorData.message || "Song already in playlist");
        } else {
          throw new Error("Failed to add song");
        }
        return;
      }

      alert("Added to playlist!");
      setShowModal(false);
      
      // เรียก callback เมื่อสำเร็จ
      if (onSuccess) {
        await onSuccess();
      }
    } catch (err) {
      console.error("Add to playlist failed:", err);
      alert("Failed to add to playlist");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowModal(true);
        }}
        className={buttonClassName}
        style={buttonStyle}
        title="Add to playlist"
      >
        {iconOnly ? "➕" : "+ Playlist"}
      </button>

      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "white",
              padding: "24px",
              borderRadius: "12px",
              width: "400px",
              maxHeight: "500px",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              <h3 style={{ margin: 0, marginBottom: "8px" }}>
                Add to Playlist
              </h3>
              <div
                style={{
                  fontSize: "14px",
                  color: "#666",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {song.coverUrl && (
                  <img
                    src={song.coverUrl}
                    alt={song.title}
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "4px",
                      objectFit: "cover",
                    }}
                  />
                )}
                <div>
                  <div style={{ fontWeight: 500 }}>{song.title}</div>
                  <div style={{ fontSize: "12px", color: "#888" }}>
                    {song.artist}
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                marginBottom: "16px",
              }}
            >
              {playlists.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {playlists.map((playlist) => (
                    <button
                      key={playlist.id}
                      onClick={() => handleAddToPlaylist(playlist.id)}
                      disabled={loading}
                      style={{
                        padding: "12px",
                        border: "1px solid #ddd",
                        borderRadius: "8px",
                        background: "white",
                        cursor: loading ? "not-allowed" : "pointer",
                        textAlign: "left",
                        transition: "all 0.2s",
                        opacity: loading ? 0.6 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!loading) {
                          e.currentTarget.style.background = "#f0fdf4";
                          e.currentTarget.style.borderColor = "#1db954";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "white";
                        e.currentTarget.style.borderColor = "#ddd";
                      }}
                    >
                      <div style={{ fontWeight: 500, marginBottom: "4px", color: "#333", }}>
                        {playlist.name}
                      </div>
                      <div style={{ fontSize: "12px", color: "#666" }}>
                        {playlist.songCount} songs
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 20px",
                    color: "#666",
                  }}
                >
                  <div style={{ fontSize: "48px", marginBottom: "12px" }}>
                    📝
                  </div>
                  <div style={{ marginBottom: "8px" }}>No playlists yet</div>
                  <div style={{ fontSize: "14px", color: "#888" }}>
                    Create a playlist first
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowModal(false)}
              style={{
                padding: "10px",
                border: "1px solid #ddd",
                color: "#333",
                borderRadius: "6px",
                background: "white",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}