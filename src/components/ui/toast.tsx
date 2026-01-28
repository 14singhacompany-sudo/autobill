"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useToast, type Toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function Toaster() {
  const { toasts, dismiss } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "relative rounded-lg border p-4 pr-10 shadow-lg transition-all",
            "animate-in slide-in-from-right-full duration-300",
            toast.variant === "destructive"
              ? "bg-destructive text-destructive-foreground border-destructive"
              : "bg-background text-foreground border-border"
          )}
        >
          <button
            onClick={() => dismiss(toast.id)}
            className="absolute top-2 right-2 p-1 rounded-md opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
          {toast.title && (
            <p className="font-semibold text-sm">{toast.title}</p>
          )}
          {toast.description && (
            <p className="text-sm opacity-90 mt-1">{toast.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}
