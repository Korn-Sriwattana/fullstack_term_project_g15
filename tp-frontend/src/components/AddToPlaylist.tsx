import { useState, useEffect } from "react";
import type { Song } from "../types/song.ts";

const API_URL = "http://localhost:3000";

interface Playlist {
  id: string;
  name: string;
  songCount: number;
}

interface AddToPlaylistButtonProps {
  userId: string;
  song: Song;
  buttonStyle?: React.CSSProperties;
  buttonClassName?: string;
  iconOnly?: boolean;
}

export default function AddToPlaylistButton({
  userId,
  song,
  buttonStyle,
  buttonClassName,
  iconOnly = false,
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
      setLoading(true);
      const res = await fetch(`${API_URL}/playlists/${userId}`);
      const data = await res.json();
      setPlaylists(data);
    } catch (err) {
      console.error("Load playlists failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    try {
      const res = await fetch(`${API_URL}/playlists/${playlistId}/songs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId: song.id }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to add");
      }

      alert("Added to playlist!");
      setShowModal(false);
    } catch (err: any) {
      console.error("Add to playlist failed:", err);
      alert(err.message || "Failed to add to playlist");
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
        style={
          buttonStyle || {
            padding: "6px 12px",
            fontSize: "13px",
            background: "white",
            border: "1px solid #ddd",
            borderRadius: "4px",
            cursor: "pointer",
          }
        }
        title="Add to playlist"
      >
        {iconOnly ? "📋" : "📋 Playlist"}
      </button>

      {/* Modal */}
      {showModal && (
        <div
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
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "30px",
              borderRadius: "12px",
              width: "400px",
              maxHeight: "500px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: "16px" }}>Add to Playlist</h2>

            {/* Song Info */}
            <div
              style={{
                padding: "12px",
                backgroundColor: "#f5f5f5",
                borderRadius: "8px",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              {song.coverUrl && (
                <img
                  src={song.coverUrl}
                  alt={song.title}
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "4px",
                  }}
                />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: "14px" }}>
                  {song.title}
                </div>
                <div style={{ fontSize: "12px", color: "#666" }}>
                  {song.artist}
                </div>
              </div>
            </div>

            {/* Playlists List */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                marginBottom: "20px",
              }}
            >
              {loading ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 20px",
                    color: "#666",
                  }}
                >
                  Loading...
                </div>
              ) : playlists.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {playlists.map((playlist) => (
                    <div
                      key={playlist.id}
                      onClick={() => handleAddToPlaylist(playlist.id)}
                      style={{
                        padding: "12px",
                        border: "1px solid #ddd",
                        borderRadius: "8px",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        backgroundColor: "white",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f0fdf4";
                        e.currentTarget.style.borderColor = "#1db954";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "white";
                        e.currentTarget.style.borderColor = "#ddd";
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                        {playlist.name}
                      </div>
                      <div style={{ fontSize: "12px", color: "#666" }}>
                        {playlist.songCount} songs
                      </div>
                    </div>
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
                  <div style={{ fontSize: "36px", marginBottom: "12px" }}>
                    📋
                  </div>
                  <p>No playlists yet</p>
                  <small>Create a playlist first in Your Library</small>
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowModal(false)}
              style={{
                padding: "10px 20px",
                border: "1px solid #ddd",
                borderRadius: "6px",
                background: "white",
                cursor: "pointer",
                width: "100%",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}