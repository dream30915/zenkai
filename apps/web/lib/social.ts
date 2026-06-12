/**
 * Social Media Posting
 * Platform support:
 * - Telegram: ✅ แจ้งเตือนเจ้าของร้าน
 * - LINE OA:   ✅ (ต้องใส่ LINE_CHANNEL_ACCESS_TOKEN)
 * - Facebook:  ✅ (ต้องใส่ META_PAGE_ACCESS_TOKEN + META_PAGE_ID)
 * - Instagram: ✅ (ใช้ token เดียวกับ Facebook + INSTAGRAM_ACCOUNT_ID)
 * - TikTok:    🔜 (ต้องสมัคร TikTok for Business API - ใช้เวลา ~1 สัปดาห์)
 */

import axios from "axios";

export interface PostResult {
  platform: string;
  status: "success" | "failed" | "skipped";
  postId?: string;
  url?: string;
  error?: string;
}

// ─────────────────────────────────────────────────────────────
// LINE OA
// ─────────────────────────────────────────────────────────────
async function postToLine(params: {
  videoUrl: string;
  caption: string;
  hashtags: string;
}): Promise<PostResult> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return { platform: "line", status: "skipped", error: "ไม่มี LINE_CHANNEL_ACCESS_TOKEN" };

  try {
    const res = await axios.post(
      "https://api.line.me/v2/bot/message/broadcast",
      {
        messages: [
          {
            type: "text",
            text: `${params.caption}\n\n${params.hashtags}`,
          },
          {
            type: "video",
            originalContentUrl: params.videoUrl,
            previewImageUrl: params.videoUrl.replace(".mp4", "_thumb.jpg"),
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    return { platform: "line", status: "success", postId: res.data?.sentMessages?.[0]?.id };
  } catch (err: any) {
    return { platform: "line", status: "failed", error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────
// Facebook Page
// ─────────────────────────────────────────────────────────────
async function postToFacebook(params: {
  videoUrl: string;
  caption: string;
  hashtags: string;
}): Promise<PostResult> {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  const pageId = process.env.META_PAGE_ID;
  if (!token || !pageId) return { platform: "facebook", status: "skipped", error: "ไม่มี META_PAGE_ACCESS_TOKEN หรือ META_PAGE_ID" };

  try {
    // Step 1: Upload video
    const uploadRes = await axios.post(
      `https://graph-video.facebook.com/v19.0/${pageId}/videos`,
      {
        file_url: params.videoUrl,
        description: `${params.caption}\n\n${params.hashtags}`,
        published: true,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return {
      platform: "facebook",
      status: "success",
      postId: uploadRes.data.id,
      url: `https://facebook.com/${pageId}/videos/${uploadRes.data.id}`,
    };
  } catch (err: any) {
    return { platform: "facebook", status: "failed", error: err.response?.data?.error?.message || err.message };
  }
}

// ─────────────────────────────────────────────────────────────
// Instagram Reels (ผ่าน Facebook Graph API)
// ─────────────────────────────────────────────────────────────
async function postToInstagram(params: {
  videoUrl: string;
  caption: string;
  hashtags: string;
}): Promise<PostResult> {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  const igId = process.env.INSTAGRAM_ACCOUNT_ID;
  if (!token || !igId) return { platform: "instagram", status: "skipped", error: "ไม่มี INSTAGRAM_ACCOUNT_ID" };

  try {
    // Step 1: สร้าง media container
    const containerRes = await axios.post(
      `https://graph.facebook.com/v19.0/${igId}/media`,
      {
        media_type: "REELS",
        video_url: params.videoUrl,
        caption: `${params.caption}\n\n${params.hashtags}`,
      },
      { params: { access_token: token } }
    );

    const containerId = containerRes.data.id;

    // Step 2: รอ processing
    await new Promise(r => setTimeout(r, 10000));

    // Step 3: Publish
    const publishRes = await axios.post(
      `https://graph.facebook.com/v19.0/${igId}/media_publish`,
      { creation_id: containerId },
      { params: { access_token: token } }
    );
    return {
      platform: "instagram",
      status: "success",
      postId: publishRes.data.id,
    };
  } catch (err: any) {
    return { platform: "instagram", status: "failed", error: err.response?.data?.error?.message || err.message };
  }
}

// ─────────────────────────────────────────────────────────────
// TikTok — รอ API approval
// ─────────────────────────────────────────────────────────────
async function postToTiktok(): Promise<PostResult> {
  const token = process.env.TIKTOK_ACCESS_TOKEN;
  if (!token) return {
    platform: "tiktok",
    status: "skipped",
    error: "รอสมัคร TikTok for Business API (https://developers.tiktok.com) แล้วใส่ TIKTOK_ACCESS_TOKEN",
  };
  // implement after API approval
  return { platform: "tiktok", status: "skipped", error: "ยังไม่ได้ implement" };
}

// ─────────────────────────────────────────────────────────────
// postToAll — entry point
// ─────────────────────────────────────────────────────────────
export async function postToAll(params: {
  videoUrl: string;
  imageUrl: string;
  caption: string;
  hashtags: string;
  menuName: string;
  platforms: string[];
}): Promise<PostResult[]> {
  const { videoUrl, caption, hashtags, platforms } = params;
  const results: PostResult[] = [];

  const handlers: Record<string, () => Promise<PostResult>> = {
    line:      () => postToLine({ videoUrl, caption, hashtags }),
    facebook:  () => postToFacebook({ videoUrl, caption, hashtags }),
    instagram: () => postToInstagram({ videoUrl, caption, hashtags }),
    tiktok:    () => postToTiktok(),
  };

  for (const platform of platforms) {
    const handler = handlers[platform.toLowerCase()];
    if (handler) {
      const result = await handler();
      results.push(result);
      console.log(`[social] ${platform}: ${result.status}${result.error ? ` — ${result.error}` : ""}`);
    } else {
      results.push({ platform, status: "skipped", error: `platform ไม่รองรับ: ${platform}` });
    }
  }

  return results;
}
