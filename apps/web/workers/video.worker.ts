/**
 * Video Generation Worker — BullMQ
 * รันแยกจาก Next.js ด้วย: npx tsx workers/video.worker.ts
 *
 * Pipeline:
 * 1. ดึง job จาก queue
 * 2. Process image (overlay)
 * 3. Generate video (Phaya primary / Creatomate fallback)
 * 4. TTS voiceover + merge ลงคลิป (เฉพาะเมื่อ ENABLE_TTS=true)
 * 5. อัปเดต DB
 * 6. ส่งต่อไป post queue
 * 7. แจ้ง Telegram
 *
 * เปลี่ยนจากเดิม:
 * - ใช้ supabaseAdmin แทน createClient จาก lib/supabase/server
 *   (ตัวเดิมเรียก next/headers cookies() → crash นอก Next.js + ลืม await ด้วย)
 * - parse script ด้วย parseMenuContent (JSON) แทน string parsing
 * - TTS เดิม gen เสียงแล้วไม่เคย merge เข้าวิดีโอ = จ่ายเงินฟรี
 *   ตอนนี้: ปิด default, ถ้าเปิด (ENABLE_TTS=true) จะ merge ผ่าน Phaya จริง
 */

import { Worker, Job } from "bullmq";
import { redisConnection, VideoJobData, getPostQueue } from "../lib/queue";
import { processUploadedImage } from "../lib/image";
import { generateVideo } from "../lib/video";
import { parseMenuContent } from "../lib/ai";
import { phayaTTS, phayaMergeAudioVideo } from "../lib/phaya";
import { uploadToR2 } from "../lib/storage";
import { notifyJobDone, notifyJobError } from "../lib/notify";
import { supabaseAdmin } from "../lib/supabase/admin";

const ENABLE_TTS = process.env.ENABLE_TTS === "true";
const AUTO_QUEUE_POSTS = process.env.AUTO_QUEUE_POSTS === "true";

// ----------------------------------------------------------------
// Worker
// ----------------------------------------------------------------
const worker = new Worker<VideoJobData>(
  "video-generation",
  async (job: Job<VideoJobData>) => {
    const { jobId, menuName, menuNameEn, price, videoTier, postTo, imageUrls, script } = job.data;

    console.log(`[worker] Processing job ${jobId} — ${menuName} (${videoTier})`);

    try {
      // ----------------------------------------
      // Step 0: Parse content (JSON หรือ legacy text)
      // ----------------------------------------
      const content = parseMenuContent(script);

      // ----------------------------------------
      // Step 1: Process image
      // ----------------------------------------
      await job.updateProgress(10);
      const primaryImageUrl = imageUrls[0];

      const imgRes = await fetch(primaryImageUrl);
      const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

      const processedImg = await processUploadedImage(imgBuffer, {
        menuName,
        price,
        removeBg: false,
        addOverlay: true,
      });

      const processedKey = `processed/${jobId}/main.jpg`;
      const processedUrl = await uploadToR2(processedImg, processedKey, "image/jpeg");

      // ----------------------------------------
      // Step 2: Generate video
      // ----------------------------------------
      await job.updateProgress(30);
      const videoResult = await generateVideo({
        imageUrl: processedUrl,
        menuName,
        menuNameEn,
        price,
        hookText: content.hook,
        tier: videoTier,
      });
      let finalVideoUrl = videoResult.url;

      // ----------------------------------------
      // Step 3: TTS Voiceover (opt-in: ENABLE_TTS=true)
      // merge เสียงลงคลิปจริง — ไม่ใช่แค่ gen ทิ้งไว้
      // ----------------------------------------
      await job.updateProgress(60);
      if (ENABLE_TTS && process.env.PHAYA_API_KEY) {
        try {
          const speech = [content.hook, content.caption, content.cta]
            .filter(Boolean)
            .join(" ")
            .substring(0, 500);
          const audioUrl = await phayaTTS(speech );
          finalVideoUrl = await phayaMergeAudioVideo({
            videoUrl: videoResult.url,
            audioUrl,
          });
        } catch (err) {
          console.warn("[worker] TTS/merge failed, using silent video:", err);
        }
      }

      // ----------------------------------------
      // Step 4: อัปเดต DB
      // ----------------------------------------
      await job.updateProgress(80);
      const { error: dbError } = await supabaseAdmin
        .from("jobs")
        .update({
          status: "done",
          video_url: finalVideoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);
      if (dbError) console.error("[worker] DB update failed:", dbError);

      // ----------------------------------------
      // Step 5: Queue post job
      // ----------------------------------------
      if (AUTO_QUEUE_POSTS && postTo.length > 0) {
        await getPostQueue().add("post", {
          jobId,
          videoUrl: finalVideoUrl,
          imageUrl: processedUrl,
          caption: content.caption,
          hashtags: content.hashtags,
          postTo,
          menuName,
        });
      } else {
        console.info(JSON.stringify({
          level: "info",
          step: "post_queue_skipped",
          job_id: jobId,
          reason: AUTO_QUEUE_POSTS ? "no_post_targets" : "AUTO_QUEUE_POSTS_not_enabled",
        }));
      }

      // ----------------------------------------
      // Step 6: Telegram notification
      // ----------------------------------------
      await notifyJobDone({
        jobId,
        menuName,
        videoUrl: finalVideoUrl,
        thumbnailUrl: processedUrl,
        postedTo: AUTO_QUEUE_POSTS ? postTo : [],
      });

      await job.updateProgress(100);
      console.log(`[worker] Job ${jobId} done ✅`);

      return { videoUrl: finalVideoUrl, processedUrl };
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : "Unknown error";
      console.error(`[worker] Job ${jobId} failed:`, error);

      try {
        await supabaseAdmin
          .from("jobs")
          .update({ status: "error", error_message: error })
          .eq("id", jobId);
      } catch {}

      await notifyJobError({ jobId, menuName, error });
      throw err;
    }
  },
  {
    connection: redisConnection,
    concurrency: 2,
    limiter: {
      max: 10,
      duration: 60000,
    },
  }
);

// ----------------------------------------------------------------
// Event handlers
// ----------------------------------------------------------------
worker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message);
});

worker.on("error", (err) => {
  console.error("[worker] Worker error:", err);
});

console.log(`🎬 Video worker started — TTS: ${ENABLE_TTS ? "ON" : "OFF"} — waiting for jobs...`);
