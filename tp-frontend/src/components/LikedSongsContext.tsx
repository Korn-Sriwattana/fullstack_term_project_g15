import React, { createContext, useContext, useState, useCallback } from 'react';

const API_URL = "http://localhost:3000";

interface LikedSongsContextType {
  likedSongIds: Set<string>;
  isLiked: (songId: string) => boolean;
  toggleLike: (userId: string, songId: string) => Promise<void>;
  refreshLikedSongs: (userId: string) => Promise<void>;
}

const LikedSongsContext = createContext<LikedSongsContextType | undefined>(undefined);

export function LikedSongsProvider({ children }: { children: React.ReactNode }) {
  const [likedSongIds, setLikedSongIds] = useState<Set<string>>(new Set());

  // โหลด liked songs ทั้งหมดจาก API
  const refreshLikedSongs = useCallback(async (userId: string) => {
    if (!userId) return;
    
    try {
      const res = await fetch(`${API_URL}/liked-songs/${userId}`);
      const data = await res.json();
      
      // สร้าง Set ของ song IDs ที่ liked
      const ids = new Set<string>(
        data.map((item: any) => String(item.song.id))
      );
      setLikedSongIds(ids);
    } catch (err) {
      console.error("Failed to load liked songs:", err);
    }
  }, []);

  // เช็คว่าเพลงถูก liked หรือไม่
  const isLiked = useCallback((songId: string) => {
    return likedSongIds.has(songId);
  }, [likedSongIds]);

  // Toggle like/unlike
  const toggleLike = useCallback(async (userId: string, songId: string) => {
    const wasLiked = likedSongIds.has(songId);

    try {
      if (wasLiked) {
        // Unlike
        const res = await fetch(`${API_URL}/liked-songs/${userId}/${songId}`, {
          method: "DELETE",
        });

        if (!res.ok) throw new Error("Failed to unlike");

        // อัปเดต state ทันที (Optimistic Update)
        setLikedSongIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(songId);
          return newSet;
        });
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

        // อัปเดต state ทันที (Optimistic Update)
        setLikedSongIds(prev => {
          const newSet = new Set(prev);
          newSet.add(songId);
          return newSet;
        });
      }
    } catch (err: any) {
      console.error("Toggle like failed:", err);
      
      // ถ้า error ให้ revert state กลับ
      setLikedSongIds(prev => {
        const newSet = new Set(prev);
        if (wasLiked) {
          newSet.add(songId); // เพิ่มกลับ
        } else {
          newSet.delete(songId); // ลบออก
        }
        return newSet;
      });
      
      throw err; // throw ต่อเพื่อให้ component จัดการ
    }
  }, [likedSongIds]);

  return (
    <LikedSongsContext.Provider value={{ likedSongIds, isLiked, toggleLike, refreshLikedSongs }}>
      {children}
    </LikedSongsContext.Provider>
  );
}

// Hook สำหรับใช้งาน Context
export function useLikedSongs() {
  const context = useContext(LikedSongsContext);
  if (!context) {
    throw new Error('useLikedSongs must be used within LikedSongsProvider');
  }
  return context;
}