import fs from "fs";
import path from "path";

export async function copySeedImages() {
  const seedDir = "./seed-image";
  const destProfiles = "./uploads/profile-pics";
  const destCovers = "./uploads/playlist-covers";

  if (!fs.existsSync(seedDir)) {
    console.warn("⚠️ seed-image directory not found, skipping image copy");
    return;
  }

  fs.mkdirSync(destProfiles, { recursive: true });
  fs.mkdirSync(destCovers, { recursive: true });

  const images = fs
    .readdirSync(seedDir)
    .filter((f) => /\.(png|jpg|jpeg)$/i.test(f));

  if (images.length === 0) {
    console.warn("⚠️ No images found in seed-image/");
    return;
  }

  const pick = (index: number) =>
    path.join(seedDir, images[index % images.length]);

  const profileTargets = [
    { dest: "alice.png", src: pick(0) },
    { dest: "bob.png", src: pick(1) },
    { dest: "charlie.png", src: pick(2) },
  ];

  for (const f of profileTargets) {
    const destPath = path.join(destProfiles, f.dest);
    if (!fs.existsSync(destPath)) {
      fs.copyFileSync(f.src, destPath);
      console.log(`🖼️ Copied ${path.basename(f.src)} → ${f.dest}`);
    }
  }

  const coverTargets = Array.from({ length: 10 }, (_, i) => ({
    dest: `dummy${String(i + 1).padStart(2, "0")}.png`,
    src: pick(i),
  }));

  for (const f of coverTargets) {
    const destPath = path.join(destCovers, f.dest);
    if (!fs.existsSync(destPath)) {
      fs.copyFileSync(f.src, destPath);
      console.log(`🖼️ Copied ${path.basename(f.src)} → ${f.dest}`);
    }
  }
  console.log("Finished copying seed images\n");
}
