import MenuCatalog from "@/components/menus/MenuCatalog";

export const metadata = { title: "คลังเมนู — Kaizen" };

export default function MenusPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">คลังเมนู</h1>
        <p className="text-gray-500 mt-1">จัดการรายการเมนูและสร้างวิดีโอจากเมนูที่บันทึกไว้</p>
      </div>
      <MenuCatalog />
    </div>
  );
}
