"use client";

import { api } from "@/trpc/react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/ui/avatar";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { Heart, MessageCircle, Bookmark, Share, ArrowLeft, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";

export default function PostDetailPage() {
  const params = useParams();
  const postId = params.id as string;
  const [commentContent, setCommentContent] = useState("");
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);

  const { data: post, isLoading: postLoading, refetch: refetchPost } = api.post.getWithComments.useQuery(
    { postId },
    { enabled: !!postId }
  );

  const { data: isLiked, refetch: refetchIsLiked } = api.post.isLiked.useQuery(
    { postId },
    { enabled: !!postId }
  );

  const { data: isBookmarked, refetch: refetchIsBookmarked } = api.post.isBookmarked.useQuery(
    { postId },
    { enabled: !!postId }
  );

  const likeMutation = api.post.like.useMutation({
    onSuccess: () => {
      refetchIsLiked();
      refetchPost();
    },
  });

  const bookmarkMutation = api.post.bookmark.useMutation({
    onSuccess: () => {
      refetchIsBookmarked();
    },
  });

  const commentMutation = api.post.comment.useMutation({
    onSuccess: () => {
      setCommentContent("");
      refetchPost();
    },
  });

  const handleLike = () => {
    likeMutation.mutate({ postId });
  };

  const handleBookmark = () => {
    bookmarkMutation.mutate({ postId });
  };

  const handleComment = () => {
    if (commentContent.trim()) {
      commentMutation.mutate({
        postId,
        content: commentContent.trim(),
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by ${post?.createdBy?.name || post?.createdBy?.username}`,
          text: post?.content,
          url: window.location.href,
        });
      } catch (error) {
        console.log("Sharing cancelled");
      }
    } else {
      // Fallback to copying to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  if (postLoading) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="text-center">Loading post...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="text-center">Post not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-4 space-y-6">
      {/* Back Button */}
      <Link href="/home">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </Link>

      {/* Main Post */}
      <Card>
        <CardHeader>
          <div className="flex items-start space-x-3">
            <Avatar className="w-10 h-10">
              <img
                src={post.createdBy?.image || `https://api.dicebear.com/7.x/initials/svg?seed=${post.createdBy?.name || post.createdBy?.username}`}
                alt={post.createdBy?.name || post.createdBy?.username || "User"}
                className="w-full h-full object-cover rounded-full"
              />
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold">
                  {post.createdBy?.name || post.createdBy?.username}
                </h3>
                <span className="text-sm text-muted-foreground">
                  @{post.createdBy?.username}
                </span>
                <span className="text-sm text-muted-foreground">·</span>
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <MarkdownRenderer content={post.content} />
          </div>

          {/* Post Images */}
          {post.images && post.images.length > 0 && (
            <div className={`mb-4 ${
              post.images.length === 1 ? 'grid grid-cols-1' :
              post.images.length === 2 ? 'grid grid-cols-2 gap-2' :
              post.images.length === 3 ? 'grid grid-cols-2 gap-2' :
              'grid grid-cols-2 gap-2'
            }`}>
              {post.images.slice(0, 4).map((imageUrl, index) => (
                <div 
                  key={index} 
                  className={`relative overflow-hidden rounded-lg cursor-pointer ${
                    post.images!.length === 3 && index === 0 ? 'col-span-2' : ''
                  }`}
                  onClick={() => {
                    setSelectedImageIndex(index);
                    setImageModalOpen(true);
                  }}
                >
                  <Image
                    src={imageUrl}
                    alt={`Post image ${index + 1}`}
                    width={post.images!.length === 1 ? 600 : 300}
                    height={post.images!.length === 1 ? 400 : 250}
                    className="object-cover w-full h-auto max-h-96 hover:opacity-90 transition-opacity"
                  />
                  {post.images!.length > 4 && index === 3 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">
                        +{post.images!.length - 4}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Hashtags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map((tag: any) => (
                <Link
                  key={tag.id}
                  href={`/hashtag/${tag.name}`}
                  className="text-primary hover:text-primary/80 text-sm font-medium bg-primary/10 px-2 py-1 rounded-full"
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={`${isLiked ? "text-red-500 dark:text-red-400" : "text-muted-foreground"} hover:bg-red-500 hover:text-white`}
            >
              <Heart className={`h-4 w-4 mr-2 ${isLiked ? "fill-current" : ""}`} />
              {post._count?.likes || 0}
            </Button>

            <Button variant="ghost" size="sm" className="text-muted-foreground hover:bg-blue-500 hover:text-white">
              <MessageCircle className="h-4 w-4 mr-2" />
              {post._count?.replies || 0}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleBookmark}
              className={`${isBookmarked ? "text-blue-500 dark:text-blue-400" : "text-muted-foreground"} hover:bg-blue-500 hover:text-white`}
            >
              <Bookmark className={`h-4 w-4 mr-2 ${isBookmarked ? "fill-current" : ""}`} />
              {isBookmarked ? "Saved" : "Save"}
            </Button>

            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleShare} 
              className="text-muted-foreground hover:bg-green-500 hover:text-white"
            >
              <Share className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comment Form */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Textarea
              placeholder="Write a comment..."
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end">
              <Button
                onClick={handleComment}
                disabled={!commentContent.trim() || commentMutation.isPending}
              >
                {commentMutation.isPending ? "Posting..." : "Post Comment"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comments */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          Comments ({post.comments?.length || 0})
        </h3>
        
        {post.comments && post.comments.length > 0 ? (
          post.comments.map((comment: any) => (
            <Card key={comment.id}>
              <CardContent className="pt-4">
                <div className="flex items-start space-x-3">
                  <Avatar className="w-8 h-8">
                    <img
                      src={comment.createdBy?.image || `https://api.dicebear.com/7.x/initials/svg?seed=${comment.createdBy?.name || comment.createdBy?.username}`}
                      alt={comment.createdBy?.name || comment.createdBy?.username || "User"}
                      className="w-full h-full object-cover rounded-full"
                    />
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-sm">
                        {comment.createdBy?.name || comment.createdBy?.username}
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{comment.content}</p>
                    
                    {/* Comment Actions */}
                    <div className="flex items-center space-x-4 mt-2">
                      <Button variant="ghost" size="sm" className="text-muted-foreground p-0 h-auto">
                        <Heart className="h-3 w-3 mr-1" />
                        {comment._count?.likes || 0}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
            <p>No comments yet</p>
            <p className="text-sm">Be the first to comment!</p>
          </div>
        )}
      </div>

      {/* Image Modal */}
      {imageModalOpen && post.images && selectedImageIndex !== null && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={() => setImageModalOpen(false)}
        >
          <div className="relative max-w-4xl max-h-screen p-4">
            {/* Close Button */}
            <button
              onClick={() => setImageModalOpen(false)}
              className="absolute top-4 right-4 z-10 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Navigation Arrows */}
            {post.images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex(selectedImageIndex === 0 ? post.images!.length - 1 : selectedImageIndex - 1);
                  }}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex(selectedImageIndex === post.images!.length - 1 ? 0 : selectedImageIndex + 1);
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            {/* Image */}
            <Image
              src={post.images[selectedImageIndex]}
              alt={`Post image ${selectedImageIndex + 1}`}
              width={800}
              height={600}
              className="object-contain max-w-full max-h-full"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Image Counter */}
            {post.images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                {selectedImageIndex + 1} / {post.images.length}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}