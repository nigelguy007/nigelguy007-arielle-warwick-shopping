"use client";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Circle icon button - header notification bell, dark-mode toggle, back button. */
export function GlassIconButton({
  onClick,
  href,
  label,
  children,
  badge,
  className,
  style,
}: {
  onClick?: () => void;
  href?: string;
  label: string;
  children: ReactNode;
  badge?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const Tag = href ? "a" : "button";
  return (
    <Tag
      {...(href ? { href } : { type: "button" })}
      onClick={onClick}
      aria-label={label}
      style={style}
      className={cn("glass tap relative flex h-10 w-10 items-center justify-center rounded-full text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent", className)}
    >
      {children}
      {badge ? (
        <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full ring-2 ring-[var(--card)]" style={{ background: "var(--danger-badge)" }} aria-hidden />
      ) : null}
    </Tag>
  );
}
