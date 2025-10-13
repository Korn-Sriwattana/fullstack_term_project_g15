import { useEffect, useState } from "react";
import { useUser } from "../components/userContext";
import styles from "../assets/styles/FriendsPage.module.css";

const API_URL = "http://localhost:3000";

interface FriendRequest {
  userId: string;
  friendId: string;
  requestedBy: string;
  status: string;
  createdAt: string;
  requester: { id: string; name: string; profilePic?: string };
}

interface Friend {
  id: string;
  name: string;
  profilePic?: string;
}

interface FriendUser {
  id: string;
  name: string;
  email: string;
  profilePic?: string;
  status: "none" | "requested" | "incoming" | "accepted";
}

export default function FriendsPage() {
  const { user } = useUser();
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
  const userId = user?.id || "";

  useEffect(() => {
    if (!userId) return;
    fetchRequests();
    fetchFriends();
  }, [userId]);

  const fetchRequests = async () => {
    const res = await fetch(`${API_URL}/api/friends/requests?userId=${userId}`);
    const data = await res.json();
    setRequests(data.requests || []);
  };

  const fetchFriends = async () => {
    const res = await fetch(`${API_URL}/api/friends/list?userId=${userId}`);
    const data = await res.json();
    setFriends(data.friends || []);
    setLoading(false);
  };

  const acceptRequest = async (friendId: string) => {
    await fetch(`${API_URL}/api/friends/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user?.id,         
        friendId, 
      }),
    });

    fetchRequests();
    fetchFriends();
  };

  const rejectRequest = async (friendId: string) => {
    await fetch(`${API_URL}/api/friends/remove`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, friendId }),
    });
    fetchRequests();
  };

  const removeFriend = async (friendId: string) => {
    await fetch(`${API_URL}/api/friends/remove`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, friendId }),
    });
    fetchFriends();
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    const res = await fetch(
      `${API_URL}/api/friends/search?query=${encodeURIComponent(
        searchTerm
      )}&userId=${userId}`
    );
    const data = await res.json();
    setSearchResults(data.users || []);
  };

  const sendRequest = async (friendId: string) => {
    await fetch(`${API_URL}/api/friends/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, friendId }),
    });
    setSearchResults((prev) =>
      prev.map((u) => (u.id === friendId ? { ...u, status: "requested" } : u))
    );
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}></aside>
      <main className={styles.main}>
        {/* ---------- Search ---------- */}
        <section className={styles.section}>
          <div className={styles.searchBar}>
            <input
              type="text"
              placeholder="Search user"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
            <button onClick={handleSearch} className={styles.searchButton}>
              Search
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className={styles.cardsList}>
              {searchResults.map((u) => (
                <div key={u.id} className={styles.card}>
                  <div className={styles.profile}>
                    <img
                      src={u.profilePic || "/default-avatar.png"}
                      alt={u.name}
                      className={styles.avatar}
                    />
                    <div className={styles.userText}>
                      <span className={styles.userName}>{u.name}</span>
                      <span className={styles.userEmail}>
                        {u.email.split("@")[0]}
                      </span>
                    </div>
                  </div>

                  {u.status === "none" && (
                    <button
                      onClick={() => sendRequest(u.id)}
                      className={styles.actionButton}
                    >
                      Send Request
                    </button>
                  )}
                  {u.status === "requested" && (
                    <span className="text-gray-500 italic">Requested</span>
                  )}
                  {u.status === "incoming" && (
                    <span className="text-blue-500 italic">
                      Incoming Request
                    </span>
                  )}
                  {u.status === "accepted" && (
                    <span className="text-green-600 font-medium">Friend</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ---------- Friend Requests ---------- */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Friend Requests</h2>
          {requests.length === 0 ? (
            <p className={styles.sectionEmpty}>No pending friend requests.</p>
          ) : (
            <div className={styles.cardsList}>
              {requests.map((req) => (
              <div key={req.requester?.id} className={styles.card}>
                <div className={styles.profile}>
                  <img
                    src={req.requester?.profilePic || "/default-avatar.png"}
                    alt={req.requester?.name}
                    className={styles.avatar}
                  />
                  <span className={styles.userName}>
                    {req.requester?.name || "Unknown"}
                  </span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => acceptRequest(req.requester?.id!)}
                    className={styles.actionButton}
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => rejectRequest(req.requester?.id!)}
                    className={styles.smallButton}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}

            </div>
          )}
        </section>

        {/* ---------- My Friends ---------- */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>My Friends</h2>
          {friends.length === 0 ? (
            <p className={styles.sectionEmpty}>You have no friends yet.</p>
          ) : (
            <div className={styles.cardsList}>
              {friends.map((f) => (
                <div key={f.id} className={styles.card}>
                  <div className={styles.profile}>
                    <img
                      src={f.profilePic || "/default-avatar.png"}
                      alt={f.name}
                      className={styles.avatar}
                    />
                    <span className={styles.userName}>{f.name}</span>
                  </div>
                  <button
                    onClick={() => removeFriend(f.id)}
                    className={styles.smallButton}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
