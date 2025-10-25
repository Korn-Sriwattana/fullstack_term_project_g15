// src/context/UserContext.tsx
import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { authClient } from "../lib/auth-client";
import type { User } from "../types/user";

const API_URL = "http://localhost:3000";

type UserContextType = {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  loading: boolean;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        // 1. ตรวจ session จาก Better Auth ก่อน
        const session = await authClient.getSession();

        let email = localStorage.getItem("email") || "";
        if (session?.data?.user?.email) {
          email = session.data.user.email;
        }

        // 2. ถ้าไม่พบ email แสดงว่าไม่ได้ล็อกอิน
        if (!email) {
          setUser(null);
          setLoading(false);
          return;
        }

        // 3. ดึงข้อมูล user จาก backend
        const res = await fetch(
          `${API_URL}/api/current-user?email=${encodeURIComponent(email)}`,
          { credentials: "include" }
        );
        const data = await res.json();

        let rawUser = null;

        if (data.users && Array.isArray(data.users)) {
          rawUser = data.users[0];
        } else if (data.user) {
          rawUser = data.user;
        }

        if (rawUser) {
          // 4. Normalize ฟิลด์ให้เป็นมาตรฐานเดียวกัน
          const normalizedUser = {
            ...rawUser,
            profile_pic: rawUser.profile_pic || null,
          };
          console.log("🔁 Loaded user:", normalizedUser);
          setUser(normalizedUser);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("❌ Failed to load current user:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, loading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside UserProvider");
  return ctx;
};
