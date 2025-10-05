import styles from "../assets/styles/lokchang-rooms.module.css";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

export default function Playlist() {
  return (
        <div className={styles.layout}>
     <div className={styles.topbar}>
        <Topbar />
      </div>
     <div className={styles.sidebar}>
        <Sidebar />
      </div>

      <main className={styles.content}>
                    <div className={styles["lok-page"]}>

           <h1 className={styles["lok-title"]}>Your Library</h1>
             </div>
        </main>
      </div>

  );
}
