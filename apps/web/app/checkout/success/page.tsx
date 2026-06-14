export const dynamic = "force-dynamic";

export default function CheckoutSuccess() {
  return (
    <main className="min-h-screen bg-[#0b0b0f] text-white flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center rounded-2xl border border-white/10 bg-white/[0.03] p-10">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 text-3xl">
          ✓
        </div>
        <h1 className="mt-6 text-2xl font-black">ขอบคุณสำหรับการสมัคร! 🎉</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/60">
          เราได้รับการชำระเงินเรียบร้อยแล้ว ทีมงานจะติดต่อกลับเพื่อเปิดใช้งานบัญชีของคุณ
          และคุณจะได้รับอีเมลยืนยันในไม่ช้า
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <a
            href="https://zenkai.dumpsc.com/"
            className="rounded-xl bg-gradient-to-r from-[#e0533d] to-[#b8341f] py-3 text-sm font-bold"
          >
            ไปที่แดชบอร์ด
          </a>
          <a
            href="https://t.me/Projectd_auto_bot"
            target="_blank"
            rel="noopener"
            className="rounded-xl border border-white/12 bg-white/5 py-3 text-sm font-semibold hover:bg-white/10"
          >
            แชทกับทีมงาน
          </a>
        </div>
      </div>
    </main>
  );
}
