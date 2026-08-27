import sharp from "sharp";
import { mkdirSync } from "fs";

mkdirSync("public/icons", { recursive: true });

const jobs = [
  { src: "scripts/icon-source.svg", out: "public/icons/icon-192.png", size: 192 },
  { src: "scripts/icon-source.svg", out: "public/icons/icon-512.png", size: 512 },
  { src: "scripts/icon-source.svg", out: "public/icons/apple-touch-icon.png", size: 180 },
  { src: "scripts/icon-source-maskable.svg", out: "public/icons/icon-maskable-512.png", size: 512 },
  { src: "scripts/icon-source.svg", out: "public/favicon.png", size: 64 },
];

for (const job of jobs) {
  await sharp(job.src).resize(job.size, job.size).png().toFile(job.out);
  console.log("wrote", job.out);
}
