// src/hooks/useCurrentUser.ts
import { useState, useEffect } from "react";
import { authClient } from "../lib/auth-client";
import type { User } from "../types/user";

const API_URL = "http://localhost:3000";

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        // ตรวจ Better Auth session ก่อน
        const session = await authClient.getSession();

        let email = localStorage.getItem("email") || "";
        if (session?.data?.user?.email) {
          email = session.data.user.email;
        }

        if (!email) {
          setUser(null);
          setLoading(false);
          return;
        }

        const res = await fetch(
          `${API_URL}/api/current-user?email=${encodeURIComponent(email)}`,
          { credentials: "include" }
        );

        const data = await res.json();
        if (data.user) setUser(data.user);
        else setUser(null);
      } catch (err) {
        console.error("Failed to load current user:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  return { user, setUser, loading };
}
