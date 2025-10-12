// src/pages/Profile.tsx
import { useEffect, useState } from "react";
import { useUser } from "../components/userContext";

export default function Profile() {
  const { user, token } = useUser();
  const [profile, setProfile] = useState<any>(null);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [profilePic, setProfilePic] = useState("");

  // ✅ โหลดข้อมูลผู้ใช้จาก token
  useEffect(() => {
    if (!token) return;

    const fetchProfile = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/profile/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        setProfile(data);
        setName(data.name || "");
        setProfilePic(data.profilePic || "");

        // ✅ โหลด playlists
        const plRes = await fetch(
          `http://localhost:3000/playlists/${data.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const plData = await plRes.json();
        setPlaylists(plData);
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      }
    };

    fetchProfile();
  }, [token]);

  // ✅ อัปเดตชื่อและรูป
  const handleSave = async () => {
    await fetch("http://localhost:3000/api/profile/me", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, profilePic }),
    });
    alert("Profile updated!");
    setEditing(false);
  };

  if (!profile) return <p>Loading...</p>;

  return (
    <div
      style={{
        padding: "3rem 6rem",
        fontFamily: "Inter, sans-serif",
        color: "#222",
      }}
    >
      {/* Profile Header */}
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
                @{profile.email?.split("@")[0] || "username"}
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

      <div style={{ marginTop: "1rem", color: "#555" }}>
        <span style={{ marginRight: "1.5rem" }}>
          <strong>{playlists.length}</strong> Playlists
        </span>
      </div>
    </div>
  );
}
