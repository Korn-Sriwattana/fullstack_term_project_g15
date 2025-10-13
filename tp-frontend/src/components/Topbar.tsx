import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../assets/styles/Topbar.module.css";
import { useCurrentUser } from "../hook/useCurrentUser";
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

  // ✅ ใช้ hook กลางแทน logic เดิมทั้งหมด
  const { user, setUser, loading } = useCurrentUser();

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

  const handleLogout = async () => {
    try {
      // 1️⃣ ใช้ Better Auth signOut โดยตรง
      await authClient.signOut();

      // 2️⃣ ล้าง cookie manual เผื่อบาง browser cache ค้าง
      document.cookie =
        "better-auth.session=; Max-Age=0; path=/; SameSite=Lax;";

      // 3️⃣ ล้าง localStorage / sessionStorage
      localStorage.removeItem("email");
      localStorage.removeItem("better-auth.session");
      sessionStorage.clear();

      // 4️⃣ แจ้ง logout ให้ทุกแท็บรู้
      localStorage.setItem("logout-event", Date.now().toString());

      // 5️⃣ ล้าง state และ redirect
      setUser(null);
      window.location.replace("/signin");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  if (loading) return null; // หรือ Skeleton loading ก็ได้

  // ✅ สร้าง URL ของ avatar
  const avatarSrc =
    user?.profilePic && user.profilePic.trim() !== ""
      ? user.profilePic.startsWith("http")
        ? user.profilePic
        : `${API_URL}${user.profilePic}`
      : defaultAvatar;

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
