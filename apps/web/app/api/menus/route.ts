import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const MenuSchema = z.object({
  name_th: z.string().min(1),
  name_en: z.string().optional(),
  category: z.string().optional(),
  price: z.coerce.number().optional(),
  description: z.string().optional(),
  is_available: z.boolean().default(true),
  image_urls: z.array(z.string()).optional(),
});

// PostgREST คืน error เมื่อ column ยังไม่มี (เช่นยังไม่ได้รัน migration image_urls).
// ฟังก์ชันนี้ช่วยให้ระบบไม่พัง: ถ้า error พาดพิง image_urls → ลองใหม่โดยตัดทิ้ง.
function missingImageColumn(err: unknown): boolean {
  const msg = (err && typeof err === "object" && "message" in err
    ? String((err as { message: unknown }).message)
    : String(err)
  ).toLowerCase();
  return msg.includes("image_urls");
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("menus")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ menus: data });
  } catch (err: unknown) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = MenuSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.errors[0].message }, { status: 400 });
    }
    const supabase = await createClient();
    let { data, error } = await supabase.from("menus").insert(parsed.data).select().single();
    if (error && missingImageColumn(error)) {
      const { image_urls: _drop, ...rest } = parsed.data;
      ({ data, error } = await supabase.from("menus").insert(rest).select().single());
    }
    if (error) throw error;
    return NextResponse.json({ menu: data });
  } catch (err: unknown) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...fields } = await req.json();
    if (!id) return NextResponse.json({ message: "id required" }, { status: 400 });
    const supabase = await createClient();
    let { data, error } = await supabase.from("menus").update(fields).eq("id", id).select().single();
    if (error && missingImageColumn(error)) {
      const { image_urls: _drop, ...rest } = fields;
      ({ data, error } = await supabase.from("menus").update(rest).eq("id", id).select().single());
    }
    if (error) throw error;
    return NextResponse.json({ menu: data });
  } catch (err: unknown) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ message: "id required" }, { status: 400 });
    const supabase = await createClient();
    const { error } = await supabase.from("menus").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
