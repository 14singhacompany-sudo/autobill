import { NextRequest, NextResponse } from "next/server";
import { extractItemsFromImage } from "@/lib/claude/extractors";
import { checkAIExtractionLimit, logAIApiCall } from "@/lib/ai/usage";

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check AI extraction limit
    const limit = await checkAIExtractionLimit();
    if (!limit.canExtract) {
      await logAIApiCall({
        apiType: "extract_image",
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
      await logAIApiCall({
        apiType: "extract_image",
        status: "error",
        errorMessage: "No items found in image",
        metadata: {
          fileSize: file.size,
          fileType: file.type,
          processingTime: Date.now() - startTime,
        },
      });

      return NextResponse.json(
        { error: "ไม่พบรายการสินค้าหรือบริการในรูปภาพ" },
        { status: 400 }
      );
    }

    // Log successful extraction
    await logAIApiCall({
      apiType: "extract_image",
      status: "success",
      metadata: {
        fileSize: file.size,
        fileType: file.type,
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
    console.error("Image extraction error:", error);

    // Log error
    await logAIApiCall({
      apiType: "extract_image",
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
