import React from "react";
import { ChevronLeft, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapseIconProps {
  isCollapsed: boolean;
  onClick: () => void;
  className?: string;
  size?: number;
}

export function CollapseIcon({ 
  isCollapsed, 
  onClick, 
  className,
  size = 16 
}: CollapseIconProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center rounded-md p-1 transition-colors hover:bg-gray-100",
        className
      )}
    >
      {isCollapsed ? (
        <ChevronLeft size={size} />
      ) : (
        <ChevronDown size={size} />
      )}
    </button>
  );
}