import { Routes, Route } from "react-router-dom";
import CommunityRoom from "./pages/CommunityRoom";
import MusicStreaming from "./pages/MusicStreaming";
import LikedSongs from "./pages/LikedSongs";
import Playlist from "./pages/Playlist";
import LokchangRooms from "./pages/LokchangRooms";
import Signin from "./pages/Signin";



function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<MusicStreaming />} />
        <Route path="/community" element={<CommunityRoom />} />
        <Route path="/signin" element={<Signin />} />
        <Route path="/likedsongs" element={<LikedSongs />} />
        <Route path="/playlist" element={<Playlist />} />
        <Route path="/lokchangrooms" element={<LokchangRooms />} />
      </Routes>
</div>
  );
}

export default App;
