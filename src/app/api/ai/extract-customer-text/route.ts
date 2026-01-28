import { NextRequest, NextResponse } from "next/server";
import { extractCustomerFromText } from "@/lib/claude/extractors";

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

    const customer = await extractCustomerFromText(text);

    // Check if we got any useful data
    if (!customer.customer_name && !customer.customer_address && !customer.customer_tax_id) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลลูกค้าในข้อความ" },
        { status: 400 }
      );
    }

    return NextResponse.json({ customer });
  } catch (error) {
    console.error("Customer text extraction error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" },
      { status: 500 }
    );
  }
}
