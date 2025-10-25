import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../assets/styles/Topbar.module.css";
import { useUser } from "./userContext";
import { authClient } from "../lib/auth-client";

// Images
import defaultAvatar from "../assets/images/default-avatar.png";
import logoutIcon from "../assets/images/logout-icon.png";
import toggleIcon from "../assets/images/view-bar.png";

const API_URL = "http://localhost:3000";

export default function Topbar({
  onToggleSidebar,
}: {
  onToggleSidebar?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { user, setUser, loading } = useUser();

  // ✅ ฟังก์ชันสร้าง URL รูปภาพ (เหมือนใน FriendsPage)
  const getImageUrl = (url?: string | null) => {
    if (!url || url.trim() === "") return defaultAvatar;
    if (url.startsWith("http")) return url;
    return `${API_URL}${url}`;
  };

  // ✅ ปิด dropdown เมื่อคลิกนอก
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ logout ฟังก์ชัน
  const handleLogout = async () => {
    try {
      await authClient.signOut();
      document.cookie =
        "better-auth.session=; Max-Age=0; path=/; SameSite=Lax;";
      localStorage.removeItem("email");
      localStorage.removeItem("better-auth.session");
      sessionStorage.clear();
      setUser(null);
      window.location.replace("/signin");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // ✅ ถ้ายังโหลด user อยู่
  if (loading) return null;

  // ✅ ใช้ชื่อฟิลด์ profilePic (normalize แล้วใน UserContext)
  const avatarSrc = getImageUrl(user?.profile_pic);

  // console.log("🧩 Avatar URL:", avatarSrc); ไว้debugเรื่องภาพไม่ขึ้น

  return (
    <div className={styles.topbar}>
      {/* ☰ ปุ่มเปิด sidebar */}
      <button
        type="button"
        onClick={onToggleSidebar}
        className={styles.menuBtn}
        aria-label="Toggle sidebar"
      >
        <img
          src={toggleIcon}
          alt="Toggle sidebar"
          className={styles.menuIcon}
        />
      </button>

      {/* 👤 ข้อมูลผู้ใช้ */}
      <div className={styles.profileContainer} ref={dropdownRef}>
        <span className={styles.greeting}>
          Hi,&nbsp;<strong>{user?.name || "Guest"}</strong>
        </span>

        <img
          src={avatarSrc}
          alt={user?.name ? `${user.name}'s avatar` : "Default avatar"}
          className={styles.avatar}
          onClick={() => setOpen((prev) => !prev)}
          onError={(e) => {
            console.warn("❌ Avatar load failed, fallback to default.");
            e.currentTarget.src = defaultAvatar;
          }}
        />

        {open && (
          <div className={styles.dropdown}>
            <button
              onClick={() => navigate("/profile")}
              className={styles.dropdownItem}
            >
              Profile
            </button>
            <button onClick={handleLogout} className={styles.dropdownItem}>
              <img
                src={logoutIcon}
                alt="logout"
                className={styles.logoutIcon}
              />
              Log out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
