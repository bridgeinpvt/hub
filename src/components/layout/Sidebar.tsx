"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { 
  Home, 
  Search, 
  Package, 
  MessageSquare, 
  Users, 
  Bell,
  Settings,
  PanelRightOpen,
  PanelLeftOpen,
  User,
  LogOut,
  Wallet
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/trpc/react";

const navigation = [
  { name: "Home", href: "/home", icon: Home },
  { name: "Messages", href: "/messages", icon: MessageSquare },
  { name: "Wallet", href: "/wallet", icon: Wallet },
  { name: "Referrals", href: "/referrals", icon: Users },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Settings", href: "/settings", icon: Settings },
];

const externalApps = [
  { name: "Capsules", href: "http://localhost:3002", icon: Package, requiresEnrollment: "capsule" },
  { name: "Business", href: "http://localhost:3004", icon: Settings, requiresEnrollment: "business" },
];

interface SidebarProps {
  className?: string;
  onCollapseChange?: (isCollapsed: boolean) => void;
}

export function Sidebar({ className, onCollapseChange }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { data: currentUser } = api.user.getCurrentUser.useQuery(
    undefined,
    { enabled: !!session?.user?.id }
  );

  // Get unread message and notification counts
  const { data: unreadMessageCounts } = api.chat.getUnreadCounts.useQuery(
    undefined,
    {
      enabled: !!session?.user?.id,
      refetchInterval: 10000 // Refetch every 10 seconds for more responsive updates
    }
  );

  const { data: unreadNotificationCount } = api.user.getUnreadNotificationCount.useQuery(
    undefined,
    {
      enabled: !!session?.user?.id,
      refetchInterval: 30000 // Refetch every 30 seconds
    }
  );

  const totalUnreadMessages = unreadMessageCounts
    ? Object.values(unreadMessageCounts).reduce((sum, count) => sum + count, 0)
    : 0;

  const totalUnreadNotifications = unreadNotificationCount?.count || 0;

  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleCollapseToggle = () => {
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    onCollapseChange?.(newCollapsedState);
  };

  const handleLinkClick = () => {
    // setIsCollapsed(true);
    // onCollapseChange?.(true);
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-16 h-[calc(100vh-4rem)] bg-background border-r border-border flex flex-col z-40",
        isCollapsed ? "w-16" : "w-64",
        className
      )}
    >
      <div className="p-4 flex-1">
        <div className={cn(
          "mb-4",
          isCollapsed ? "flex justify-center" : "flex items-center justify-between"
        )}>
          {!isCollapsed && <span className="text-sm font-medium text-muted-foreground">Navigation</span>}
          <button
            onClick={handleCollapseToggle}
            className={cn(
              "flex items-center justify-end rounded-md hover:bg-muted",
              isCollapsed ? "p-2 w-10 h-10" : "p-1"
            )}
          >
            {isCollapsed ? (
              <PanelLeftOpen size={20} className="text-muted-foreground" />
            ) : (
              <PanelRightOpen size={20} className="text-muted-foreground" />
            )}
          </button>
        </div>
        <nav className="space-y-1 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href;

            // Get unread count for specific items
            let unreadCount = 0;
            if (item.href === "/messages") {
              unreadCount = totalUnreadMessages;
            } else if (item.href === "/notifications") {
              unreadCount = totalUnreadNotifications;
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={handleLinkClick}
                className={cn(
                  "flex items-center py-2 text-sm font-medium rounded-md relative",
                  isActive
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:text-white hover:bg-primary",
                  isCollapsed ? "px-2 justify-center" : "px-3"
                )}
                title={isCollapsed ? item.name : undefined}
              >
                <div className="flex items-center justify-center w-5 h-5">
                  <item.icon className="h-5 w-5" />
                </div>
                {!isCollapsed && (
                  <div className="flex items-center justify-between flex-1 ml-3">
                    <span>{item.name}</span>
                    {unreadCount > 0 && (
                      <Badge
                        className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-500 text-white"
                        variant="destructive"
                      >
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </Badge>
                    )}
                  </div>
                )}
                {isCollapsed && unreadCount > 0 && (
                  <Badge
                    className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs bg-red-500 text-white border border-background"
                    variant="destructive"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Profile Section - Bottom of Sidebar */}
      {session?.user && (
        <div className="p-4 border-t border-border">
          {!isCollapsed ? (
            <div className="space-y-2">
              {/* User Info */}
              <div className="flex items-center space-x-3 p-2 rounded-lg">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={currentUser?.image || session.user.image || undefined} />
                  <AvatarFallback className="text-xs">
                    {currentUser?.name?.[0] || session.user.name?.[0] || session.user.email?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {currentUser?.name || session.user.name || session.user.email}
                  </p>
                  {currentUser?.username && (
                    <p className="text-xs text-muted-foreground truncate">
                      @{currentUser.username}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-1">
                <Button variant="ghost" size="sm" asChild className="flex-1 hover:bg-primary hover:text-white">
                  <Link href={`/profile/${currentUser?.username || 'user'}`} onClick={handleLinkClick}>
                    <User className="h-4 w-4 mr-1" />
                    Profile
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => signOut()} className="px-2 hover:bg-primary hover:text-white">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Button variant="ghost" size="sm" asChild className="w-full p-2 hover:bg-primary hover:text-white">
                <Link href={`/profile/${currentUser?.username || 'user'}`} onClick={handleLinkClick}>
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={currentUser?.image || session.user.image || undefined} />
                    <AvatarFallback className="text-xs">
                      {currentUser?.name?.[0] || session.user.name?.[0] || session.user.email?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => signOut()} className="w-full p-2 hover:bg-primary hover:text-white">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}