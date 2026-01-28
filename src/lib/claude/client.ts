// OpenRouter API client for Claude models
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

interface OpenRouterMessage {
  role: "user" | "assistant" | "system";
  content: string | OpenRouterContent[];
}

interface OpenRouterContent {
  type: "text" | "image_url";
  text?: string;
  image_url?: {
    url: string;
  };
}

interface OpenRouterResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

export async function createChatCompletion(options: {
  model: string;
  max_tokens: number;
  system: string;
  messages: OpenRouterMessage[];
}): Promise<{ content: { type: "text"; text: string }[] }> {
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "Auto Bill",
    },
    body: JSON.stringify({
      model: options.model,
      max_tokens: options.max_tokens,
      messages: [
        { role: "system", content: options.system },
        ...options.messages,
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("OpenRouter API error response:", error);
    throw new Error(`OpenRouter API error: ${error}`);
  }

  const data: OpenRouterResponse = await response.json();
  console.log("OpenRouter API response:", JSON.stringify(data, null, 2));

  if (!data.choices || data.choices.length === 0) {
    console.error("No choices in response:", data);
    throw new Error("OpenRouter API returned empty response");
  }

  return {
    content: [
      {
        type: "text",
        text: data.choices[0]?.message?.content || "",
      },
    ],
  };
}
