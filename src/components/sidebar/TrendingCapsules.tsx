"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, ExternalLink } from "lucide-react";
import { api } from "@/trpc/react";
import Link from "next/link";

export function TrendingCapsules() {
  const { data: trendingCapsules, isLoading } = api.capsule.getTrending.useQuery({
    limit: 3
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Trending Capsules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-3 w-20" />
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
          <TrendingUp className="h-5 w-5" />
          Trending Capsules
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {trendingCapsules && trendingCapsules.length > 0 ? (
          <>
            {trendingCapsules.map((capsule) => (
              <div key={capsule.id} className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{capsule.name}</h4>
                    <p className="text-xs text-muted-foreground truncate">
                      {capsule.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {capsule.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {capsule.subscribersCount || 0} subscribers
                      </span>
                    </div>
                  </div>
                  <Link href={`http://localhost:3002/capsules/${capsule.id}`}>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
            <Link href="http://localhost:3002/capsules">
              <Button variant="outline" size="sm" className="w-full">
                View All Capsules
              </Button>
            </Link>
          </>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No trending capsules</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}