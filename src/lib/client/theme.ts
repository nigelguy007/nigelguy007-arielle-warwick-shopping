"use client";
import { useCallback, useEffect, useState } from "react";

const KEY = "aw:theme";

/** Inline, blocking (runs before paint) so there is never a flash of the
 * wrong theme on load - reads any explicit override, otherwise leaves the
 * `prefers-color-scheme` media query in globals.css to decide. */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem('${KEY}');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);}catch(e){}`;

function currentIsDark(): boolean {
  if (typeof document === "undefined") return false;
  const explicit = document.documentElement.getAttribute("data-theme");
  if (explicit === "dark") return true;
  if (explicit === "light") return false;
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

/** Explicit light/dark override (Home header icon, Me screen row), falling
 * back to system preference until the user picks one.
 *
 * `dark` is forced false until the component has mounted, matching what SSR
 * always renders (it can't know the client's system preference). This is
 * the standard hydration-safe pattern for a client-only value (see
 * next-themes) - the page's actual colours already switch instantly via the
 * plain CSS `prefers-color-scheme` query regardless of this flag, so the
 * one-paint delay only affects which icon/label a toggle shows, not colour. */
export function useTheme() {
  const [dark, setDark] = useState(currentIsDark);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // The standard "has mounted" flag: unconditional, runs once, the
    // documented way to defer a client-only value past hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => { if (!localStorage.getItem(KEY)) setDark(currentIsDark()); };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const toggleDark = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
      try {
        localStorage.setItem(KEY, next ? "dark" : "light");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return { dark: mounted ? dark : false, toggleDark };
}
