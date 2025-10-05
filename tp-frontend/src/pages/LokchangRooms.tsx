import styles from "../assets/styles/lokchang-rooms.module.css";

//images
import coverImg from "../assets/images/cover_chatroom.jpg";

export default function LokchangRooms() {
  const handleCreate = () => alert("Create");
  const handleJoin = () => alert("Join by ID");

  return (
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
  );
}
