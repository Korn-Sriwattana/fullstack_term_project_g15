import { useState } from "react";
import { useUser } from "../components/userContext";

const API_URL = "http://localhost:3000";

const MusicStreaming = () => {
  const { setUser } = useUser();
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState<number | null>(null);

  const handleCreateUser = async () => {
    if (!userName.trim()) {
      alert("Please enter a name");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: userName,
        email: `${Date.now()}@test.com`,
        password: "1234",
      }),
    });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      setUserId(data.id);
      setUserName(data.name);

      console.log("User created:", data);
      // อัปเดต context 
      setUser({
        id: data.id,
        name: data.name,
        email: data.email,
      });

      alert(`User created: ${data.name}`);
    } catch (err) {
      console.error("Create user failed:", err);
      alert("Failed to create user, check console for details.");
    }
  };

  return (
    <div>
      <section>
        <h3> (Test) Create User</h3>
        <input
          type="text"
          placeholder="Enter your name"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
        />
        <button onClick={handleCreateUser}>Create User</button>
        <p>Current User: {userName || "Not created"}</p>
      </section>
    </div>
  );
};

export default MusicStreaming;
