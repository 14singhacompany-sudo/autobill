import { NextRequest, NextResponse } from "next/server";
import { extractCustomerFromText } from "@/lib/claude/extractors";
import { checkAIExtractionLimit, logAIApiCall } from "@/lib/ai/usage";

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check AI extraction limit
    const limit = await checkAIExtractionLimit();
    if (!limit.canExtract) {
      await logAIApiCall({
        apiType: "extract_customer_text",
        status: "limit_exceeded",
        errorMessage: `Limit exceeded: ${limit.currentCount}/${limit.limitCount}`,
      });

      return NextResponse.json(
        {
          error: "คุณใช้งาน AI Extract ครบตามแพ็คเกจแล้ว กรุณาอัพเกรดเพื่อใช้งานต่อ",
          limitExceeded: true,
          currentCount: limit.currentCount,
          limitCount: limit.limitCount,
        },
        { status: 429 }
      );
    }

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
      await logAIApiCall({
        apiType: "extract_customer_text",
        status: "error",
        errorMessage: "No customer data found in text",
        metadata: {
          textLength: text.length,
          processingTime: Date.now() - startTime,
        },
      });

      return NextResponse.json(
        { error: "ไม่พบข้อมูลลูกค้าในข้อความ" },
        { status: 400 }
      );
    }

    // Log successful extraction
    await logAIApiCall({
      apiType: "extract_customer_text",
      status: "success",
      metadata: {
        textLength: text.length,
        processingTime: Date.now() - startTime,
        hasName: !!customer.customer_name,
        hasAddress: !!customer.customer_address,
        hasTaxId: !!customer.customer_tax_id,
      },
    });

    return NextResponse.json({
      customer,
      usage: {
        current: limit.currentCount + 1,
        limit: limit.limitCount,
        remaining: limit.remaining - 1,
      },
    });
  } catch (error) {
    console.error("Customer text extraction error:", error);

    // Log error
    await logAIApiCall({
      apiType: "extract_customer_text",
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      metadata: {
        processingTime: Date.now() - startTime,
      },
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" },
      { status: 500 }
    );
  }
}
