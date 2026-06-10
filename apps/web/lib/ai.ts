import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ScriptInput {
  menuName: string;
  menuNameEn?: string;
  price?: string;
  description?: string;
}

// ----------------------------------------------------------------
// generateMenuScript — สร้าง TikTok/Reels script จากข้อมูลเมนู
// ----------------------------------------------------------------
export async function generateMenuScript(input: ScriptInput): Promise<string> {
  const { menuName, menuNameEn, price, description } = input;

  const prompt = `คุณคือ copywriter ร้านอาหารญี่ปุ่น เชี่ยวชาญเขียน caption สำหรับ TikTok / Instagram Reels

ข้อมูลเมนู:
- ชื่อ: ${menuName}${menuNameEn ? ` (${menuNameEn})` : ""}
- ราคา: ${price ? `${price} บาท` : "ไม่ระบุ"}
- รายละเอียด: ${description || "ไม่มี"}

ให้สร้าง script วิดีโอสั้น (15-30 วินาที) ในรูปแบบนี้:

HOOK (3 วิแรก — ต้องดึงดูดมาก):
[เขียนที่นี่]

BODY (ใจความหลัก):
[เขียนที่นี่]

CTA (Call to Action):
[เขียนที่นี่]

CAPTION (สำหรับโพสต์):
[เขียนที่นี่]

HASHTAGS:
[เขียนที่นี่]

ใช้ภาษาไทยที่กระชับ น่าสนใจ เหมาะกับคนไทยอายุ 18-35 ปี`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 500,
    temperature: 0.8,
  });

  return res.choices[0].message.content || "";
}

// ----------------------------------------------------------------
// generateMenuCaption — สร้าง caption สั้นสำหรับ LINE/Facebook
// ----------------------------------------------------------------
export async function generateMenuCaption(input: ScriptInput): Promise<string> {
  const { menuName, menuNameEn, price, description } = input;

  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: `เขียน caption สั้น 2-3 ประโยคสำหรับ Facebook/LINE ร้านอาหารญี่ปุ่น
เมนู: ${menuName}${menuNameEn ? ` (${menuNameEn})` : ""}
ราคา: ${price ? `${price} บาท` : ""}
รายละเอียด: ${description || ""}

ตอบเฉพาะ caption เท่านั้น ไม่ต้องอธิบาย`,
      },
    ],
    max_tokens: 150,
    temperature: 0.7,
  });

  return res.choices[0].message.content || "";
}
