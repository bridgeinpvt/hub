"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Heart, MessageCircle, UserPlus } from "lucide-react";
import { api } from "@/trpc/react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export function Notifications() {
  const { data: notifications, isLoading } = api.notification.getLatest.useQuery({
    limit: 5
  });

  const getIcon = (type: string) => {
    switch (type) {
      case "LIKE":
        return <Heart className="h-3 w-3 text-red-500" />;
      case "COMMENT":
        return <MessageCircle className="h-3 w-3 text-blue-500" />;
      case "FOLLOW":
        return <UserPlus className="h-3 w-3 text-green-500" />;
      default:
        return <Bell className="h-3 w-3" />;
    }
  };

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-auto text-xs">
              {unreadCount}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {notifications && notifications.length > 0 ? (
          <>
            {notifications.map((notification) => (
              <div key={notification.id} className={`flex items-start gap-3 p-2 rounded-lg ${!notification.read ? 'bg-muted/50' : ''}`}>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={notification.fromUser?.image || undefined} />
                  <AvatarFallback className="text-xs">
                    {notification.fromUser?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    {getIcon(notification.type)}
                    <p className="text-sm">
                      <span className="font-medium">{notification.fromUser?.name}</span>{" "}
                      <span className="text-muted-foreground">{notification.content}</span>
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </p>
                </div>
                {!notification.read && (
                  <div className="h-2 w-2 rounded-full bg-primary mt-2"></div>
                )}
              </div>
            ))}
            <Link href="/notifications">
              <Button variant="outline" size="sm" className="w-full">
                View All Notifications
              </Button>
            </Link>
          </>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No new notifications</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}