import { useEffect, useState, useRef } from "react";

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [profilePic, setProfilePic] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [imageError, setImageError] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const API_URL = "http://localhost:3000";

  // ✅ สร้าง SVG Avatar
  const createSvgAvatar = (name: string) => {
    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
    
    const svg = `
      <svg width="120" height="120" xmlns="http://www.w3.org/2000/svg">
        <rect width="120" height="120" fill="#a855f7"/>
        <text x="50%" y="50%" font-family="Arial" font-size="48" font-weight="bold" 
              fill="white" text-anchor="middle" dominant-baseline="central">
          ${initials}
        </text>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  // ✅ Helper function เพื่อจัดการ URL ของรูป
  const getImageUrl = (picUrl: string | null) => {
    if (!picUrl) {
      return createSvgAvatar(name || "User");
    }
    
    // ถ้า URL เป็น external (เช่น จาก Google)
    if (picUrl.startsWith("http://") || picUrl.startsWith("https://")) {
      if (picUrl.includes("googleusercontent.com")) {
        // ✅ ใช้ backend proxy เพื่อแก้ปัญหา CORS
        const proxyUrl = `${API_URL}/api/proxy-image?url=${encodeURIComponent(picUrl)}`;
        console.log("🖼️ Using proxy for Google image");
        return proxyUrl;
      }
      console.log("🖼️ External image URL:", picUrl);
      return picUrl;
    }
    
    // ถ้าเป็น path ภายใน server ต่อ API_URL
    const fullUrl = `${API_URL}${picUrl}`;
    console.log("🖼️ Local image URL:", fullUrl);
    return fullUrl;
  };

  useEffect(() => {
    fetch(`${API_URL}/api/profile/me`, { credentials: "include" })
      .then((res) => res.json())
      .then(async (data) => {
        console.log("👤 User data:", data); // ✅ Debug: ดูข้อมูล user
        console.log("🖼️ Profile pic URL:", data.profilePic); // ✅ Debug: ดู URL รูป
        
        setUser(data);
        setName(data.name || "");
        setProfilePic(data.profilePic || "");

        const playlistsRes = await fetch(`${API_URL}/playlists/${data.id}`);
        const playlistsData = await playlistsRes.json();
        setPlaylists(playlistsData);
      })
      .catch((err) => console.error("Failed to fetch profile:", err));
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File size too large. Maximum 5MB allowed.");
      return;
    }

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
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await res.json();
      setProfilePic(data.imageUrl);
      setPreview(null);
      setImageError(false); // ✅ Reset error state
      
      await fetch(`${API_URL}/api/profile/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, profilePic: data.imageUrl }),
      });
      
      setUser((prev: any) => ({ ...prev, profilePic: data.imageUrl }));
      alert("Profile picture updated!");
    } catch (err) {
      console.error("Upload error:", err);
      alert(`Failed to upload image: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    await fetch(`${API_URL}/api/profile/me`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, profilePic }),
    });
    
    // ✅ อัปเดต user state
    setUser((prev: any) => ({ ...prev, name, profilePic }));
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
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
        <div style={{ position: "relative" }}>
          {/* ✅ ลบ crossOrigin และแก้ onError */}
          <img
            src={preview || (imageError ? createSvgAvatar(name) : getImageUrl(profilePic))}
            alt="Profile"
            onError={(e) => {
              console.error("❌ Failed to load image:", e.currentTarget.src);
              setImageError(true);
            }}
            style={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              objectFit: "cover",
              border: "none",
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
              disabled={uploading} // ✅ ปิดปุ่มขณะกำลังอัปโหลด
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                transform: "translate(30%, 30%)",
                background: uploading ? "#ddd" : "white",
                color: uploading ? "#999" : "#444",
                border: "1px solid #ccc",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                cursor: uploading ? "not-allowed" : "pointer",
                boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                if (!uploading) {
                  e.currentTarget.style.background = "#f3e8ff";
                  e.currentTarget.style.color = "#7e22ce";
                }
              }}
              onMouseLeave={(e) => {
                if (!uploading) {
                  e.currentTarget.style.background = "white";
                  e.currentTarget.style.color = "#444";
                }
              }}
              title={uploading ? "Uploading..." : "Change profile picture"}
            >
              {uploading ? "⏳" : "📷"}
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

      <div style={{ marginTop: "1rem", color: "#555" }}>
        <span style={{ marginRight: "1.5rem" }}>
          <strong>{playlists.length}</strong> Playlists
        </span>
        <span>
          <strong>{user.friendCount || 0}</strong> Friends
        </span>
      </div>

      <hr style={{ margin: "1.5rem 0", border: "1px solid #eee" }} />

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
                  src={getImageUrl(pl.coverUrl)}
                  alt={pl.name}
                  onError={(e) => {
                    // ✅ ใช้ SVG แทน
                    const initials = pl.name.slice(0, 2).toUpperCase();
                    const svg = `<svg width="160" height="160" xmlns="http://www.w3.org/2000/svg">
                      <rect width="160" height="160" fill="#${Math.floor(Math.random()*16777215).toString(16)}"/>
                      <text x="50%" y="50%" font-family="Arial" font-size="48" font-weight="bold" 
                            fill="white" text-anchor="middle" dominant-baseline="central">${initials}</text>
                    </svg>`;
                    e.currentTarget.src = `data:image/svg+xml;base64,${btoa(svg)}`;
                  }}
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