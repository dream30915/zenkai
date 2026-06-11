import SettingsForm from "@/components/settings/SettingsForm";

export const metadata = { title: "ตั้งค่า — Kaizen" };

export default function SettingsPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">ตั้งค่าระบบ</h1>
        <p className="text-gray-500 mt-1">จัดการ API Keys และการเชื่อมต่อแพลตฟอร์ม</p>
      </div>
      <SettingsForm />
    </div>
  );
}
