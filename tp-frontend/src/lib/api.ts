// src/lib/api.ts
import { useUser } from "../components/userContext";

export function useApi() {
  const { token } = useUser();

  const apiFetch = async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (token) headers.set("Authorization", `Bearer ${token}`);
    headers.set("Content-Type", "application/json");

    const res = await fetch(`http://localhost:3000${url}`, {
      ...options,
      headers,
    });

    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  };

  return { apiFetch };
}
