import { Routes, Route } from "react-router-dom";
import CommunityRoom from "./pages/CommunityRoom";
import MusicStreaming from "./pages/MusicStreaming";
import LikedSongs from "./pages/LikedSongs";
import Playlist from "./pages/Playlist";
import LokchangRooms from "./pages/LokchangRooms";
import Signin from "./pages/Signin";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import "./assets/styles/App.css";

export default function App() {


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
            <Route path="/" element={<MusicStreaming />} />  
          <Route path="/community" element={<CommunityRoom />} />
          <Route path="/signin" element={<Signin />} />
            <Route path="/likedsongs" element={<LikedSongs />} />
            <Route path="/playlist" element={<Playlist />} />
            <Route path="/lokchangrooms" element={<LokchangRooms />} />
          </Routes>
        </main>

      </div>
    </div>
  );
}
