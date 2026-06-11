/**
 * Video Generation Worker — BullMQ
 * รันแยกจาก Next.js ด้วย: npx tsx workers/video.worker.ts
 *
 * Pipeline:
 * 1. ดึง job จาก queue
 * 2. Process image (rembg + overlay)
 * 3. Generate video (tier1/2/3)
 * 4. Generate TTS voiceover
 * 5. Upload to R2
 * 6. อัปเดต DB
 * 7. ส่งต่อไป post queue
 * 8. แจ้ง Telegram
 */

import { Worker, Job } from "bullmq";
import { redisConnection, VideoJobData, postQueue } from "../lib/queue";
import { processUploadedImage } from "../lib/image";
import { generateVideo } from "../lib/video";
import { generateVoiceover, extractHookFromScript } from "../lib/tts";
import { uploadToR2 } from "../lib/storage";
import { extractCaptionParts } from "../lib/social";
import { notifyJobDone, notifyJobError } from "../lib/notify";
import { createClient } from "../lib/supabase/server";

// ----------------------------------------------------------------
// Worker
// ----------------------------------------------------------------
const worker = new Worker<VideoJobData>(
  "video-generation",
  async (job: Job<VideoJobData>) => {
    const {
      jobId,
      menuName,
      menuNameEn,
      price,
      description,
      videoTier,
      postTo,
      imageUrls,
      script,
    } = job.data;

    console.log(`[worker] Processing job ${jobId} — ${menuName} (${videoTier})`);

    try {
      // ----------------------------------------
      // Step 1: Process image
      // ----------------------------------------
      await job.updateProgress(10);
      const primaryImageUrl = imageUrls[0];

      // ดาวน์โหลดรูปจาก R2
      const imgRes = await fetch(primaryImageUrl);
      const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

      const processedImg = await processUploadedImage(imgBuffer, {
        menuName,
        price,
        removeBg: false, // เปิดได้ถ้าต้องการ
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
        script,
        tier: videoTier,
      });

      // ----------------------------------------
      // Step 3: TTS Voiceover (optional)
      // ----------------------------------------
      await job.updateProgress(60);
      let audioUrl: string | undefined;
      try {
        const hook = extractHookFromScript(script);
        if (hook) {
          const audioBuffer = await generateVoiceover(hook, "th");
          const audioKey = `audio/${jobId}/voiceover.mp3`;
          audioUrl = await uploadToR2(audioBuffer, audioKey, "audio/mpeg");
        }
      } catch (err) {
        console.warn("[worker] TTS failed, skipping:", err);
      }

      // ----------------------------------------
      // Step 4: อัปเดต DB
      // ----------------------------------------
      await job.updateProgress(80);
      const supabase = createClient();
      await supabase
        .from("jobs")
        .update({
          status: "done",
          video_url: videoResult.url,
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      // ----------------------------------------
      // Step 5: Queue post job
      // ----------------------------------------
      const { caption, hashtags } = extractCaptionParts(script);
      await postQueue.add("post", {
        jobId,
        videoUrl: videoResult.url,
        imageUrl: processedUrl,
        audioUrl,
        caption,
        hashtags,
        postTo,
        menuName,
      });

      // ----------------------------------------
      // Step 6: Telegram notification
      // ----------------------------------------
      await notifyJobDone({
        jobId,
        menuName,
        videoUrl: videoResult.url,
        thumbnailUrl: processedUrl,
        postedTo: postTo,
      });

      await job.updateProgress(100);
      console.log(`[worker] Job ${jobId} done ✅`);

      return { videoUrl: videoResult.url, processedUrl };
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : "Unknown error";
      console.error(`[worker] Job ${jobId} failed:`, error);

      // อัปเดต DB ว่า error
      try {
        const supabase = createClient();
        await supabase
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
    concurrency: 2, // process 2 jobs พร้อมกัน
    limiter: {
      max: 10,
      duration: 60000, // max 10 jobs/min
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

console.log("🎬 Video worker started — waiting for jobs...");
