"use client";
import { useTheme } from "@/lib/client/theme";
import { GlassIconButton } from "./glass-icon-button";
import { Icon, MISC_ICON_PATH } from "@/components/ui/icons";

export function DarkToggleButton() {
  const { dark, toggleDark } = useTheme();
  return (
    <GlassIconButton onClick={toggleDark} label={dark ? "Switch to light mode" : "Switch to dark mode"}>
      <Icon path={dark ? MISC_ICON_PATH.sun : MISC_ICON_PATH.moon} size={17} sw={1.8} />
    </GlassIconButton>
  );
}
