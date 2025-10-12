// src/components/userContext.tsx
import { createContext, useContext, useState, useEffect } from "react";
import { authClient } from "../lib/auth-client"; // ✅ เพิ่มตรงนี้

type User = {
  id: string;
  name: string;
  email: string;
  profilePic?: string;
} | null;

type UserContextType = {
  user: User;
  token: string | null;
  setUser: (user: User) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User>(null);
  const [token, setToken] = useState<string | null>(null);

  // ✅ โหลดข้อมูลจาก Better Auth session
  useEffect(() => {
    const loadSession = async () => {
      try {
        const res = await authClient.getSession();
        const session = res.data; // ✅ ต้องใช้ .data เพื่อเข้าถึงค่า

        if (session?.user) {
          const u = {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            profilePic: session.user.image || undefined,
          };
          setUser(u);
          setToken(session.session?.token ?? null);

          localStorage.setItem("user", JSON.stringify(u));
          if (session.session?.token)
            localStorage.setItem("token", session.session.token);
        } else {
          setUser(null);
          setToken(null);
          localStorage.removeItem("user");
          localStorage.removeItem("token");
        }
      } catch (err) {
        console.error("❌ Failed to load session:", err);
      }
    };

    loadSession();
  }, []);

  const logout = async () => {
    try {
      await authClient.signOut();
    } catch (err) {
      console.warn("Failed to sign out:", err);
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  return (
    <UserContext.Provider value={{ user, token, setUser, setToken, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside UserProvider");
  return ctx;
};
