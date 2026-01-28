"use client";

import { useState, useCallback } from "react";
import type { ExtractedItem } from "@/types/database";

interface UseAIExtractionReturn {
  extractFromText: (text: string) => Promise<ExtractedItem[] | null>;
  extractFromImage: (file: File) => Promise<ExtractedItem[] | null>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useAIExtraction(): UseAIExtractionReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const extractFromText = useCallback(
    async (text: string): Promise<ExtractedItem[] | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/ai/extract-text", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "เกิดข้อผิดพลาด");
        }

        return data.items;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการแยกข้อมูล";
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const extractFromImage = useCallback(
    async (file: File): Promise<ExtractedItem[] | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append("image", file);

        const response = await fetch("/api/ai/extract-image", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "เกิดข้อผิดพลาด");
        }

        return data.items;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "เกิดข้อผิดพลาดในการแยกข้อมูลจากรูปภาพ";
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    extractFromText,
    extractFromImage,
    isLoading,
    error,
    clearError,
  };
}
