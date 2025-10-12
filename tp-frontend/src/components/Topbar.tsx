import { useState, useRef, useEffect } from "react";
import defaultAvatar from "../assets/images/default-avatar.png";
import logoutIcon from "../assets/images/logout-icon.png";
import styles from "../assets/styles/Topbar.module.css";
import { useNavigate } from "react-router-dom";
import { authClient } from "../lib/auth-client";
import { useUser } from "../components/userContext";

export default function Topbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useUser();
  const { data: session } = authClient.useSession();

  // ✅ ใช้ชื่อจาก sessionStorage หรือ user
  const [tabUserName, setTabUserName] = useState<string>(() => {
    return sessionStorage.getItem("tabUserName") || user?.name || "Guest";
  });

  // ✅ อัปเดตชื่อเมื่อ user/session เปลี่ยน
  useEffect(() => {
    const activeName = user?.name || session?.user?.name;
    if (activeName) {
      sessionStorage.setItem("tabUserName", activeName);
      setTabUserName(activeName);
    }
  }, [user, session]);

  // ✅ หา avatar จากทุกกรณีที่เป็นไปได้
  const avatarSrc =
    user?.profilePic || // จาก DB โดยตรง
    session?.user?.image || // จาก Google OAuth
    defaultAvatar;

  // ✅ ปิด dropdown เมื่อคลิกข้างนอก
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

  // ✅ handle logout
  const handleLogout = async () => {
    await authClient.signOut();
    logout();
    sessionStorage.removeItem("tabUserName");
    window.location.href = "/";
  };

  return (
    <div className={styles.topbar}>
      <div className={styles.profileContainer} ref={dropdownRef}>
        {/* คำทักทาย */}
        <span className={styles.greeting}>
          Hi,&nbsp;<strong>{tabUserName}</strong>
        </span>

        {/* ✅ Avatar เป็นรูปจริงจาก profile_pic */}
        <img
          src={avatarSrc}
          alt="user avatar"
          className={styles.avatar}
          onClick={() => setOpen((prev) => !prev)}
          onError={(e) => {
            // ถ้าโหลดรูปไม่ได้ → fallback เป็น default
            (e.currentTarget as HTMLImageElement).src = defaultAvatar;
          }}
        />

        {/* Dropdown Menu */}
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
              log out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
