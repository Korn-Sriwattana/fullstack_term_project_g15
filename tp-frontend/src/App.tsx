import { Routes, Route, useLocation } from "react-router-dom";
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
import FriendsPage from "./pages/Friend";
import FriendProfile from "./pages/FriendProfile";

export default function App() {
  const { user, setUser } = useUser();
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  const [globalQueue, setGlobalQueue] = useState<any[]>([]);
  const [globalCurrentIndex, setGlobalCurrentIndex] = useState(0);

  const location = useLocation();
  const isSignin = location.pathname === "/signin";

  useEffect(() => {
    const checkSession = async () => {
      try {
        const result = await authClient.getSession();

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

  return (
    <div className="app-container">
      {!isSignin && <Topbar onToggleSidebar={() => setCollapsed((v) => !v)} />}

      <div className={`app-body ${!isSignin && collapsed ? "collapsed" : ""}`}>
        {!isSignin && <Sidebar collapsed={collapsed} />}

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
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/friends/:id" element={<FriendProfile />} />
          </Routes>
        </main>
      </div>

      {!isSignin && user?.id && (
        <MusicPlayer
          userId={user.id}
          onQueueUpdate={setGlobalQueue}
          onCurrentIndexUpdate={setGlobalCurrentIndex}
        />
      )}
    </div>
  );
}