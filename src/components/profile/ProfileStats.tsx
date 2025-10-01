import React from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface ProfileStatsProps {
  user: {
    id: string;
    postsCount?: number;
    followerCount?: number;
    followingCount?: number;
    referralCredits?: number;
    createdAt?: Date;
  };
}

export function ProfileStats({ user }: ProfileStatsProps) {
  const { data: session } = useSession();
  const isOwnProfile = session?.user?.id === user.id;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Stats</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Posts</span>
          <span className="font-semibold">{user.postsCount || 0}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Followers</span>
          <span className="font-semibold">{user.followerCount || 0}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Following</span>
          <span className="font-semibold">{user.followingCount || 0}</span>
        </div>
        {isOwnProfile && (
          <div className="flex justify-between">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Credits</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">100 credits = ₹20 which can be used for app purchases</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="text-right">
              <span className="font-semibold">{user.referralCredits || 0}</span>
              <div className="text-xs text-muted-foreground">
                ≈ ₹{Math.floor(((user.referralCredits || 0) / 100) * 20)}
              </div>
            </div>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Joined</span>
          <span className="font-semibold text-sm">
            {user.createdAt 
              ? new Date(user.createdAt).toLocaleDateString('en-US', { 
                  month: 'short', 
                  year: 'numeric' 
                }) 
              : "Recently"
            }
          </span>
        </div>
      </CardContent>
    </Card>
  );
}