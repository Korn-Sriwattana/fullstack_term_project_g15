import { auth } from "../lib/auth.ts";
import { fromNodeHeaders } from "better-auth/node";
import type { Request, Response, NextFunction } from "express";

export async function verifyToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // ✅ กำหนด return type เป็น Promise<void>
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing Bearer token" });
    return; // ✅ ไม่ return response object
  }

  const token = authHeader.split(" ")[1];

  try {
    const session = await auth.api.getSession({
      headers: new Headers({ Authorization: `Bearer ${token}` }),
    });

    if (!session?.user) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    // ✅ แนบ user ลง req เพื่อให้ controller ใช้ต่อได้
    (req as any).user = session.user;
    next(); // ✅ ไม่ return next()
  } catch (err) {
    res.status(401).json({ error: "Token verification failed" });
    return; // ✅ ปิดให้ครบ
  }
}
