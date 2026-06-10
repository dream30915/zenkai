export const metadata = {
  title: "งานทั้งหมด — Kaizen",
};

export default function JobsPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">งานทั้งหมด</h1>
        <p className="text-gray-500 mt-1">
          ติดตามสถานะการสร้างวิดีโอและการโพสต์
        </p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <p className="text-gray-400 text-sm">
          ยังไม่มีงาน — เริ่มจากการอัปโหลดเมนูก่อน
        </p>
      </div>
    </div>
  );
}
