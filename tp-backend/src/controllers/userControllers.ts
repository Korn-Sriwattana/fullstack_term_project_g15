import type { RequestHandler } from "express";
import { dbClient } from "@db/client.js";
import { users } from "@db/schema.js";

export const createUser: RequestHandler = async (req, res, next) => {
  try {
    const { name, email } = req.body as {
      name?: string;
      email?: string;
      password?: string;
    };
    if (!name || !email) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const [row] = await dbClient
      .insert(users)
      .values({ name, email })
      .returning({ id: users.id, name: users.name, email: users.email });

    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
};
