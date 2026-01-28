import { NextRequest, NextResponse } from "next/server";
import { extractCustomerFromImage } from "@/lib/claude/extractors";

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

    const customer = await extractCustomerFromImage(
      base64,
      file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp"
    );

    // Check if we got any useful data
    if (!customer.customer_name && !customer.customer_address && !customer.customer_tax_id) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลลูกค้าในรูปภาพ" },
        { status: 400 }
      );
    }

    return NextResponse.json({ customer });
  } catch (error) {
    console.error("Customer extraction error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" },
      { status: 500 }
    );
  }
}
