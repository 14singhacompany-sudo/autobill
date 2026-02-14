import { NextRequest, NextResponse } from "next/server";
import { extractCustomerFromImage } from "@/lib/claude/extractors";
import { checkAIExtractionLimit, logAIApiCall } from "@/lib/ai/usage";

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check AI extraction limit
    const limit = await checkAIExtractionLimit();
    if (!limit.canExtract) {
      await logAIApiCall({
        apiType: "extract_customer",
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

    const customer = await extractCustomerFromImage(
      base64,
      file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp"
    );

    // Check if we got any useful data
    if (!customer.customer_name && !customer.customer_address && !customer.customer_tax_id) {
      await logAIApiCall({
        apiType: "extract_customer",
        status: "error",
        errorMessage: "No customer data found in image",
        metadata: {
          fileSize: file.size,
          fileType: file.type,
          processingTime: Date.now() - startTime,
        },
      });

      return NextResponse.json(
        { error: "ไม่พบข้อมูลลูกค้าในรูปภาพ" },
        { status: 400 }
      );
    }

    // Log successful extraction
    await logAIApiCall({
      apiType: "extract_customer",
      status: "success",
      metadata: {
        fileSize: file.size,
        fileType: file.type,
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
    console.error("Customer extraction error:", error);

    // Log error
    await logAIApiCall({
      apiType: "extract_customer",
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
