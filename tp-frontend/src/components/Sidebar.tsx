import { NavLink } from "react-router-dom";
import styles from "../assets/styles/Sidebar.module.css";

import homeIcon from "../assets/images/icon_Sidebar/home-icon.png";
import likedIcon from "../assets/images/icon_Sidebar/favsong-icon.png";
import playlistIcon from "../assets/images/icon_Sidebar/playlist-icon.png";
import roomIcon from "../assets/images/icon_Sidebar/room-icon.png";
import friendsIcon from "../assets/images/icon_Sidebar/friends-icon.png"; // 🔸 เพิ่มไอคอนใหม่ (สร้างไฟล์ได้เอง หรือใช้ emoji)

type Props = {
  collapsed?: boolean;
  mode?: "inline" | "overlay";
  open?: boolean;
  onClose?: () => void;
};

export default function Sidebar({
  collapsed,
  mode = "inline",
  open = false,
  onClose,
}: Props) {
  const link = (to: string, label: string, icon: string, end = false) => (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `${styles.menuItem} ${isActive ? styles.active : ""}`
      }
      onClick={onClose}
    >
      <img src={icon} alt={label} className={styles.icon} />
      <span>{label}</span>
    </NavLink>
  );

  return (
    <>
      {mode === "overlay" && open && (
        <div className={styles.backdrop} onClick={onClose} />
      )}

      <div
        className={[
          styles.sidebar,
          collapsed ? styles.collapsed : "",
          mode === "overlay" ? styles.overlay : "",
          mode === "overlay" && open ? styles.overlayOpen : "",
        ].join(" ")}
      >
        <div className={styles.menu}>{link("/", "HOME", homeIcon, true)}</div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Your Music</div>
          {link("/likedsongs", "Liked Songs", likedIcon)}
          {link("/playlist", "Your Playlist", playlistIcon)}
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Community</div>
          {link("/lokchangrooms", "LookChang Rooms", roomIcon)}
          {link("/friends", "Friends", friendsIcon)}
        </div>
      </div>
    </>
  );
}
