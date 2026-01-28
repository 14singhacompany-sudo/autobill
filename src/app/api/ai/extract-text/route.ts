import { NextRequest, NextResponse } from "next/server";
import { extractItemsFromText } from "@/lib/claude/extractors";

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "กรุณาระบุข้อความ" },
        { status: 400 }
      );
    }

    if (text.trim().length < 5) {
      return NextResponse.json(
        { error: "ข้อความสั้นเกินไป กรุณาระบุรายละเอียดเพิ่มเติม" },
        { status: 400 }
      );
    }

    const items = await extractItemsFromText(text);

    if (items.length === 0) {
      return NextResponse.json(
        { error: "ไม่พบรายการสินค้าหรือบริการในข้อความ" },
        { status: 400 }
      );
    }

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Text extraction error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" },
      { status: 500 }
    );
  }
}
