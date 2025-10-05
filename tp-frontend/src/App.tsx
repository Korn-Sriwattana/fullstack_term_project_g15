import { Routes, Route } from "react-router-dom";
import CommunityRoom from "./pages/CommunityRoom";
import MusicStreaming from "./pages/MusicStreaming";

function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<MusicStreaming />} />
        <Route path="/community" element={<CommunityRoom />} />
      </Routes>
</div>
  );
}

export default App;
