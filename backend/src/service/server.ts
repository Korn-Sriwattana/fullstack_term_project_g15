import "dotenv/config";
import express, { type ErrorRequestHandler } from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import Debug from "debug";

import { dbClient } from "../db/client.ts";
import { usersTable } from "../db/schema.ts";
import { eq } from "drizzle-orm";

const debug = Debug("proj-backend");
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(morgan("dev"));
app.use(helmet());
app.use(cors({ origin: "*" }));
app.use(express.json());

/**
 * GET / → แสดง Hello world
 */
app.get("/", (req, res) => {
  res.send("Hello world 🌍");
});

/**
 * GET /users → ดึง users ทั้งหมด
 */
app.get("/users", async (req, res, next) => {
  try {
    const results = await dbClient.select().from(usersTable);
    res.json(results);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /users → เพิ่ม user ใหม่
 * body: { name: string, email: string }
 */
app.post("/users", async (req, res, next) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) throw new Error("Missing name or email");

    const result = await dbClient
      .insert(usersTable)
      .values({ name, email })
      .returning({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
      });

    res.json({ msg: "Insert successfully", data: result[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /users/:id → อัปเดตข้อมูล user
 * body: { name?: string, email?: string }
 */
app.patch("/users/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { name, email } = req.body;
    if (!id) throw new Error("Missing id");

    const result = await dbClient
      .update(usersTable)
      .set({ ...(name && { name }), ...(email && { email }) })
      .where(eq(usersTable.id, id))
      .returning({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
      });

    res.json({ msg: "Update successfully", data: result[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /users/:id → ลบ user ตาม id
 */
app.delete("/users/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) throw new Error("Missing id");

    await dbClient.delete(usersTable).where(eq(usersTable.id, id));
    res.json({ msg: "Delete successfully", data: { id } });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /users/all → ลบ users ทั้งหมด
 */
app.post("/users/all", async (req, res, next) => {
  try {
    await dbClient.delete(usersTable);
    res.json({ msg: "Delete all rows successfully" });
  } catch (err) {
    next(err);
  }
});

// Error middleware
const jsonErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  debug(err.message);
  res.status(500).json({
    message: err.message || "Internal Server Error",
    type: err.name || "Error",
    stack: err.stack,
  });
};
app.use(jsonErrorHandler);

// Run app
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
