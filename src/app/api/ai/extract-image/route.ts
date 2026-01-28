import { NextRequest, NextResponse } from "next/server";
import { extractItemsFromImage } from "@/lib/claude/extractors";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "กรุณาอัปโหลดรูปภาพ" },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "รองรับเฉพาะไฟล์ JPEG, PNG, GIF, WEBP" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "ไฟล์ต้องมีขนาดไม่เกิน 10MB" },
        { status: 400 }
      );
    }

    // Convert to base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const items = await extractItemsFromImage(
      base64,
      file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp"
    );

    if (items.length === 0) {
      return NextResponse.json(
        { error: "ไม่พบรายการสินค้าหรือบริการในรูปภาพ" },
        { status: 400 }
      );
    }

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Image extraction error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" },
      { status: 500 }
    );
  }
}
