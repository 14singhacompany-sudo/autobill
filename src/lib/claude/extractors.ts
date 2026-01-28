import { createChatCompletion } from "./client";
import {
  EXTRACTION_SYSTEM_PROMPT,
  TEXT_EXTRACTION_PROMPT,
  IMAGE_EXTRACTION_PROMPT,
  CUSTOMER_EXTRACTION_SYSTEM_PROMPT,
  CUSTOMER_IMAGE_EXTRACTION_PROMPT,
  CUSTOMER_TEXT_EXTRACTION_PROMPT,
} from "./prompts";
import type { ExtractedItem } from "@/types/database";

export interface ExtractedCustomer {
  customer_name: string;
  customer_address: string;
  customer_tax_id: string;
  customer_branch_code?: string;
  customer_contact: string;
  customer_phone: string;
  customer_email: string;
}

// OpenRouter model - using Claude 3.5 Sonnet (vision capable)
const MODEL = "anthropic/claude-3.5-sonnet";

export async function extractItemsFromText(
  text: string
): Promise<ExtractedItem[]> {
  const message = await createChatCompletion({
    model: MODEL,
    max_tokens: 4096,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: TEXT_EXTRACTION_PROMPT.replace("{text}", text),
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type");
  }

  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content.text.trim();

    // Remove markdown code blocks if present
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    // Try to find JSON array in the response
    const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      jsonStr = arrayMatch[0];
    }

    const items = JSON.parse(jsonStr);
    return validateExtractedItems(items);
  } catch (error) {
    console.error("Failed to parse extraction result:", error);
    console.error("Raw response:", content.text);
    throw new Error("ไม่สามารถแยกข้อมูลได้ กรุณาลองใหม่");
  }
}

export async function extractItemsFromImage(
  imageBase64: string,
  mimeType: "image/jpeg" | "image/png" | "image/gif" | "image/webp"
): Promise<ExtractedItem[]> {
  // OpenRouter uses image_url format with data URI
  const message = await createChatCompletion({
    model: MODEL,
    max_tokens: 4096,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${imageBase64}`,
            },
          },
          {
            type: "text",
            text: IMAGE_EXTRACTION_PROMPT,
          },
        ],
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type");
  }

  try {
    let jsonStr = content.text.trim();

    // Remove markdown code blocks if present
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    // Try to find JSON array in the response
    const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      jsonStr = arrayMatch[0];
    }

    const items = JSON.parse(jsonStr);
    return validateExtractedItems(items);
  } catch (error) {
    console.error("Failed to parse extraction result:", error);
    console.error("Raw response:", content.text);
    throw new Error("ไม่สามารถแยกข้อมูลจากรูปภาพได้ กรุณาลองใหม่");
  }
}

function validateExtractedItems(items: unknown[]): ExtractedItem[] {
  if (!Array.isArray(items)) {
    throw new Error("Invalid response format: expected array");
  }

  return items
    .map((item, index) => {
      if (typeof item !== "object" || item === null) {
        console.warn(`Invalid item at index ${index}, skipping`);
        return null;
      }

      const obj = item as Record<string, unknown>;

      // Validate and clean description
      const description = String(obj.description || "").trim();
      if (!description) {
        console.warn(`Empty description at index ${index}, skipping`);
        return null;
      }

      // Parse quantity
      let quantity = 1;
      if (obj.quantity !== undefined) {
        const parsedQty = parseFloat(String(obj.quantity).replace(/,/g, ""));
        if (!isNaN(parsedQty) && parsedQty > 0) {
          quantity = parsedQty;
        }
      }

      // Parse unit
      const unit = String(obj.unit || "ชิ้น").trim();

      // Parse unit_price
      let unitPrice = 0;
      if (obj.unit_price !== undefined) {
        // Remove currency symbols and commas
        const priceStr = String(obj.unit_price)
          .replace(/[฿$,]/g, "")
          .replace(/บาท/g, "")
          .replace(/THB/gi, "")
          .trim();
        const parsedPrice = parseFloat(priceStr);
        if (!isNaN(parsedPrice) && parsedPrice >= 0) {
          unitPrice = parsedPrice;
        }
      }

      return {
        description,
        quantity,
        unit,
        unit_price: unitPrice,
      };
    })
    .filter((item): item is ExtractedItem => item !== null);
}

// Customer extraction from image
export async function extractCustomerFromImage(
  imageBase64: string,
  mimeType: "image/jpeg" | "image/png" | "image/gif" | "image/webp"
): Promise<ExtractedCustomer> {
  const message = await createChatCompletion({
    model: MODEL,
    max_tokens: 4096,
    system: CUSTOMER_EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${imageBase64}`,
            },
          },
          {
            type: "text",
            text: CUSTOMER_IMAGE_EXTRACTION_PROMPT,
          },
        ],
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type");
  }

  try {
    let jsonStr = content.text.trim();

    // Remove markdown code blocks if present
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    // Try to find JSON object in the response
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      jsonStr = objectMatch[0];
    }

    const customer = JSON.parse(jsonStr);
    return validateExtractedCustomer(customer);
  } catch (error) {
    console.error("Failed to parse customer extraction result:", error);
    console.error("Raw response:", content.text);
    throw new Error("ไม่สามารถแยกข้อมูลลูกค้าจากรูปภาพได้ กรุณาลองใหม่");
  }
}

function validateExtractedCustomer(data: unknown): ExtractedCustomer {
  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid response format: expected object");
  }

  const obj = data as Record<string, unknown>;

  // Clean tax ID - remove non-digits except hyphens
  let taxId = String(obj.customer_tax_id || "").trim();
  taxId = taxId.replace(/[^\d-]/g, "");

  // Clean branch code - remove non-digits
  let branchCode = String(obj.customer_branch_code || "00000").trim();
  branchCode = branchCode.replace(/[^\d]/g, "") || "00000";

  return {
    customer_name: String(obj.customer_name || "").trim(),
    customer_address: String(obj.customer_address || "").trim(),
    customer_tax_id: taxId,
    customer_branch_code: branchCode,
    customer_contact: String(obj.customer_contact || "").trim(),
    customer_phone: String(obj.customer_phone || "").trim(),
    customer_email: String(obj.customer_email || "").trim(),
  };
}

// Customer extraction from text
export async function extractCustomerFromText(
  text: string
): Promise<ExtractedCustomer> {
  const message = await createChatCompletion({
    model: MODEL,
    max_tokens: 4096,
    system: CUSTOMER_EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: CUSTOMER_TEXT_EXTRACTION_PROMPT.replace("{text}", text),
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type");
  }

  try {
    let jsonStr = content.text.trim();

    // Remove markdown code blocks if present
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    // Try to find JSON object in the response
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      jsonStr = objectMatch[0];
    }

    const customer = JSON.parse(jsonStr);
    return validateExtractedCustomer(customer);
  } catch (error) {
    console.error("Failed to parse customer extraction result:", error);
    console.error("Raw response:", content.text);
    throw new Error("ไม่สามารถแยกข้อมูลลูกค้าจากข้อความได้ กรุณาลองใหม่");
  }
}
