import { useState, useEffect } from "react";
import { useLikedSongs } from "./LikedSongsContext";

const API_URL = "http://localhost:3000";

interface LikeButtonProps {
  userId: string;
  songId: string;
  onLikeChange?: (isLiked: boolean) => void | Promise<void>;
}

function LikeButton({ 
  userId, 
  songId, 
  onLikeChange 
}: { 
  userId: string; 
  songId: string; 
  onLikeChange?: (isLiked: boolean) => void;
}) {
  const { isLiked, toggleLike } = useLikedSongs();
  const [loading, setLoading] = useState(false);
  
  // เช็คจาก Context แทน state ของตัวเอง
  const liked = isLiked(songId);

  const handleToggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (loading) return;
    
    setLoading(true);

    try {
      // ใช้ function จาก Context
      await toggleLike(userId, songId);
      
      // เรียก callback (ถ้ามี)
      if (onLikeChange) {
        onLikeChange(!liked);
      }
    } catch (err: any) {
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
        color: liked ? '#dc2626' : '#999',
        border: 'none',
        borderRadius: '4px',
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        opacity: loading ? 0.5 : 1,
      }}
      title={liked ? "Remove from Liked Songs" : "Add to Liked Songs"}
    >
      {liked ? '❤️' : '🤍'}
    </button>
  );
}
export default LikeButton;
