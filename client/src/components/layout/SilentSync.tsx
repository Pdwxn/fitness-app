"use client";

import { useEffect } from "react";

import { startSilentSync } from "@/lib/sync";

export function SilentSync() {
  useEffect(() => {
    const interval = startSilentSync();
    return () => window.clearInterval(interval);
  }, []);

  return null;
}
