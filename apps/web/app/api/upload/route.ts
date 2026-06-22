import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateMenuContent } from "@/lib/ai";
import { uploadToR2 } from "@/lib/storage";
import { addVideoJob } from "@/lib/queue";
import { createClient } from "@/lib/supabase/server";

const MAX_IMAGE_FILES = 5;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_IMAGE_BYTES = 24 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const ALLOWED_POST_TARGETS = new Set(["line", "facebook", "instagram", "tiktok"]);

function parsePostTargets(value: string): string[] {
  let raw: unknown;
  try {
    raw = JSON.parse(value);
  } catch {
    raw = value;
  }

  const values = Array.isArray(raw) ? raw : [raw];
  return values
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => ALLOWED_POST_TARGETS.has(item));
}

const UploadSchema = z.object({
  menuName: z.string().min(1, "menuName is required"),
  menuNameEn: z.string().optional(),
  price: z.string().optional(),
  description: z.string().optional(),
  videoTier: z.enum(["tier1", "tier2", "tier3"]).default("tier1"),
  postTo: z.string().transform(parsePostTargets),
  scheduleType: z.enum(["now", "schedule"]).default("now"),
  scheduleAt: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const fields = Object.fromEntries(
      Array.from(formData.entries()).filter(([, value]) => typeof value === "string")
    );
    const parsed = UploadSchema.safeParse(fields);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const imageFiles = formData
      .getAll("images")
      .filter((file): file is File => file instanceof File);

    if (imageFiles.length === 0) {
      return NextResponse.json(
        { message: "At least one image is required" },
        { status: 400 }
      );
    }
    if (imageFiles.length > MAX_IMAGE_FILES) {
      return NextResponse.json(
        { message: `Upload up to ${MAX_IMAGE_FILES} images per job` },
        { status: 400 }
      );
    }

    let totalBytes = 0;
    for (const file of imageFiles) {
      totalBytes += file.size;
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        return NextResponse.json(
          { message: "Only JPG, PNG, and WebP images are allowed" },
          { status: 400 }
        );
      }
      if (file.size > MAX_IMAGE_BYTES) {
        return NextResponse.json(
          { message: "Each image must be 8MB or smaller" },
          { status: 400 }
        );
      }
    }
    if (totalBytes > MAX_TOTAL_IMAGE_BYTES) {
      return NextResponse.json(
        { message: "Total upload size must be 24MB or smaller" },
        { status: 400 }
      );
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const imageUrls: string[] = [];

    for (const file of imageFiles) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const ext = IMAGE_EXTENSIONS[file.type] || "bin";
      const key = `uploads/${jobId}/${Date.now()}_${imageUrls.length}.${ext}`;
      const url = await uploadToR2(buffer, key, file.type);
      imageUrls.push(url);
    }

    const { menuName, menuNameEn, price, description, videoTier, postTo, scheduleAt } = parsed.data;
    const content = await generateMenuContent({
      menuName,
      menuNameEn,
      price,
      description,
    });
    const script = JSON.stringify(content);

    const supabase = await createClient();
    const { error: dbError } = await supabase.from("jobs").insert({
      id: jobId,
      menu_name: menuName,
      menu_name_en: menuNameEn,
      price: price ? parseInt(price, 10) : null,
      description,
      video_tier: videoTier,
      post_to: postTo,
      image_urls: imageUrls,
      script,
      status: "pending",
      schedule_at: scheduleAt || null,
    });

    if (dbError) {
      console.error(JSON.stringify({
        level: "error",
        route: "/api/upload",
        step: "db_insert",
        job_id: jobId,
        error: dbError.message,
      }));
      return NextResponse.json(
        { message: `Failed to save job: ${dbError.message}` },
        { status: 500 }
      );
    }

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
      content,
      imageUrls,
      message: "Job queued successfully",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error(JSON.stringify({
      level: "error",
      route: "/api/upload",
      step: "unhandled",
      error: message,
    }));
    return NextResponse.json({ message }, { status: 500 });
  }
}
