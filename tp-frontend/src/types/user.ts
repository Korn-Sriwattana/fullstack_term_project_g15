// src/types/user.ts
export interface User {
  id: string;
  name?: string;
  email?: string;
  profilePic?: string; // ✅ เพิ่มฟิลด์นี้
  avatarUrl?: string; // ถ้ายังอยากเก็บไว้ใช้ fallback อื่นๆ ได้
  friendCount?: number; // ✅ ใช้ใน Profile.tsx ด้วย
}
