import React from "react";
import type { User } from "../types/user";
import defaultAvatar from "../assets/images/default-avatar.png"; 
import styles from "../assets/styles/Topbar.module.css"; 
type Props = {
  user?: User | null;
};

export default function Topbar({ user }: Props) {
  const avatarSrc =
    user && user.avatarUrl && user.avatarUrl.trim() !== ""
      ? user.avatarUrl
      : defaultAvatar;

  return (
    <div className={styles.topbar}>
      
      {/* default_Profile-user */}
      <img
        src={avatarSrc}
        alt={user?.name ? `${user.name}'s avatar` : "Default avatar"}
        className={styles.avatar}
      />

    </div>
  );
}
