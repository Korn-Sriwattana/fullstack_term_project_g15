import { useState, useRef, useEffect } from "react";
import type { User } from "../types/user";
import styles from "../assets/styles/Topbar.module.css";
import { useNavigate } from "react-router-dom";
import { authClient } from "../lib/auth-client";
import { useUser } from "./userContext";

//images
import defaultAvatar from "../assets/images/default-avatar.png";
import logoutIcon from "../assets/images/logout-icon.png";
import toggleIcon from "../assets/images/view-bar.png";

type Props = {
  user?: User | null;
  onToggleSidebar?: () => void;
};

export default function Topbar({ user, onToggleSidebar }: Props) {
  const [open, setOpen] = useState(false);
  const avatarSrc =
    user && user.avatarUrl && user.avatarUrl.trim() !== ""
      ? user.avatarUrl
      : defaultAvatar;

  const API_URL = "http://localhost:3000";
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

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
  const handleLogout = async () => {
    await fetch(`${API_URL}/api/auth/signout`, { credentials: "include" }); // better-auth logout
    localStorage.removeItem("email"); // mock logout
    window.location.href = "/signin";
  };

  return (
    <div className={styles.topbar}>
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

      <div className={styles.profileContainer} ref={dropdownRef}>
        <span className={styles.greeting}>
          Hi,&nbsp;<strong>{user?.name || "Guest"}</strong>
        </span>

        <img
          src={avatarSrc}
          alt={user?.name ? `${user.name}'s avatar` : "Default avatar"}
          className={styles.avatar}
          onClick={() => setOpen((prev) => !prev)}
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
              log out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
