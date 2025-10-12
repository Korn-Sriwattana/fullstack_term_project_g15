import type { RequestHandler } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";


// สร้างโฟลเดอร์สำหรับเก็บรูป
const playlistCoversDir = "./uploads/playlist-covers";
const profilePicsDir = "./uploads/profile-pics";

if (!fs.existsSync(playlistCoversDir)) {
  fs.mkdirSync(playlistCoversDir, { recursive: true });
}

if (!fs.existsSync(profilePicsDir)) {
  fs.mkdirSync(profilePicsDir, { recursive: true });
}

// กำหนดการเก็บไฟล์สำหรับ playlist covers
const playlistStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, playlistCoversDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// กำหนดการเก็บไฟล์สำหรับ profile pics
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profilePicsDir);
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

// Multer instance สำหรับ playlist covers
export const upload = multer({
  storage: playlistStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Multer instance สำหรับ profile pics
export const uploadProfile = multer({
  storage: profileStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Handler สำหรับอัปโหลดรูป playlist cover
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

// Handler สำหรับอัปโหลดรูปโปรไฟล์
export const uploadProfilePic: RequestHandler = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    // URL ของรูปที่อัปโหลด
    const imageUrl = `/uploads/profile-pics/${req.file.filename}`;
    
    res.json({ 
      success: true, 
      imageUrl,
      message: "Profile picture uploaded successfully" 
    });
  } catch (err) {
    next(err);
  }
};