import { NextRequest, NextResponse } from "next/server";
import { extractItemsFromText } from "@/lib/claude/extractors";
import { checkAIExtractionLimit, logAIApiCall } from "@/lib/ai/usage";

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check AI extraction limit
    const limit = await checkAIExtractionLimit();
    if (!limit.canExtract) {
      await logAIApiCall({
        apiType: "extract_items",
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

    const items = await extractItemsFromText(text);

    if (items.length === 0) {
      await logAIApiCall({
        apiType: "extract_items",
        status: "error",
        errorMessage: "No items found in text",
        metadata: {
          textLength: text.length,
          processingTime: Date.now() - startTime,
        },
      });

      return NextResponse.json(
        { error: "ไม่พบรายการสินค้าหรือบริการในข้อความ" },
        { status: 400 }
      );
    }

    // Log successful extraction
    await logAIApiCall({
      apiType: "extract_items",
      status: "success",
      metadata: {
        textLength: text.length,
        processingTime: Date.now() - startTime,
        itemCount: items.length,
      },
    });

    return NextResponse.json({
      items,
      usage: {
        current: limit.currentCount + 1,
        limit: limit.limitCount,
        remaining: limit.remaining - 1,
      },
    });
  } catch (error) {
    console.error("Text extraction error:", error);

    // Log error
    await logAIApiCall({
      apiType: "extract_items",
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
