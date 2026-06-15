"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus, Edit2, Trash2, Play, Loader2, AlertCircle,
  ChefHat, Search, Filter, ImagePlus, X,
} from "lucide-react";
import { clsx } from "clsx";
import { toast } from "sonner";

interface Menu {
  id: string;
  name_th: string;
  name_en?: string;
  category?: string;
  price?: number;
  description?: string;
  is_available: boolean;
  image_urls?: string[];
  created_at: string;
}

const CATEGORIES = ["", "ราเมน", "ซูชิ", "ซาชิมิ", "เทปันยากิ", "ของหวาน", "เครื่องดื่ม", "ชุดอาหาร", "อื่นๆ"];

function MenuModal({
  menu,
  onClose,
  onSave,
}: {
  menu?: Menu | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    name_th: menu?.name_th || "",
    name_en: menu?.name_en || "",
    category: menu?.category || "",
    price: menu?.price?.toString() || "",
    description: menu?.description || "",
    is_available: menu?.is_available ?? true,
    image_urls: menu?.image_urls || ([] as string[]),
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { toast.error("รูปต้องไม่เกิน 8MB"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/menu-image", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.message || "upload failed");
      setForm((f) => ({ ...f, image_urls: [...f.image_urls, data.url] }));
    } catch {
      toast.error("อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (url: string) =>
    setForm((f) => ({ ...f, image_urls: f.image_urls.filter((u) => u !== url) }));

  const handleSave = async () => {
    if (!form.name_th.trim()) { toast.error("ต้องมีชื่อเมนู"); return; }
    setSaving(true);
    try {
      const body = {
        ...(menu ? { id: menu.id } : {}),
        name_th: form.name_th,
        name_en: form.name_en || undefined,
        category: form.category || undefined,
        price: form.price ? parseFloat(form.price) : undefined,
        description: form.description || undefined,
        is_available: form.is_available,
        image_urls: form.image_urls,
      };
      await fetch("/api/menus", {
        method: menu ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      toast.success(menu ? "อัปเดตเมนูแล้ว" : "เพิ่มเมนูใหม่แล้ว");
      onSave();
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900 mb-5">
          {menu ? "แก้ไขเมนู" : "เพิ่มเมนูใหม่"}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อเมนู (ภาษาไทย) *</label>
            <input
              value={form.name_th}
              onChange={(e) => setForm((f) => ({ ...f, name_th: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sakura-300"
              placeholder="เช่น ราเมนซุปมิโซะ"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อภาษาอังกฤษ</label>
            <input
              value={form.name_en}
              onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sakura-300"
              placeholder="e.g. Miso Ramen"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">รูปอาหาร (ใช้ทำวิดีโอ)</label>
            <div className="flex flex-wrap gap-2">
              {form.image_urls.map((url) => (
                <div key={url} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="menu" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(url)}
                    className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-sakura-300 hover:bg-sakura-50 transition-colors">
                {uploading
                  ? <Loader2 className="w-5 h-5 text-sakura-400 animate-spin" />
                  : <ImagePlus className="w-5 h-5 text-gray-400" />}
                <input type="file" accept="image/*" onChange={handleImage} disabled={uploading} className="hidden" />
              </label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">หมวดหมู่</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sakura-300 bg-white"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c || "เลือกหมวด"}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ราคา (บาท)</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sakura-300"
                placeholder="280"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">คำอธิบาย (ให้ AI ใช้เขียน script)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sakura-300 resize-none"
              placeholder="รายละเอียดที่น่าสนใจของเมนูนี้..."
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_available}
              onChange={(e) => setForm((f) => ({ ...f, is_available: e.target.checked }))}
              className="accent-sakura-500 w-4 h-4"
            />
            <span className="text-sm text-gray-700">เมนูนี้พร้อมขาย</span>
          </label>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 bg-sakura-500 hover:bg-sakura-600 text-white rounded-xl text-sm font-medium disabled:bg-gray-300 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MenuCatalog() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [modalMenu, setModalMenu] = useState<Menu | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchMenus = useCallback(async () => {
    try {
      const res = await fetch("/api/menus");
      const data = await res.json();
      setMenus(data.menus || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMenus(); }, [fetchMenus]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`ลบ "${name}" ออกจากคลังเมนู?`)) return;
    setDeleting(id);
    await fetch("/api/menus", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    toast.success("ลบเมนูแล้ว");
    fetchMenus();
    setDeleting(null);
  };

  const filtered = menus.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch = !q || m.name_th.toLowerCase().includes(q) || (m.name_en || "").toLowerCase().includes(q);
    const matchCat = !filterCat || m.category === filterCat;
    return matchSearch && matchCat;
  });

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-8 h-8 text-sakura-400 animate-spin" />
    </div>
  );

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex-1 min-w-52 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาเมนู..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sakura-300"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white"
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c || "ทุกหมวด"}</option>)}
          </select>
        </div>
        <button
          onClick={() => setModalMenu(null)}
          className="flex items-center gap-2 px-4 py-2.5 bg-sakura-500 hover:bg-sakura-600 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          เพิ่มเมนู
        </button>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <ChefHat className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">
            {menus.length === 0 ? "ยังไม่มีเมนู — กดปุ่ม \"เพิ่มเมนู\" เพื่อเริ่ม" : "ไม่พบเมนูที่ค้นหา"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((menu) => (
            <div key={menu.id} className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-sakura-200 hover:shadow-sm transition-all">
              {menu.image_urls && menu.image_urls.length > 0 && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={menu.image_urls[0]} alt={menu.name_th} className="w-full h-32 object-cover rounded-xl mb-3" />
              )}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{menu.name_th}</h3>
                  {menu.name_en && <p className="text-xs text-gray-400 truncate">{menu.name_en}</p>}
                </div>
                <span className={clsx(
                  "flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium",
                  menu.is_available ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"
                )}>
                  {menu.is_available ? "พร้อมขาย" : "ปิด"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                {menu.category && <span className="px-2 py-0.5 bg-gray-100 rounded-full">{menu.category}</span>}
                {menu.price && <span className="font-medium text-gray-700">฿{menu.price.toLocaleString()}</span>}
              </div>
              {menu.description && (
                <p className="text-xs text-gray-500 mb-4 line-clamp-2">{menu.description}</p>
              )}
              <div className="flex gap-2">
                <Link
                  href={`/upload?menu=${menu.id}&name=${encodeURIComponent(menu.name_th)}&nameEn=${encodeURIComponent(menu.name_en || "")}&price=${menu.price || ""}&desc=${encodeURIComponent(menu.description || "")}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-sakura-50 text-sakura-600 hover:bg-sakura-100 rounded-xl text-xs font-medium transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                  สร้างวิดีโอ
                </Link>
                <button
                  onClick={() => setModalMenu(menu)}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(menu.id, menu.name_th)}
                  disabled={deleting === menu.id}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                >
                  {deleting === menu.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalMenu !== undefined && (
        <MenuModal
          menu={modalMenu}
          onClose={() => setModalMenu(undefined)}
          onSave={() => { setModalMenu(undefined); fetchMenus(); }}
        />
      )}
    </div>
  );
}
