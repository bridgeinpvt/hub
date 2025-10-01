"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  Heart,
  MessageCircle,
  ShoppingBag,
  Users,
  Gift,
  Check,
  Trash2,
  Star,
  Megaphone,
  UserCheck,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState("all");

  // API calls (these will work when the backend is implemented)
  const { data: notifications, isLoading, refetch } = api.notification.getNotifications.useQuery({
    limit: 50,
    unreadOnly: false
  });

  const markAsReadMutation = api.notification.markAsRead.useMutation();
  const markAllAsReadMutation = api.notification.markAllAsRead.useMutation();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "POST_LIKE":
        return <Heart className="h-4 w-4 text-red-500" />;
      case "POST_COMMENT":
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case "CAPSULE_PURCHASE":
        return <ShoppingBag className="h-4 w-4 text-green-500" />;
      case "CAPSULE_REVIEW":
        return <Star className="h-4 w-4 text-yellow-500" />;
      case "MESSAGE_REQUEST":
        return <MessageCircle className="h-4 w-4 text-purple-500" />;
      case "NEW_FOLLOWER":
        return <Users className="h-4 w-4 text-blue-600" />;
      case "FOLLOW_BACK":
        return <UserCheck className="h-4 w-4 text-green-600" />;
      case "REFERRAL_REWARD":
        return <Gift className="h-4 w-4 text-orange-500" />;
      case "SYSTEM_ANNOUNCEMENT":
        return <Megaphone className="h-4 w-4 text-indigo-500" />;
      // Legacy types for backward compatibility
      case "LIKE":
        return <Heart className="h-4 w-4 text-red-500" />;
      case "COMMENT":
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case "PURCHASE":
        return <ShoppingBag className="h-4 w-4 text-green-500" />;
      case "MESSAGE":
        return <MessageCircle className="h-4 w-4 text-purple-500" />;
      case "REFERRAL":
        return <Gift className="h-4 w-4 text-orange-500" />;
      case "GIFT":
        return <Gift className="h-4 w-4 text-pink-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getNotificationTitle = (notification: any) => {
    // Use the title from the notification if it exists, otherwise use the content
    return notification.title || notification.content || "New notification";
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsReadMutation.mutateAsync({ notificationId });
      await refetch();
    } catch (error) {
      toast.error("Failed to mark as read");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsReadMutation.mutateAsync();
      await refetch();
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error("Failed to mark all as read");
    }
  };

  const handleDelete = async (_: string) => {
    // For now, just show a toast since we don't have the delete endpoint yet
    toast.success("Notification deleted");
  };

  const displayNotifications = notifications || [];
  const unreadCount = displayNotifications.filter(n => !n.isRead).length;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 px-4 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
            <Bell className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7" />
            Notifications
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Stay updated with your latest interactions and activities
          </p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={handleMarkAllAsRead} variant="outline" size="sm" className="self-start sm:self-auto">
            <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="text-xs sm:text-sm">Mark all read ({unreadCount})</span>
          </Button>
        )}
      </div>

      {/* Notification Filters */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="w-full overflow-x-auto scrollbar-hide">
          <TabsList className="inline-flex w-max min-w-full h-auto p-1 bg-muted rounded-lg">
            <TabsTrigger
              value="all"
              className="flex-shrink-0 px-3 py-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground"
            >
              All
            </TabsTrigger>
            <TabsTrigger
              value="POST_LIKE"
              className="flex-shrink-0 px-3 py-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground"
            >
              <Heart className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Likes
            </TabsTrigger>
            <TabsTrigger
              value="POST_COMMENT"
              className="flex-shrink-0 px-3 py-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground"
            >
              <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Comments
            </TabsTrigger>
            <TabsTrigger
              value="CAPSULE_PURCHASE"
              className="flex-shrink-0 px-3 py-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground"
            >
              <ShoppingBag className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Purchases
            </TabsTrigger>
            <TabsTrigger
              value="REFERRAL_REWARD"
              className="flex-shrink-0 px-3 py-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground"
            >
              <Gift className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Referrals
            </TabsTrigger>
            <TabsTrigger
              value="NEW_FOLLOWER"
              className="flex-shrink-0 px-3 py-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground"
            >
              <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Follows
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={activeTab} className="space-y-4">
          {displayNotifications.length === 0 ? (
            <Card>
              <CardContent className="p-8">
                <div className="text-center">
                  <Bell className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No notifications</h3>
                  <p className="text-muted-foreground">
                    You're all caught up! New notifications will appear here.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {displayNotifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`transition-all hover:shadow-md ${
                    !notification.isRead ? "border-primary/20 bg-primary/5" : ""
                  }`}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-2 sm:gap-4">
                      <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 mt-0.5 sm:mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-foreground text-sm sm:text-base line-clamp-1">
                              {getNotificationTitle(notification)}
                            </h4>
                            {!notification.isRead && (
                              <Badge variant="default" className="h-2 w-2 p-0 rounded-full flex-shrink-0">
                                <span className="sr-only">Unread</span>
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground mb-2 line-clamp-2">
                            {notification.content || ""}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(notification.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                        {!notification.isRead && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 sm:h-9 sm:w-9"
                            onClick={() => handleMarkAsRead(notification.id)}
                          >
                            <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 sm:h-9 sm:w-9"
                          onClick={() => handleDelete(notification.id)}
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}