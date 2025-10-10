// src/components/Sidebar.tsx
import { NavLink } from "react-router-dom";

import styles from "../assets/styles/Sidebar.module.css"; 

import homeIcon from "../assets/images/icon_Sidebar/home-icon.png";
import likedIcon from "../assets/images/icon_Sidebar/favsong-icon.png";
import playlistIcon from "../assets/images/icon_Sidebar/playlist-icon.png";
import roomIcon from "../assets/images/icon_Sidebar/room-icon.png";


export default function Sidebar() {
  
  const link = (to: string, label: string, icon: string, end = false) => (
        <NavLink
        to={to}
        end={end}
        className={({ isActive }) =>
            `${styles.menuItem} ${isActive ? styles.active : ""}`
        }
        >
        <img src={icon} alt={label} className={styles.icon} />
        <span>{label}</span>
        </NavLink>
    );
  
    return (
    <div className={styles.sidebar}>
        
        {/* menu : main */}
        <div className={styles.menu}>
            {link("/", "HOME", homeIcon, true)}
        </div>

        {/* Your music */}
        <div className={styles.section}>
            <div className = {styles.sectionTitle}>Your Music</div>
            {link("/likedsongs", "Liked Songs", likedIcon)}
            {link("/playlist", "Your Playlist", playlistIcon)}
        </div>

        {/* Community*/}
        <div className={styles.section}>
            <div className = {styles.sectionTitle}>Community</div>
            {link("/lokchangrooms", "LuckChangRooms", roomIcon)}
        </div>
    </div>
  );
}
