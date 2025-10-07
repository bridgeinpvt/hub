"use client";
import { signOut } from "@/contexts/AuthContext";

import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ThemeLogo } from "@/components/ui/theme-logo";
import Link from "next/link";
import { LogOut, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { api } from "@/trpc/react";

export function Header() {
  const { data: session } = useAuth();
  const { data: currentUser } = api.user.getCurrentUser.useQuery(
    undefined,
    { enabled: !!session?.user?.id }
  );

  // Get unread notification and message counts (enhanced version)
  const { data: unreadNotificationCount } = api.user.getUnreadNotificationCount.useQuery(
    undefined,
    {
      enabled: !!session?.user?.id,
      refetchInterval: 30000 // Refetch every 30 seconds
    }
  );

  const { data: unreadMessageCounts } = api.chat.getUnreadCounts.useQuery(
    undefined,
    {
      enabled: !!session?.user?.id,
      refetchInterval: 10000 // Refetch every 10 seconds for more responsive updates
    }
  );

  const totalUnreadMessages = unreadMessageCounts
    ? Object.values(unreadMessageCounts).reduce((sum, count) => sum + count, 0)
    : 0;

  const totalUnreadNotifications = unreadNotificationCount?.count || 0;
  const totalUnread = totalUnreadNotifications + totalUnreadMessages;

  return (
    <header className="bg-background border-b border-border fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center justify-between h-16">
        <div className="flex items-center flex-shrink-0 pl-4">
          <Link href="/" className="flex items-center">
            <ThemeLogo width={120} height={64} className="h-16 w-auto" />
          </Link>
        </div>

        <div className="flex items-center space-x-2 pr-4 sm:pr-6 lg:pr-8">
          {session?.user && (
            <>
              <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-white hover:bg-destructive relative">
                <Link href="/notifications">
                  <Bell className="h-5 w-5" />
                  {totalUnread > 0 && (
                    <Badge
                      className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-500 text-white border-2 border-background"
                      variant="destructive"
                    >
                      {totalUnread > 99 ? "99+" : totalUnread}
                    </Badge>
                  )}
                </Link>
              </Button>

              <Button variant="ghost" size="sm" asChild className="hover:bg-transparent">
                <Link href={`/profile/${currentUser?.username || 'user'}`}>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={currentUser?.image || session.user.image || undefined} />
                    <AvatarFallback className="text-xs">
                      {currentUser?.name?.[0] || session.user.name?.[0] || session.user.email?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              </Button>

              <Button variant="ghost" size="sm" onClick={() => signOut()} className="text-muted-foreground hover:text-white hover:bg-destructive">
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}