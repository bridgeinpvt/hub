import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, ExternalLink } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";

interface CommentCardProps {
  comment: {
    id: string;
    content: string;
    createdAt: Date;
    createdBy: {
      id: string;
      name: string | null;
      username: string | null;
      image: string | null;
    };
    replyTo: {
      id: string;
      content: string;
      createdBy: {
        name: string | null;
        username: string | null;
      };
    } | null;
    _count?: {
      likes: number;
      comments: number;
    };
  };
}

export function CommentCard({ comment }: CommentCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start space-x-3">
          <Avatar className="w-10 h-10">
            <Image
              src={
                comment.createdBy.image ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                  comment.createdBy.name || comment.createdBy.username || "U"
                )}`
              }
              alt={comment.createdBy.name || comment.createdBy.username || "User"}
              fill
              className="object-cover rounded-full"
            />
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <Link 
                href={`/profile/${comment.createdBy.username}`}
                className="font-medium text-foreground hover:text-white hover:bg-primary hover:underline rounded px-1"
              >
                {comment.createdBy.name || comment.createdBy.username}
              </Link>
              <span className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </span>
            </div>
            
            {/* Show what this is a reply to */}
            {comment.replyTo && (
              <div className="mt-2 p-2 bg-muted rounded border-l-2 border-primary/20">
                <div className="text-xs text-muted-foreground mb-1">
                  Replying to{" "}
                  <span className="font-medium">
                    {comment.replyTo.createdBy.name || comment.replyTo.createdBy.username}
                  </span>
                </div>
                <p className="text-sm text-foreground line-clamp-2">
                  {comment.replyTo.content}
                </p>
                <Link 
                  href={`/post/${comment.replyTo.id}`}
                  className="inline-flex items-center text-xs text-primary hover:text-white hover:bg-primary rounded px-1 mt-1"
                >
                  View original post
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-foreground mb-4">{comment.content}</p>
        
        {/* Action Buttons */}
        <div className="flex items-center space-x-4 pt-2 border-t">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white hover:bg-red-500">
            <Heart className="h-4 w-4 mr-1" />
            {comment._count?.likes || 0}
          </Button>
          
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white hover:bg-blue-500">
            <MessageCircle className="h-4 w-4 mr-1" />
            {comment._count?.comments || 0}
          </Button>
          
          <Link href={`/post/${comment.replyTo?.id || comment.id}`}>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white hover:bg-green-500">
              <ExternalLink className="h-4 w-4 mr-1" />
              View Thread
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}