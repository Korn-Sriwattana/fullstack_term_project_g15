import { useEffect, useState, useRef } from "react";

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [profilePic, setProfilePic] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const API_URL = "http://localhost:3000";

  // ✅ โหลดข้อมูลผู้ใช้
  useEffect(() => {
    fetch(`${API_URL}/api/profile/me`, { credentials: "include" })
      .then((res) => res.json())
      .then(async (data) => {
        setUser(data);
        setName(data.name || "");
        setProfilePic(data.profilePic || "");

        // ✅ โหลด playlist ของ user
        const playlistsRes = await fetch(`${API_URL}/playlists/${data.id}`);
        const playlistsData = await playlistsRes.json();
        setPlaylists(playlistsData);
      })
      .catch((err) => console.error("Failed to fetch profile:", err));
  }, []);

  // ✅ อัปโหลดรูปภาพใหม่
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch(`${API_URL}/upload/profile-pic`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      setProfilePic(data.imageUrl);
      alert("Profile picture updated!");
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  // ✅ บันทึกการแก้ไขชื่อ
  const handleSave = async () => {
    await fetch(`${API_URL}/api/profile/me`, {
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
        <div style={{ position: "relative" }}>
          <img
            src={
              preview
                ? preview
                : profilePic
                ? `${API_URL}${profilePic}`
                : "/default-avatar.png"
            }
            alt="Profile"
            style={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              objectFit: "cover",
              border: "none", // ❌ ไม่มีขอบม่วง
            }}
          />

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: "none" }}
          />

          {editing && (
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                transform: "translate(30%, 30%)", // ✅ ดึงให้อยู่พอดีขอบวงกลม
                background: "white",
                color: "#444",
                border: "1px solid #ccc",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => (
                (e.currentTarget.style.background = "#f3e8ff"),
                (e.currentTarget.style.color = "#7e22ce")
              )}
              onMouseLeave={(e) => (
                (e.currentTarget.style.background = "white"),
                (e.currentTarget.style.color = "#444")
              )}
              title="Change profile picture"
            >
              📷
            </button>
          )}
        </div>

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

      {/* สรุปจำนวน Playlist / Friends */}
      <div style={{ marginTop: "1rem", color: "#555" }}>
        <span style={{ marginRight: "1.5rem" }}>
          <strong>{playlists.length}</strong> Playlists
        </span>
        <span>
          <strong>{user.friendCount || 0}</strong> Friends
        </span>
      </div>

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
                  src={
                    pl.coverUrl
                      ? `${API_URL}${pl.coverUrl}`
                      : "/default-cover.png"
                  }
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
