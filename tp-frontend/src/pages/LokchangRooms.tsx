import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

import RoomSection from "../components/Room";
import ChatSection from "../components/Chat";
import QueueSection from "../components/Queue";
import { useUser } from "../components/userContext";

import styles from "../assets/styles/lokchang-rooms.module.css";

//images
import coverImg from "../assets/images/cover_chatroom.jpg";

const API_URL = "http://localhost:3000";

const LokchangRooms = () => {
  const { user } = useUser();
  if (!user) {
    return <p>Please create user first.</p>;
  }

  const userId = user?.id || "";

  const [roomId, setRoomId] = useState("");
  const [roomHostId, setRoomHostId] = useState<string>(""); 
  const [roomNameInput, setRoomNameInput] = useState("");
  const [roomDescriptionInput, setRoomDescriptionInput] = useState("");
  const [currentRoomName, setCurrentRoomName] = useState("");
  const [currentInviteCode, setCurrentInviteCode] = useState("");
  const [currentIsPublic, setCurrentIsPublic] = useState(true);

  const [inviteCodeInput, setInviteCodeInput] = useState("");

  const [mode, setMode] = useState<"public" | "private">("public");
  const [publicRooms, setPublicRooms] = useState<any[]>([]);

  const [messages, setMessages] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  const [roomCount, setRoomCount] = useState(0);

  const socketRef = useRef<Socket | null>(null);
  const roomIdRef = useRef<string>("");

  const [queue, setQueue] = useState<any[]>([]);
  const [nowPlaying, setNowPlaying] = useState<any>(null);

  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isMuted, setIsMuted] = useState(true);

  // 🔒 เพิ่ม: ป้องกันการกดซ้ำ
  const [isProcessing, setIsProcessing] = useState(false);
  const processingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 🆕 Modal state
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);

  function extractVideoId(url: string): string | null {
    try {
      const parsed = new URL(url);
      if (parsed.hostname === "youtu.be") {
        return parsed.pathname.slice(1);
      }
      if (parsed.searchParams.has("v")) {
        return parsed.searchParams.get("v");
      }
      return null;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  useEffect(() => {
    if (socketRef.current) return;

    const socket = io(API_URL, {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected:", socket.id);
      if (roomIdRef.current) socket.emit("join-room", roomIdRef.current);
    });

    socket.on("reconnect", () => {
      if (roomIdRef.current) socket.emit("join-room", roomIdRef.current);
    });

    socket.on("chat-message", (data: any) => {
      setMessages((prev) => [...prev, data]);
    });

    socket.on("room-created", (newRoom: any) => {
      if (newRoom.isPublic) setPublicRooms((prev) => [...prev, newRoom]);
    });

    socket.on("room-count-updated", ({ roomId: updatedRoomId, count }: any) => {
      setPublicRooms((prev) =>
        prev.map((r) => (r.roomId === updatedRoomId ? { ...r, count } : r))
      );
      if (updatedRoomId === roomIdRef.current) setRoomCount(count);
    });

    socket.on("queue-sync", ({ queue }: { queue: any[] }) => {
      console.log("✅ queue-sync received:", queue.length, "items");
      setQueue(queue);
      
      setIsProcessing(false);
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }
    });

    socket.on("now-playing", ({ roomId: rId, song, startedAt, hostId }: any) => {
      console.log("now-playing received:", { rId, song, startedAt });
      
      if (rId !== roomIdRef.current) return;
      if (hostId) setRoomHostId(hostId);
      if (!song) {
        setNowPlaying(null);
        return;
      }

      const elapsed = startedAt
        ? Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
        : 0;

      console.log("Song info:", { 
        title: song.title, 
        duration: song.duration, 
        elapsed
      });

      setNowPlaying({
        ...song,
        startTime: Math.max(0, elapsed),
        duration: song.duration,
      });

      setIsProcessing(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (roomId && socketRef.current) {
      socketRef.current.emit("join-room", roomId);
    }
  }, [roomId]);

  useEffect(() => {
    fetch(`${API_URL}/rooms/public`)
      .then((res) => res.json())
      .then((data) => setPublicRooms(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!roomId) return;
    fetch(`${API_URL}/chat/${roomId}`)
      .then((res) => res.json())
      .then((data) => setMessages(data))
      .catch(console.error);
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;

    fetch(`${API_URL}/rooms/${roomId}/queue`)
      .then((res) => res.json())
      .then((data) => {
        console.log("Initial queue loaded:", data);
        setQueue(data);
      })
      .catch(console.error);
  }, [roomId]);

  const handleJoinRoom = async (invite?: string) => {
    const code = invite || inviteCodeInput;
    if (!userId || !code.trim()) {
      alert("Missing userId or inviteCode");
      return;
    }

    if (roomId && socketRef.current) {
      socketRef.current.emit("leave-room", { roomId, userId });
      setQueue([]);
      setNowPlaying(null);
      setMessages([]);
      setRoomId("");
      setCurrentRoomName("");
      setCurrentInviteCode("");
      setCurrentIsPublic(true);
    }

    try {
      const res = await fetch(`${API_URL}/rooms/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: code, userId }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to join room");
        return;
      }

      if (data.roomId) {
        setRoomId(data.roomId);
        setCurrentRoomName(data.roomName);
        setCurrentInviteCode(data.inviteCode);
        setCurrentIsPublic(data.isPublic);

        const [queueRes, chatRes] = await Promise.all([
          fetch(`${API_URL}/rooms/${data.roomId}/queue`).then((r) => r.json()),
          fetch(`${API_URL}/chat/${data.roomId}`).then((r) => r.json()),
        ]);

        setQueue(queueRes);
        setMessages(chatRes);

        alert(`Joined Room: ${data.roomName}`);
      }
    } catch (error) {
      console.error("Error joining room:", error);
      alert("Failed to join room");
    }
  };

  const handleCreateRoom = async () => {
    if (!userId) {
      alert("Create user first!");
      return;
    }
    if (!roomNameInput.trim()) {
      alert("Please enter a room name!");
      return;
    }

    const res = await fetch(`${API_URL}/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hostId: userId,
        name: roomNameInput,
        description: roomDescriptionInput || undefined,
        isPublic: mode === "public",
      }),
    });
    const created = await res.json();

    setRoomId(created.roomId);
    setCurrentRoomName(created.roomName);
    setCurrentInviteCode(created.inviteCode);
    setCurrentIsPublic(created.isPublic);
    setRoomNameInput("");
    setRoomDescriptionInput("");

    setNowPlaying(null);

    fetch(`${API_URL}/rooms/${created.roomId}/queue`)
      .then(res => res.json())
      .then(data => {
        setQueue(data);
      });

    // 🆕 ปิด modal หลังสร้างห้อง
    setShowCreateRoomModal(false);

    alert(
      `Room created & joined: ${created.roomName} (${created.isPublic ? "Public" : "Private"})`
    );
  };

  const handleLeaveRoom = () => {
    if (roomId && socketRef.current) {
      socketRef.current.emit("leave-room", { roomId, userId });

      setRoomId("");
      setCurrentRoomName("");
      setCurrentInviteCode("");
      setCurrentIsPublic(true);

      setMessages([]);
      setQueue([]);
      setNowPlaying(null);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !roomId || !userId) return;
    socketRef.current?.emit("chat-message", { roomId, userId, message });
    setMessage("");
  };

  const handleAdd = async () => {
    if (!roomId || !youtubeUrl.trim() || !userId) return;
    if (isProcessing) {
      console.log("⚠️ Already processing, please wait...");
      return;
    }
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      alert("Invalid YouTube URL");
      return;
    }

    setIsProcessing(true);
    processingTimeoutRef.current = setTimeout(() => {
      setIsProcessing(false);
    }, 3000);

    const res = await fetch(`${API_URL}/songs/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        youtubeVideoId: videoId,
      }),
    });

    const song = await res.json();

    if (!song.id) {
      alert("Failed to add/find song");
      return;
    }

    socketRef.current?.emit("queue-add", {
      roomId,
      songId: song.id,
      userId,
    });

    setYoutubeUrl("");
  };

  const handleToggleMute = () => {
    setIsMuted(prev => !prev);
  };

  const handleRemove = (queueId: string) => {
    if (!roomId) return;
    if (userId !== roomHostId) {
      alert("Only the host can remove songs");
      return;
    }
    if (isProcessing) {
      console.log("⚠️ Already processing, please wait...");
      return;
    }

    const itemExists = queue.find(item => item.id === queueId);
    if (!itemExists) {
      console.log("⚠️ Item not in queue anymore");
      return;
    }

    setIsProcessing(true);
    processingTimeoutRef.current = setTimeout(() => {
      setIsProcessing(false);
    }, 3000);
    setQueue(prev => prev.filter(item => item.id !== queueId));

    console.log("📤 Emitting queue-remove:", { roomId, queueId });
    socketRef.current?.emit("queue-remove", { roomId, queueId });
  };

  const handleSkip = () => {
    if (!roomId) return;
    if (userId !== roomHostId) {
      alert("Only the host can skip songs");
      return;
    }
    if (isProcessing) {
      console.log("⚠️ Already processing, please wait...");
      return;
    }
    setIsProcessing(true);
    processingTimeoutRef.current = setTimeout(() => {
      setIsProcessing(false);
    }, 3000);

    console.log("📤 Emitting skip-song:", { roomId });
    socketRef.current?.emit("skip-song", { roomId });
  };

  const handleReorder = (queueId: string, direction: 'up' | 'down') => {
    if (!roomId) return;
    if (userId !== roomHostId) {
      alert("Only the host can reorder songs");
      return;
    }

    if (isProcessing) {
      console.log("⚠️ Already processing, please wait...");
      return;
    }

    const currentIndex = queue.findIndex(item => item.id === queueId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= queue.length) return;

    setIsProcessing(true);
    processingTimeoutRef.current = setTimeout(() => {
      setIsProcessing(false);
    }, 3000);

    console.log("📤 Emitting queue-reorder:", { roomId, queueId, newIndex });
    socketRef.current?.emit("queue-reorder", { roomId, queueId, newIndex });
  };

  return (
    <div className={styles["lok-page"]}>
      <div style={{ padding: "1rem", fontFamily: "sans-serif" }}>
        <h1 className={styles["lok-title"]}>Look Chang Room</h1>

        <div className={styles["lok-banner"]}>
          <img src={coverImg} alt="cover" />
        </div>

        {/* 🆕 Header with Create Button */}
        {!roomId && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '1.5rem',
            padding: '0 0.5rem'
          }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Join or Create Room</h2>
            <button 
              onClick={() => setShowCreateRoomModal(true)}
              style={{
                padding: '10px 24px',
                fontSize: '14px',
                fontWeight: '600',
                color: 'white',
                backgroundColor: '#1db954',
                border: 'none',
                borderRadius: '24px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#1ed760';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#1db954';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              Create Room
            </button>
          </div>
        )}

        <RoomSection
          {...{ roomNameInput, setRoomNameInput, roomDescriptionInput, setRoomDescriptionInput,
                mode, setMode, handleCreateRoom, inviteCodeInput, setInviteCodeInput,
                handleJoinRoom, publicRooms, currentRoomName, currentInviteCode,
                currentIsPublic, roomCount, roomId, handleLeaveRoom }}
        />
        <ChatSection {...{ messages, message, setMessage, handleSendMessage }} />
        <QueueSection {...{ queue, nowPlaying, youtubeUrl, setYoutubeUrl,
                            handleAdd, handleRemove, isMuted, handleToggleMute,
                            socketRef, roomIdRef, handleSkip, handleReorder, isHost: userId === roomHostId, isProcessing }} />
      </div>

      {/* 🆕 Create Room Modal - คล้ายกับ Playlist Modal */}
      {showCreateRoomModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setShowCreateRoomModal(false)}
        >
          <div 
            style={{
              backgroundColor: '#282828',
              borderRadius: '16px',
              padding: '32px',
              width: '90%',
              maxWidth: '500px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              animation: 'slideIn 0.3s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ 
              margin: '0 0 24px 0', 
              fontSize: '24px',
              fontWeight: '700',
              color: 'white'
            }}>
              Create New Room
            </h2>

            {/* Room Name */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#b3b3b3'
              }}>
                Room Name *
              </label>
              <input
                type="text"
                placeholder="My Awesome Room"
                value={roomNameInput}
                onChange={(e) => setRoomNameInput(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '16px',
                  backgroundColor: '#3e3e3e',
                  border: '1px solid #535353',
                  borderRadius: '8px',
                  color: 'white',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#1db954'}
                onBlur={(e) => e.target.style.borderColor = '#535353'}
              />
            </div>

            {/* Description */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#b3b3b3'
              }}>
                Description (optional)
              </label>
              <textarea
                placeholder="Describe your room..."
                value={roomDescriptionInput}
                onChange={(e) => setRoomDescriptionInput(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '16px',
                  backgroundColor: '#3e3e3e',
                  border: '1px solid #535353',
                  borderRadius: '8px',
                  color: 'white',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#1db954'}
                onBlur={(e) => e.target.style.borderColor = '#535353'}
              />
            </div>

            {/* Privacy Dropdown */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#b3b3b3'
              }}>
                Privacy
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as "public" | "private")}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '16px',
                  backgroundColor: '#3e3e3e',
                  border: '1px solid #535353',
                  borderRadius: '8px',
                  color: 'white',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'all 0.2s',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  backgroundSize: '20px',
                  paddingRight: '40px'
                }}
                onFocus={(e) => e.target.style.borderColor = '#1db954'}
                onBlur={(e) => e.target.style.borderColor = '#535353'}
              >
                <option value="public" style={{ backgroundColor: '#282828' }}>
                  🌍 Public
                </option>
                <option value="private" style={{ backgroundColor: '#282828' }}>
                  🔒 Private
                </option>
              </select>
              <small style={{ 
                display: 'block',
                marginTop: '8px',
                fontSize: '12px',
                color: '#b3b3b3'
              }}>
                {mode === "public" 
                  ? 'This room will appear in public room list' 
                  : 'Only people with invite code can join'}
              </small>
            </div>

            {/* Action Buttons */}
            <div style={{ 
              display: 'flex', 
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowCreateRoomModal(false);
                  setRoomNameInput("");
                  setRoomDescriptionInput("");
                  setMode("public");
                }}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  border: '1px solid #535353',
                  borderRadius: '24px',
                  backgroundColor: 'transparent',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#3e3e3e';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRoom}
                disabled={!roomNameInput.trim()}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  border: 'none',
                  borderRadius: '24px',
                  backgroundColor: roomNameInput.trim() ? '#1db954' : '#535353',
                  color: 'white',
                  cursor: roomNameInput.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  opacity: roomNameInput.trim() ? 1 : 0.5
                }}
                onMouseEnter={(e) => {
                  if (roomNameInput.trim()) {
                    e.currentTarget.style.backgroundColor = '#1ed760';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (roomNameInput.trim()) {
                    e.currentTarget.style.backgroundColor = '#1db954';
                    e.currentTarget.style.transform = 'scale(1)';
                  }
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default LokchangRooms;