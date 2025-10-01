"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface ThemeLogoProps {
  width?: number;
  height?: number;
  className?: string;
  forceLight?: boolean; // Force light theme logo
}

export function ThemeLogo({ 
  width = 120, 
  height = 60, 
  className = "h-16 w-auto",
  forceLight = false 
}: ThemeLogoProps) {
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return light logo during hydration to avoid flash
    return (
      <Image
        src="/logo.png"
        alt="Nocage"
        width={width}
        height={height}
        className={className}
      />
    );
  }

  // Force light theme if requested (for landing page)
  if (forceLight) {
    return (
      <Image
        src="/logo.png"
        alt="Nocage"
        width={width}
        height={height}
        className={className}
      />
    );
  }

  // Determine current theme
  const currentTheme = theme === 'system' ? systemTheme : theme;
  const isDark = currentTheme === 'dark';

  return (
    <Image
      src={isDark ? "/logo-white.png" : "/logo.png"}
      alt="Nocage"
      width={width}
      height={height}
      className={className}
    />
  );
}