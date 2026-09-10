"use client";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 40x40 glass circle icon button - header dark-mode toggle, notification
 * bell, back button. Exact treatment from the design handoff. */
export function GlassIconButton({
  onClick,
  href,
  label,
  children,
  badge,
  className,
}: {
  onClick?: () => void;
  href?: string;
  label: string;
  children: ReactNode;
  badge?: number;
  className?: string;
}) {
  const Tag = href ? "a" : "button";
  return (
    <Tag
      {...(href ? { href } : { type: "button" })}
      onClick={onClick}
      aria-label={label}
      className={cn("glass tap relative flex h-10 w-10 items-center justify-center rounded-full text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent", className)}
    >
      {children}
      {badge ? (
        <span className="absolute top-1.5 right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold text-white" style={{ background: "var(--danger-badge)" }}>
          {badge}
        </span>
      ) : null}
    </Tag>
  );
}
