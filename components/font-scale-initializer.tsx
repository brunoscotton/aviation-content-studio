"use client";

import { useEffect } from "react";

const FONT_SCALE_KEY = "aviation-pref-font-size";

export default function FontScaleInitializer() {
  useEffect(() => {
    const saved = Number(localStorage.getItem(FONT_SCALE_KEY));
    if (Number.isFinite(saved) && saved >= 1 && saved <= 1.5) {
      document.documentElement.style.setProperty("--font-scale", String(saved));
    }
  }, []);

  return null;
}
