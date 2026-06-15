import { NextRequest, NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/storage";

// POST /api/menu-image — อัปโหลดรูปอาหาร 1 รูปขึ้น R2 แล้วคืน URL
// ใช้โดยคลังเมนู (MenuCatalog) เพื่อแนบรูปให้เมนู ไว้ใช้ทำวิดีโอภายหลัง
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image");
    if (!(file instanceof File)) {
      return NextResponse.json({ message: "ต้องแนบไฟล์รูป" }, { status: 400 });
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ message: "รูปต้องไม่เกิน 8MB" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const key = `menus/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const url = await uploadToR2(buffer, key, file.type || "image/jpeg");
    return NextResponse.json({ url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "upload error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
