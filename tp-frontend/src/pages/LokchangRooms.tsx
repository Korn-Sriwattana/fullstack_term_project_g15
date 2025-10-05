import styles from "../assets/styles/lokchang-rooms.module.css";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

//images
import coverImg from "../assets/images/cover_chatroom.jpg";

export default function LokchangRooms() {

  const handleCreate = () => alert("Create");
  const handleJoin = () => alert("Join by ID");

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
          <h1 className={styles["lok-title"]}>Look Chang Room</h1>

          <div className={styles["lok-btn-wrapper"]}>
            <button className={styles["lok-join-bt"]} onClick={handleJoin}>
              Enter Id Room
            </button>
            <button
              className={styles["lok-create-btn"]}
              onClick={handleCreate}
              aria-label="Create Room"
            >
              + Create
            </button>
          </div>

          <div className={styles["lok-banner"]}>
            <img src={coverImg} alt="cover" />
          </div>

          <div className={styles["lok-contents"]}>
            <p>content</p>
         </div>
        </div>
      </main>
    </div>
  );
}
