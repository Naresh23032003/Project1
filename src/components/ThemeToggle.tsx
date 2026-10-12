"use client";

import { useSyncExternalStore } from "react";

const query = "(prefers-color-scheme: dark)";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const media = window.matchMedia(query);
  media.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", onChange);
  };
}

function isDark(): boolean {
  const attr = document.documentElement.getAttribute("data-theme");
  return attr ? attr === "dark" : window.matchMedia(query).matches;
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);

  function toggle() {
    const next = !dark;
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* storage can be blocked; the choice just won't stick */
    }
  }

  return (
    <button type="button" className="btn btn-quiet" onClick={toggle} aria-pressed={dark} style={{ minHeight: 44 }}>
      {dark ? "Dark" : "Light"} mode
    </button>
  );
}
