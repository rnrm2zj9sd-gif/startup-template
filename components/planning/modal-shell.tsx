"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect } from "react";

type Props = {
  titleId: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
};

export function ModalShell({ titleId, onClose, children, className }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/75 p-3 backdrop-blur-[2px] sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal
        aria-labelledby={titleId}
        className={cn(
          "relative flex max-h-[90dvh] w-full max-w-md flex-col overflow-y-auto rounded-2xl border border-border bg-card p-5",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground motion-safe:transition-colors hover:bg-white/5 hover:text-foreground"
        >
          <X className="size-4" />
        </button>
        {children}
      </div>
    </div>
  );
}
