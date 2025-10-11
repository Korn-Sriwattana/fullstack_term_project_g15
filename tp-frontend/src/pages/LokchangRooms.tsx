import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

import RoomSection from "../components/Room";
import ChatSection from "../components/Chat";
import QueueSection from "../components/Queue";
import { useUser } from "../components/userContext";

//css
import styles from "../assets/styles/lokchang-rooms.module.css";

//images
import coverImg from "../assets/images/cover.png";

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

  const [isProcessing, setIsProcessing] = useState(false);
  const processingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  if (!roomId) return;
  fetch(`${API_URL}/chat/${roomId}`)
    .then((res) => res.json())
    .then((data) => {
      console.log("📩 Chat messages loaded:", data);
      console.log("First message:", data[0]);
      setMessages(data);
    })
    .catch(console.error);
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
       if (userId) {
        socket.emit("set-user", userId);
      }
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
      console.log(" queue-sync received:", queue.length, "items");
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
      <div>
        <h1 className={styles["lok-title"]}>Look Chang Room</h1>

        <div className={styles["lok-banner"]}>
          <img src={coverImg} alt="cover" />
        </div>

        <RoomSection
          {...{ roomNameInput, setRoomNameInput, roomDescriptionInput, setRoomDescriptionInput,
                mode, setMode, handleCreateRoom, inviteCodeInput, setInviteCodeInput,
                handleJoinRoom, publicRooms, currentRoomName, currentInviteCode,
                currentIsPublic, roomCount, roomId, handleLeaveRoom }}
        />
        {roomId && (
        <>
          <ChatSection 
            messages={messages}
            message={message}
            setMessage={setMessage}
            handleSendMessage={handleSendMessage}
            currentUserId={userId}
          />
          <QueueSection {...{ queue, nowPlaying, youtubeUrl, setYoutubeUrl,
                              handleAdd, handleRemove, isMuted, handleToggleMute,
                              socketRef, roomIdRef, handleSkip, handleReorder, isHost: userId === roomHostId, isProcessing }} />
          </>
        )}
      </div>
    </div>
  );
};

export default LokchangRooms;
