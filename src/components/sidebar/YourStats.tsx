"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Users, Heart } from "lucide-react";
import { api } from "@/trpc/react";

export function YourStats() {
  const { data: userStats, isLoading } = api.user.getUserStats.useQuery();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Your Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="text-center">
                <Skeleton className="h-8 w-12 mx-auto mb-1" />
                <Skeleton className="h-3 w-16 mx-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Your Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{userStats?.postsCount || 0}</div>
            <div className="text-xs text-muted-foreground">Posts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{userStats?.likesReceived || 0}</div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Heart className="h-3 w-3" />
              Likes
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{userStats?.followersCount || 0}</div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Users className="h-3 w-3" />
              Followers
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{userStats?.followingCount || 0}</div>
            <div className="text-xs text-muted-foreground">Following</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}