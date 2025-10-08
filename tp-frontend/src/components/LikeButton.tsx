import { useState, useEffect } from "react";

const API_URL = "http://localhost:3000";

interface LikeButtonProps {
  userId: string;
  songId: string;
  onLikeChange?: (isLiked: boolean) => void;
}

export default function LikeButton({ userId, songId, onLikeChange }: LikeButtonProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkIfLiked();
  }, [userId, songId]);

  const checkIfLiked = async () => {
    try {
      const res = await fetch(`${API_URL}/liked-songs/${userId}/${songId}/check`);
      const data = await res.json();
      setIsLiked(data.isLiked);
    } catch (err) {
      console.error("Check liked status failed:", err);
    }
  };

  const handleToggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (loading) return;
    
    setLoading(true);

    try {
      if (isLiked) {
        // Unlike
        const res = await fetch(`${API_URL}/liked-songs/${userId}/${songId}`, {
          method: "DELETE",
        });

        if (!res.ok) throw new Error("Failed to unlike");

        setIsLiked(false);
        onLikeChange?.(false);
      } else {
        // Like
        const res = await fetch(`${API_URL}/liked-songs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, songId }),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || "Failed to like");
        }

        setIsLiked(true);
        onLikeChange?.(true);
      }
    } catch (err: any) {
      console.error("Toggle like failed:", err);
      alert(err.message || "Failed to update like status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggleLike}
      disabled={loading}
      style={{
        padding: '6px 12px',
        fontSize: '18px',
        background: 'transparent',
        color: isLiked ? '#dc2626' : '#999',
        border: 'none',
        borderRadius: '4px',
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        opacity: loading ? 0.5 : 1,
      }}
      title={isLiked ? "Remove from Liked Songs" : "Add to Liked Songs"}
    >
      {isLiked ? '❤️' : '🤍'}
    </button>
  );
}