import React from "react";
import styles from "../assets/styles/community/lokchang-music.module.css";

type Props = { title?: string; children: React.ReactNode };

const MusicCard: React.FC<Props> = ({ title = "Music", children }) => {
  return (
    <section className={styles.musicCard}>
      <div className={styles.musicHeader}>
        <h3 className={styles.musicTitle}>{title}</h3>
        <span className={styles.musicUnderline} />
      </div>
      <div className={styles.musicBody}>{children}</div>
    </section>
  );
};

export default MusicCard;
