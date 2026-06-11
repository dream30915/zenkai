/**
 * Social Media Auto-Post
 * TikTok, Instagram, Facebook, YouTube Shorts, LINE OA
 */

import axios from "axios";

export interface PostResult {
  platform: string;
  status: "success" | "failed";
  postUrl?: string;
  error?: string;
}

// ----------------------------------------------------------------
// postToAll — โพสต์ไปทุก platform ที่เลือก
// ----------------------------------------------------------------
export async function postToAll(params: {
  videoUrl: string;
  imageUrl: string;
  caption: string;
  hashtags: string;
  platforms: string[];
  scheduleAt?: string;
}): Promise<PostResult[]> {
  const { videoUrl, imageUrl, caption, hashtags, platforms } = params;
  const results: PostResult[] = [];

  await Promise.allSettled(
    platforms.map(async (platform) => {
      try {
        let result: PostResult;
        switch (platform) {
          case "facebook":
            result = await postToFacebook({ videoUrl, caption, hashtags });
            break;
          case "line":
            result = await broadcastToLine({ imageUrl, caption });
            break;
          default:
            result = { platform, status: "failed", error: `${platform}: API not implemented yet — use Playwright bot` };
        }
        results.push(result);
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : "Unknown error";
        results.push({ platform, status: "failed", error });
      }
    })
  );

  return results;
}

// ----------------------------------------------------------------
// Facebook / Instagram (Meta Graph API)
// ----------------------------------------------------------------
async function postToFacebook(params: {
  videoUrl: string;
  caption: string;
  hashtags: string;
}): Promise<PostResult> {
  const { videoUrl, caption, hashtags } = params;
  const pageId = process.env.META_PAGE_ID;
  const token = process.env.META_PAGE_ACCESS_TOKEN;

  if (!pageId || !token) {
    return { platform: "facebook", status: "failed", error: "Meta credentials not configured" };
  }

  // Step 1: Upload video
  const uploadRes = await axios.post(
    `https://graph.facebook.com/v21.0/${pageId}/videos`,
    {
      file_url: videoUrl,
      description: `${caption}\n\n${hashtags}`,
      published: true,
    },
    {
      headers: { "Content-Type": "application/json" },
      params: { access_token: token },
      timeout: 120000,
    }
  );

  const videoId = uploadRes.data?.id;
  return {
    platform: "facebook",
    status: "success",
    postUrl: `https://www.facebook.com/video.php?v=${videoId}`,
  };
}

// ----------------------------------------------------------------
// LINE OA Broadcast
// ----------------------------------------------------------------
async function broadcastToLine(params: {
  imageUrl: string;
  caption: string;
}): Promise<PostResult> {
  const { imageUrl, caption } = params;
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!token) {
    return { platform: "line", status: "failed", error: "LINE token not configured" };
  }

  await axios.post(
    "https://api.line.me/v2/bot/message/broadcast",
    {
      messages: [
        {
          type: "image",
          originalContentUrl: imageUrl,
          previewImageUrl: imageUrl,
        },
        {
          type: "text",
          text: caption.substring(0, 2000),
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  return { platform: "line", status: "success" };
}

// ----------------------------------------------------------------
// extractCaptionParts — แยก caption กับ hashtags จาก script
// ----------------------------------------------------------------
export function extractCaptionParts(script: string): {
  caption: string;
  hashtags: string;
} {
  const lines = script.split("\n");

  const captionIdx = lines.findIndex((l) => l.includes("CAPTION"));
  const hashtagIdx = lines.findIndex((l) => l.includes("HASHTAG"));

  let caption = "";
  let hashtags = "";

  if (captionIdx >= 0) {
    const captionLines: string[] = [];
    for (let i = captionIdx + 1; i < lines.length; i++) {
      if (lines[i].includes("HASHTAG") || lines[i].trim().startsWith("#")) break;
      if (lines[i].trim()) captionLines.push(lines[i].trim());
    }
    caption = captionLines.join("\n");
  }

  if (hashtagIdx >= 0) {
    const hashLines: string[] = [];
    for (let i = hashtagIdx + 1; i < lines.length; i++) {
      if (lines[i].trim()) hashLines.push(lines[i].trim());
    }
    hashtags = hashLines.join(" ");
  }

  return {
    caption: caption || script.split("\n")[0] || "",
    hashtags: hashtags || "#อาหารญี่ปุ่น #Japanese #อร่อย #รีล",
  };
}
