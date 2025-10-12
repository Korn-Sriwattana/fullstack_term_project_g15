import { useState, useRef, useEffect } from "react";
import type { User } from "../types/user";
import defaultAvatar from "../assets/images/default-avatar.png";
import logoutIcon from "../assets/images/logout-icon.png";
import styles from "../assets/styles/Topbar.module.css";
import { useNavigate } from "react-router-dom";
import { authClient } from "../lib/auth-client";
import { useUser } from "./userContext";

type Props = {
  user?: User | null;
};

export default function Topbar({ user }: Props) {
  const [open, setOpen] = useState(false);
  const avatarSrc =
    user && user.avatarUrl && user.avatarUrl.trim() !== ""
      ? user.avatarUrl
      : defaultAvatar;

  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ✅ ปิด dropdown ถ้าคลิกข้างนอก
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
  const { setUser } = useUser();
  // ✅ handle logout
  const handleLogout = async () => {
    await authClient.signOut();
    setUser(null);
    window.location.href = "/";
  };

  return (
    <div className={styles.topbar}>
      <div className={styles.profileContainer} ref={dropdownRef}>
        {/* ✅ เพิ่มคำทักทาย */}
        <span className={styles.greeting}>
          Hi,&nbsp;<strong>{user?.name || "Guest"}</strong>
        </span>

        {/* Avatar */}
        <img
          src={avatarSrc}
          alt={user?.name ? `${user.name}'s avatar` : "Default avatar"}
          className={styles.avatar}
          onClick={() => setOpen((prev) => !prev)}
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
