import type { RequestHandler } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

// ⚠️ ต้องติดตั้ง package ก่อน:
// npm install multer
// npm install --save-dev @types/multer

// สร้างโฟลเดอร์สำหรับเก็บรูป
const uploadDir = "./uploads/playlist-covers";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// กำหนดการเก็บไฟล์
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// กรองเฉพาะไฟล์รูปภาพ
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Handler สำหรับอัปโหลดรูป
export const uploadPlaylistCover: RequestHandler = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    // URL ของรูปที่อัปโหลด
    const coverUrl = `/uploads/playlist-covers/${req.file.filename}`;
    
    res.json({ 
      success: true, 
      coverUrl,
      message: "Image uploaded successfully" 
    });
  } catch (err) {
    next(err);
  }
};