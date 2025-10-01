"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ExternalLink, Users, Star } from "lucide-react";
import Link from "next/link";

interface CapsuleCardProps {
  capsule: {
    id: string;
    name: string;
    description?: string;
    category: string;
    image?: string;
    subscribersCount: number;
    rating?: number;
    price?: number;
    creator: {
      name: string;
      image?: string;
      username: string;
    };
  };
  showCreator?: boolean;
}

export function CapsuleCard({ capsule, showCreator = true }: CapsuleCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start space-x-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={capsule.image} />
            <AvatarFallback>
              {capsule.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{capsule.name}</h3>
            <Badge variant="secondary" className="text-xs">
              {capsule.category}
            </Badge>
          </div>
          <Link href={`http://localhost:3002/capsules/${capsule.id}`}>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {capsule.description && (
            <p className="text-sm text-muted-foreground line-clamp-3">
              {capsule.description}
            </p>
          )}

          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4" />
              <span>{capsule.subscribersCount || 0}</span>
            </div>
            {capsule.rating && (
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>{capsule.rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          {showCreator && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={capsule.creator.image} />
                  <AvatarFallback className="text-xs">
                    {capsule.creator.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground">
                  by {capsule.creator.name}
                </span>
              </div>
              {capsule.price && (
                <Badge variant="outline" className="text-sm">
                  ₹{capsule.price}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}