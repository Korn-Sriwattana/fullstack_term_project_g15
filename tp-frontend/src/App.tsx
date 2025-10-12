import { Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import Home from "./pages/Home";
import LokchangRooms from "./pages/LokchangRooms";
import LikedSongs from "./pages/LikedSongs";
import Playlist from "./pages/Playlist";
import Signin from "./pages/Signin";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import "./assets/styles/App.css";
import { useUser } from "./components/userContext";
import MusicPlayer from "./components/MusicPlayer";
import Profile from "./pages/Profile";
import { authClient } from "./lib/auth-client";

export default function App() {
  const { user, setUser } = useUser();
  const [loading, setLoading] = useState(true);

  // Global queue state
  const [globalQueue, setGlobalQueue] = useState<any[]>([]);
  const [globalCurrentIndex, setGlobalCurrentIndex] = useState(0);

  // ✅ ตรวจ session ทันทีเมื่อเปิดเว็บ
  useEffect(() => {
    const checkSession = async () => {
      try {
        const result = await authClient.getSession();

        // ✅ ดึงข้อมูลจาก result.data
        const session = result?.data;

        if (session?.user) {
          setUser({
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
          });
        }
      } catch (err) {
        console.error("Session check failed:", err);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, [setUser]);

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: "1.2rem",
          color: "#A855F7",
        }}
      >
        Loading Lukchang Vibe...
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* top-bar */}
      <Topbar />

      {/* body : side-bar + main */}
      <div className="app-body">
        {/* side-bar */}
        <Sidebar />

        {/* main */}
        <main className="app-main">
          <Routes>
            <Route
              path="/"
              element={
                <Home queue={globalQueue} currentIndex={globalCurrentIndex} />
              }
            />
            <Route path="/signin" element={<Signin />} />
            <Route path="/likedsongs" element={<LikedSongs />} />
            <Route path="/playlist" element={<Playlist />} />
            <Route path="/lokchangrooms" element={<LokchangRooms />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </main>
      </div>

      {/* Global Music Player */}
      {user?.id && (
        <MusicPlayer
          userId={user.id}
          onQueueUpdate={setGlobalQueue}
          onCurrentIndexUpdate={setGlobalCurrentIndex}
        />
      )}
    </div>
  );
}
