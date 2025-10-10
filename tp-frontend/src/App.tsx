import { Routes, Route } from "react-router-dom";
import { useState } from "react";
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

export default function App() {
  const { user } = useUser();
  
  // Global queue state
  const [globalQueue, setGlobalQueue] = useState<any[]>([]);
  const [globalCurrentIndex, setGlobalCurrentIndex] = useState(0);

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
                <Home 
                  queue={globalQueue} 
                  currentIndex={globalCurrentIndex} 
                />
              } 
            />  
            <Route path="/signin" element={<Signin />} />
            <Route path="/likedsongs" element={<LikedSongs />} />
            <Route path="/playlist" element={<Playlist />} />
            <Route path="/lokchangrooms" element={<LokchangRooms />} />
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