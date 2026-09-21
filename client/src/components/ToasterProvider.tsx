"use client";

import { Toaster } from "sonner";

/** Toasts in the app's look: dark glass card, a lime border for success, red for errors. */
export function ToasterProvider() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-center gap-3 rounded-3xl border border-white/[0.22] bg-[#111411]/95 px-[18px] py-3.5 text-[15px] font-semibold text-white shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl",
          success: "!border-[#a6ff00]/45",
          error: "!border-red-400/55",
          title: "leading-snug",
          actionButton: "ml-auto rounded-full bg-[#a6ff00] px-4 py-1.5 text-sm font-extrabold text-black",
          icon: "shrink-0",
        },
      }}
    />
  );
}
