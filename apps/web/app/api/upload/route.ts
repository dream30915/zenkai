import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateMenuScript } from "@/lib/ai";
import { uploadToR2 } from "@/lib/storage";
import { addVideoJob } from "@/lib/queue";
import { createClient } from "@/lib/supabase/server";

// ----------------------------------------------------------------
// Validation Schema
// ----------------------------------------------------------------
const UploadSchema = z.object({
  menuName: z.string().min(1, "ชื่อเมนูห้ามว่าง"),
  menuNameEn: z.string().optional(),
  price: z.string().optional(),
  description: z.string().optional(),
  videoTier: z.enum(["tier1", "tier2", "tier3"]).default("tier1"),
  postTo: z.string().transform((v) => {
    try {
      return JSON.parse(v) as string[];
    } catch {
      return [v];
    }
  }),
  scheduleType: z.enum(["now", "schedule"]).default("now"),
  scheduleAt: z.string().optional(),
});

// ----------------------------------------------------------------
// POST /api/upload
// ----------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // Parse fields
    const fields = Object.fromEntries(
      Array.from(formData.entries()).filter(([, v]) => typeof v === "string")
    );
    const parsed = UploadSchema.safeParse(fields);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    // Parse images
    const imageFiles = formData.getAll("images") as File[];
    if (imageFiles.length === 0) {
      return NextResponse.json(
        { message: "ต้องมีรูปอย่างน้อย 1 รูป" },
        { status: 400 }
      );
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Step 1: Upload images to R2
    const imageUrls: string[] = [];
    for (const file of imageFiles) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const ext = file.name.split(".").pop() || "jpg";
      const key = `uploads/${jobId}/${Date.now()}.${ext}`;
      const url = await uploadToR2(buffer, key, file.type);
      imageUrls.push(url);
    }

    // Step 2: Generate AI script
    const { menuName, menuNameEn, price, description, videoTier, postTo, scheduleAt } = parsed.data;
    const script = await generateMenuScript({
      menuName,
      menuNameEn,
      price,
      description,
    });

    // Step 3: Save job to Supabase
    const supabase = createClient();
    const { error: dbError } = await supabase.from("jobs").insert({
      id: jobId,
      menu_name: menuName,
      menu_name_en: menuNameEn,
      price: price ? parseInt(price) : null,
      description,
      video_tier: videoTier,
      post_to: postTo,
      image_urls: imageUrls,
      script,
      status: "pending",
      schedule_at: scheduleAt || null,
    });

    if (dbError) {
      console.error("DB insert error:", dbError);
      // Don't fail — job still queued
    }

    // Step 4: Add to BullMQ queue
    await addVideoJob({
      jobId,
      menuName,
      menuNameEn,
      price,
      description,
      videoTier,
      postTo,
      imageUrls,
      script,
      scheduleAt,
    });

    return NextResponse.json({
      success: true,
      jobId,
      script,
      imageUrls,
      message: "Job queued successfully",
    });
  } catch (err: unknown) {
    console.error("[/api/upload] Error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
