"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  Search,
  Package,
  MessageSquare,
  Bell,
  Wallet
} from "lucide-react";

const navigation = [
  { name: "Home", href: "/home", icon: Home },
  { name: "Explore", href: "/explore", icon: Search },
  { name: "Capsules", href: "/capsules", icon: Package },
  { name: "Wallet", href: "/wallet", icon: Wallet },
  { name: "Messages", href: "/messages", icon: MessageSquare },
];

interface BottomNavProps {
  className?: string;
}

export function BottomNav({ className }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className={cn("bottom-nav-fixed bg-background border-t border-border", className)}>
      <div className="grid grid-cols-5 h-full px-2 py-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-2 rounded-xl min-h-[40px] transition-all duration-200",
                isActive 
                  ? "bg-primary shadow-lg" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted active:bg-primary/20"
              )}
            >
              <item.icon className={cn(
                "flex-shrink-0 transition-all duration-200",
                isActive ? "h-5 w-5" : "h-5 w-5"
              )} />
              <span className={cn(
                "text-xs mt-1 leading-tight font-medium transition-all duration-200",
                isActive ? "text-primary-foreground" : "text-muted-foreground"
              )}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}