/**
 * Social Post Worker — BullMQ
 * รันแยก: npx tsx workers/post.worker.ts
 *
 * รับ video URL → โพสต์ไปทุก platform ที่เลือก
 */

import { Worker, Job } from "bullmq";
import { redisConnection } from "../lib/queue";
import { postToAll } from "../lib/social";
import { createClient } from "../lib/supabase/server";

interface PostJobData {
  jobId: string;
  videoUrl: string;
  imageUrl: string;
  audioUrl?: string;
  caption: string;
  hashtags: string;
  postTo: string[];
  menuName: string;
}

const worker = new Worker<PostJobData>(
  "social-post",
  async (job: Job<PostJobData>) => {
    const { jobId, videoUrl, imageUrl, caption, hashtags, postTo, menuName } = job.data;
    console.log(`[post-worker] Posting job ${jobId} to: ${postTo.join(", ")}`);

    const results = await postToAll({
      videoUrl,
      imageUrl,
      caption: `${caption}\n\n${menuName}`,
      hashtags,
      platforms: postTo,
    });

    // บันทึกผลลัพธ์ลง DB
    const supabase = createClient();
    for (const result of results) {
      await supabase.from("post_results").insert({
        job_id: jobId,
        platform: result.platform,
        status: result.status,
        post_url: result.postUrl || null,
        error_message: result.error || null,
      });
    }

    // อัปเดต job status เป็น posted
    const allSuccess = results.every((r) => r.status === "success");
    await supabase
      .from("jobs")
      .update({ status: allSuccess ? "posted" : "done", posted_at: new Date().toISOString() })
      .eq("id", jobId);

    console.log(`[post-worker] Job ${jobId} posted:`, results);
    return results;
  },
  {
    connection: redisConnection,
    concurrency: 3,
  }
);

worker.on("completed", (job) => console.log(`✅ Post job ${job.id} done`));
worker.on("failed", (job, err) => console.error(`❌ Post job ${job?.id} failed:`, err.message));

console.log("📱 Post worker started — waiting for jobs...");
