/**
 * lib/restaurant.ts — typed accessor เหนือ "แหล่งข้อมูลเดียว" lib/profile.json
 *
 * ⚠️ ห้ามแก้ค่าที่ไฟล์นี้. แก้ข้อมูลร้าน (เบอร์/เวลา/ราคา/ช่องทาง) ที่
 *    ~/restaurant/profile.json แล้วรัน `node ~/restaurant/sync-store.mjs --deploy`
 *    → ค่าเดียวกันถูกกระจายไปทั้งแอปหลังบ้าน (ไฟล์นี้) และเว็บ landing
 *    (~/zenkai/index.html). ไม่ต้องไล่แก้หลายจุดอีกต่อไป.
 *
 *    หลัง deploy ค่าใหม่ที่แอปใช้ ต้อง rebuild+restart:
 *    cd /opt/zenkai/apps/web && npm run build && systemctl restart zenkai-web
 */
import profile from "./profile.json";

export const RESTAURANT = {
  ...profile,
  phoneTelHref: `tel:${profile.phoneIntl}`,
} as const;

export type Channel = string;

/** ข้อความเวลาเปิด-ปิดแบบอ่านง่าย เช่น "เปิดทุกวัน 11:00–23:30 น." */
export const hoursLabel = `เปิด${profile.hours.days} ${profile.hours.open}–${profile.hours.close} น.`;

/** ช่วงราคาแบบอ่านง่าย เช่น "60–380 บาท" */
export const priceLabel = `${profile.priceMin}–${profile.priceMax} บาท`;
