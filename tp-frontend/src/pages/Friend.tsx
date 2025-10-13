import { useEffect, useState } from "react";
import { useUser } from "../components/userContext";

const API_URL = "http://localhost:3000";

interface FriendRequest {
  userId: string;
  friendId: string;
  requestedBy: string;
  status: string;
  createdAt: string;
  requester?: { id: string; name: string; profilePic?: string };
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

  // ✅ โหลดข้อมูลเพื่อนและคำขอ
  useEffect(() => {
    if (!userId) return;
    fetchRequests();
    fetchFriends();
  }, [userId]);

  const fetchRequests = async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/friends/requests?userId=${userId}`
      );
      const data = await res.json();
      setRequests(data.requests || []);
    } catch (err) {
      console.error("Failed to load friend requests:", err);
    }
  };

  const fetchFriends = async () => {
    try {
      const res = await fetch(`${API_URL}/api/friends/list?userId=${userId}`);
      const data = await res.json();
      setFriends(data.friends || []);
    } catch (err) {
      console.error("Failed to load friends:", err);
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async (friendId: string) => {
    await fetch(`${API_URL}/api/friends/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, friendId }),
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
    alert("Friend request sent!");
    setSearchResults((prev) =>
      prev.map((u) => (u.id === friendId ? { ...u, status: "requested" } : u))
    );
  };

  if (loading)
    return <p className="text-center mt-10 text-gray-500">Loading...</p>;

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <aside className="w-56 bg-white border-r"></aside>

      <main className="flex-1 p-8 overflow-y-auto space-y-10">
        {/* ========== Search Bar ========== */}
        <section className="mb-8">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="Search user by email prefix (e.g. soy100)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <button
              onClick={handleSearch}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg"
            >
              Search
            </button>
          </div>

          {/* Search results */}
          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="mt-5 flex flex-col gap-3">
              {searchResults.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all px-5 py-3"
                >
                  {/* Left: avatar + info */}
                  <div className="flex items-center gap-4">
                    <img
                      src={u.profilePic || "/default-avatar.png"}
                      alt={u.name}
                      className="w-12 h-12 rounded-full object-cover border border-gray-300"
                    />
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-800">
                        {u.name}
                      </span>
                      <span className="text-sm text-gray-500">{u.email}</span>
                    </div>
                  </div>

                  {/* Right: status or button */}
                  <div>
                    {u.status === "none" && (
                      <button
                        onClick={() => sendRequest(u.id)}
                        className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
                      >
                        Add Friend
                      </button>
                    )}
                    {u.status === "requested" && (
                      <span className="text-gray-500 text-sm italic">
                        Requested
                      </span>
                    )}
                    {u.status === "incoming" && (
                      <span className="text-blue-500 text-sm italic">
                        Incoming Request
                      </span>
                    )}
                    {u.status === "accepted" && (
                      <span className="text-green-600 text-sm font-medium">
                        Friend
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ========== Friend Requests ========== */}
        <section>
          <h2 className="text-xl font-semibold mb-4 text-purple-700">
            Friend Requests
          </h2>

          {requests.length === 0 ? (
            <p className="text-gray-500">No pending friend requests.</p>
          ) : (
            <div className="flex flex-col space-y-4">
              {requests.map((req) => (
                <div
                  key={req.friendId}
                  className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={req.requester?.profilePic || "/default-avatar.png"}
                      alt={req.requester?.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <span className="font-medium text-gray-700">
                      {req.requester?.name || "Unknown"}
                    </span>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => acceptRequest(req.requester?.id!)}
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => rejectRequest(req.requester?.id!)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ========== My Friends ========== */}
        <section>
          <h2 className="text-xl font-semibold mb-4 text-purple-700">
            My Friends
          </h2>

          {friends.length === 0 ? (
            <p className="text-gray-500">You have no friends yet.</p>
          ) : (
            <div className="flex flex-col space-y-4">
              {friends.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={f.profilePic || "/default-avatar.png"}
                      alt={f.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <span className="font-medium text-gray-700">{f.name}</span>
                  </div>

                  <button
                    onClick={() => removeFriend(f.id)}
                    className="bg-gray-300 hover:bg-gray-400 text-black px-3 py-1 rounded-lg"
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
