import { useEffect, useState } from "react";

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [profilePic, setProfilePic] = useState("");

  // ✅ โหลดข้อมูลผู้ใช้
  useEffect(() => {
    fetch("http://localhost:3000/api/profile/me", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then(async (data) => {
        setUser(data);
        setName(data.name || "");
        setProfilePic(data.profilePic || "");

        // ✅ โหลด playlist ของ user
        const playlistsRes = await fetch(
          `http://localhost:3000/playlists/${data.id}`,
          { credentials: "include" }
        );
        const playlistsData = await playlistsRes.json();
        setPlaylists(playlistsData);
      })
      .catch((err) => console.error("Failed to fetch profile:", err));
  }, []);

  // ✅ อัปเดตชื่อและรูป
  const handleSave = async () => {
    await fetch("http://localhost:3000/api/profile/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, profilePic }),
    });
    alert("Profile updated!");
    setEditing(false);
  };

  if (!user) return <p>Loading...</p>;

  return (
    <div
      style={{
        padding: "3rem 6rem",
        fontFamily: "Inter, sans-serif",
        color: "#222",
      }}
    >
      {/* Section: Profile Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
        <img
          src={profilePic || "/default-avatar.png"}
          alt="Profile"
          style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            objectFit: "cover",
          }}
        />

        <div style={{ flex: 1 }}>
          {editing ? (
            <>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  fontSize: "1.8rem",
                  fontWeight: "600",
                  border: "1px solid #ccc",
                  borderRadius: 6,
                  padding: "4px 8px",
                  marginBottom: "0.5rem",
                }}
              />
              <div style={{ marginTop: "0.5rem" }}>
                <input
                  value={profilePic}
                  onChange={(e) => setProfilePic(e.target.value)}
                  placeholder="Profile Image URL"
                  style={{
                    width: "80%",
                    padding: "6px",
                    borderRadius: 6,
                    border: "1px solid #ccc",
                  }}
                />
              </div>
              <button
                onClick={handleSave}
                style={{
                  marginTop: "0.8rem",
                  backgroundColor: "#a855f7",
                  color: "#fff",
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Save
              </button>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: "2rem", fontWeight: "700" }}>{name}</h1>
              <p
                style={{
                  color: "#6b6b6b",
                  marginTop: "-0.4rem",
                  fontSize: "1.1rem",
                }}
              >
                @{user.email?.split("@")[0] || "username"}
              </p>
            </>
          )}
        </div>

        {!editing && (
          <button
            onClick={() => setEditing(true)}
            title="Edit Profile"
            style={{
              background: "none",
              border: "none",
              fontSize: "1.3rem",
              cursor: "pointer",
              color: "#a855f7",
            }}
          >
            ✏️
          </button>
        )}
      </div>

      {/* ข้อมูลเพิ่มเติม */}
      <div style={{ marginTop: "1rem", color: "#555" }}>
        <span style={{ marginRight: "1.5rem" }}>
          <strong>{playlists.length}</strong> Playlists
        </span>
        <span>
          <strong>{user.friendCount || 0}</strong> Friends
        </span>
      </div>

      {/* Bio */}
      <p
        style={{
          marginTop: "1.5rem",
          color: "#444",
          fontStyle: "italic",
        }}
      >
        {user.bio ||
          "If it’s love songs you want, I’ve got more than enough for you!"}
      </p>

      <hr style={{ margin: "1.5rem 0", border: "1px solid #eee" }} />

      {/* ✅ Playlist Section จาก Database */}
      <div>
        <h2 style={{ fontWeight: "700", fontSize: "1.2rem" }}>Your Playlist</h2>

        <div
          style={{
            display: "flex",
            gap: "1.2rem",
            marginTop: "1rem",
            flexWrap: "wrap",
          }}
        >
          {playlists.length > 0 ? (
            playlists.map((pl) => (
              <div
                key={pl.id}
                style={{
                  width: 160,
                  cursor: "pointer",
                }}
              >
                <img
                  src={pl.coverUrl || "/default-cover.png"}
                  alt={pl.name}
                  style={{
                    width: "100%",
                    borderRadius: "0.5rem",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  }}
                />
                <p
                  style={{
                    marginTop: "0.4rem",
                    fontWeight: "600",
                    fontSize: "0.95rem",
                  }}
                >
                  {pl.name}
                </p>
                <p style={{ color: "#777", fontSize: "0.85rem" }}>
                  {pl.songCount
                    ? `${pl.songCount.toLocaleString()} songs`
                    : "0 songs"}
                </p>
              </div>
            ))
          ) : (
            <p style={{ color: "#777" }}>No playlists yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
