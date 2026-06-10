import MenuUploader from "@/components/upload/MenuUploader";

export const metadata = {
  title: "อัปโหลดเมนู — Kaizen",
};

export default function UploadPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          อัปโหลดเมนูวันนี้
        </h1>
        <p className="text-gray-500 mt-1">
          อัปโหลดรูปอาหารและรายละเอียดเมนู ระบบจะสร้างวิดีโอให้อัตโนมัติ
        </p>
      </div>
      <MenuUploader />
    </div>
  );
}
