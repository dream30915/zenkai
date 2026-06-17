/**
 * Local Video Renderer — FFmpeg ken-burns (ฟรี, ไม่ใช้เครดิต provider ใด ๆ)
 *
 * ใช้เป็น fallback ของ generateVideo เมื่อ Phaya ไม่มีเครดิต / ล้มเหลว
 * หรือเป็น primary เมื่อ VIDEO_PROVIDER=local (เหมาะกับการใช้งานส่วนตัว)
 *
 * รับรูปที่ overlay ตัวอักษรมาแล้ว (processedUrl จาก worker) แล้ว animate
 * เป็นคลิปแนวตั้ง 1080x1920 ด้วยเอฟเฟกต์ ken-burns (ซูมเข้าช้า ๆ) แล้วอัปขึ้น storage
 */

import { spawn } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { uploadToR2 } from "./storage";

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    ff.stderr.on("data", (d) => (stderr += d.toString()));
    ff.on("error", reject);
    ff.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-500)}`))
    );
  });
}

export async function generateLocalVideo(params: {
  imageUrl: string;
  durationSec?: number;
  keyPrefix?: string;
}): Promise<string> {
  const { imageUrl, durationSec = 10, keyPrefix = "videos" } = params;

  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const tmp = os.tmpdir();
  const inPath = path.join(tmp, `zk-${stamp}.jpg`);
  const outPath = path.join(tmp, `zk-${stamp}.mp4`);

  try {
    // 1) ดาวน์โหลดรูป (ที่ overlay แล้ว) ลงไฟล์ชั่วคราว
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`fetch image failed: ${res.status}`);
    await fs.writeFile(inPath, Buffer.from(await res.arrayBuffer()));

    // 2) ken-burns → 1080x1920 mp4
    const frames = Math.round(durationSec * 30);
    const vf =
      "scale=1188:2112:force_original_aspect_ratio=increase,crop=1188:2112," +
      `zoompan=z='min(zoom+0.0009,1.12)':d=${frames}:` +
      "x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30,format=yuv420p";

    await runFfmpeg([
      "-nostdin", "-y", "-loglevel", "error",
      "-loop", "1", "-i", inPath,
      "-t", String(durationSec), "-r", "30",
      "-vf", vf,
      "-c:v", "libx264", "-preset", "veryfast", "-movflags", "+faststart",
      outPath,
    ]);

    // 3) อัปขึ้น storage แล้วคืน URL สาธารณะ
    const buf = await fs.readFile(outPath);
    const key = `${keyPrefix}/${stamp}.mp4`;
    return await uploadToR2(buf, key, "video/mp4");
  } finally {
    await fs.unlink(inPath).catch(() => {});
    await fs.unlink(outPath).catch(() => {});
  }
}
