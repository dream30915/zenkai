import MenuUploader from "@/components/upload/MenuUploader";
export const metadata = { title: "สร้างวิดีโอ — Zenkai" };
export default function UploadPage() {
  return (
    <div className="min-h-screen bg-washi-50">
      <div className="bg-sumi-900 px-5 pt-8 pb-6">
        <p className="text-sumi-400 text-xs tracking-widest uppercase mb-1">AI Video Creator</p>
        <h1 className="text-white font-black text-2xl">สร้างวิดีโอ</h1>
        <p className="text-sumi-300 text-sm mt-1">อัพรูปอาหาร → AI สร้างคลิปพร้อมโพสต์</p>
      </div>
      <div className="px-4 pt-5 max-w-lg mx-auto">
        <MenuUploader />
      </div>
    </div>
  );
}
