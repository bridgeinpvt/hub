import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share2, Bookmark, Loader2, ExternalLink, Globe, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/trpc/react";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { useRealTimeUpdates } from "@/contexts/WebSocketContext";
import { LinkPreview } from "./LinkPreview";
import { parsePostContent } from "@/lib/url-utils";
import { logger } from "@/lib/logger";
import { useAnalytics } from "@/hooks/useAnalytics";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { ImageModal } from "@/components/ui/image-modal";

interface PostCardProps {
  post: {
    id: string;
    content: string;
    images?: string[];
    createdAt: Date;
    createdBy: {
      id: string;
      name: string | null;
      username: string | null;
      image: string | null;
    };
    tags?: Array<{
      id: string;
      name: string;
    }>;
    _count?: {
      likes: number;
      comments: number;
    };
  };
}

export function PostCard({ post }: PostCardProps) {
  const { data: session } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [optimisticLikeCount, setOptimisticLikeCount] = useState(post._count?.likes || 0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { subscribeToPostUpdates, emitLike, emitBookmark } = useRealTimeUpdates();
  const { trackPostEngagement } = useAnalytics();
  
  const MAX_LENGTH = 280;
  
  // Helper function to intelligently truncate markdown content while preserving formatting
  const truncateMarkdown = (content: string, maxLength: number): string => {
    if (content.length <= maxLength) return content;
    
    // First, try to find a good break point
    let truncated = content.slice(0, maxLength);
    
    // Find natural break points
    const lastDoubleNewline = truncated.lastIndexOf('\n\n'); // Paragraph break
    const lastSingleNewline = truncated.lastIndexOf('\n');   // Line break
    const lastPeriod = truncated.lastIndexOf('. ');          // Sentence end
    const lastSpace = truncated.lastIndexOf(' ');            // Word boundary
    
    // Prefer paragraph breaks, then sentence breaks, then word boundaries
    let cutoff = lastSpace;
    if (lastPeriod > 0 && lastPeriod > maxLength - 100) {
      cutoff = lastPeriod + 1;
    } else if (lastDoubleNewline > 0 && lastDoubleNewline > maxLength - 150) {
      cutoff = lastDoubleNewline;
    } else if (lastSingleNewline > 0 && lastSingleNewline > maxLength - 100) {
      cutoff = lastSingleNewline;
    }
    
    truncated = truncated.slice(0, cutoff).trim();
    
    // Clean up broken markdown at the end
    truncated = truncated
      .replace(/#{1,6}\s*[^#\n]*$/, '')  // Remove incomplete headers
      .replace(/\*{1,2}[^*\n]*$/, '')   // Remove incomplete bold/italic
      .replace(/`[^`\n]*$/, '')         // Remove incomplete code spans
      .replace(/^\s*[-*+]\s*$/, '')     // Remove hanging list markers
      .replace(/\n\s*[-*+]\s*[^-*+\n]*$/, '') // Remove incomplete list items
      .trim();
    
    // Ensure we don't end with broken markdown structures
    const lines = truncated.split('\n');
    const cleanedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip lines that look like incomplete markdown structures
      if (i === lines.length - 1) { // Last line
        if (line.match(/^#{1,6}\s*$/) || // Empty header
            line.match(/^\s*[-*+]\s*$/) || // Empty list item
            line.match(/^\s*\*{1,2}$/) ||  // Hanging bold/italic
            line.match(/^\s*`+\s*$/)) {    // Hanging code
          continue;
        }
      }
      cleanedLines.push(line);
    }
    
    return cleanedLines.join('\n').trim();
  };
  
  // Parse post content to extract URLs and text, filtering out metadata and source lines
  const cleanContent = useMemo(() => {
    let content = post.content;
    // Remove metadata comment (more comprehensive pattern)
    content = content.replace(/<!-- NEWS_METADATA:[^>]*-->/g, '');
    content = content.replace(/<!--[^>]*NEWS_METADATA[^>]*-->/g, '');
    // Remove old source and read more lines for backward compatibility
    content = content.replace(/\n\nSource: [^\n]+/g, '');
    content = content.replace(/\n\nRead more: https?:\/\/[^\s]+/g, '');
    // Clean up extra whitespace
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    return content.trim();
  }, [post.content]);
  
  const parsedContent = parsePostContent(cleanContent);
  const displayText = parsedContent.text || cleanContent;
  const hasUrls = parsedContent.urls.length > 0;
  const shouldShowSeeMore = cleanContent.length > MAX_LENGTH;
  
  
  // Detect if this is a news post (from nocage_network user)
  const isNewsPost = post.createdBy.username === 'nocage_network';
  
  // Extract source URL and name from news posts metadata
  const newsMetadata = useMemo(() => {
    if (!isNewsPost) return { sourceUrl: null, sourceName: null };
    
    const metadataMatch = post.content.match(/<!-- NEWS_METADATA: ({[^}]+}) -->/);
    if (metadataMatch) {
      try {
        const metadata = JSON.parse(metadataMatch[1]);
        return {
          sourceUrl: metadata.sourceUrl || null,
          sourceName: metadata.sourceName || null
        };
      } catch (error) {
        // Fallback to old parsing method for existing posts
        const readMoreMatch = post.content.match(/Read more: (https?:\/\/[^\s]+)/);
        const sourceMatch = post.content.match(/Source: ([^\n]+)/);
        return {
          sourceUrl: readMoreMatch ? readMoreMatch[1] : null,
          sourceName: sourceMatch ? sourceMatch[1] : null
        };
      }
    }
    
    // Fallback to old parsing method for existing posts
    const readMoreMatch = post.content.match(/Read more: (https?:\/\/[^\s]+)/);
    const sourceMatch = post.content.match(/Source: ([^\n]+)/);
    return {
      sourceUrl: readMoreMatch ? readMoreMatch[1] : null,
      sourceName: sourceMatch ? sourceMatch[1] : null
    };
  }, [isNewsPost, post.content]);
  
  const sourceUrl = newsMetadata.sourceUrl;
  const sourceName = newsMetadata.sourceName;
  
  const { data: likedStatus } = api.post.isLiked.useQuery(
    { postId: post.id },
    { enabled: !!session }
  );
  
  const { data: bookmarkedStatus } = api.post.isBookmarked.useQuery(
    { postId: post.id },
    { enabled: !!session }
  );

  useEffect(() => {
    if (likedStatus !== undefined) setIsLiked(likedStatus);
  }, [likedStatus]);

  useEffect(() => {
    if (bookmarkedStatus !== undefined) setIsBookmarked(bookmarkedStatus);
  }, [bookmarkedStatus]);

  // Update optimistic count when post data changes
  useEffect(() => {
    setOptimisticLikeCount(post._count?.likes || 0);
  }, [post._count?.likes]);

  // Subscribe to real-time updates for this post
  useEffect(() => {
    if (!session) return;

    const unsubscribe = subscribeToPostUpdates(post.id, (data) => {
      if (data.type === 'like') {
        setIsLiked(data.isLiked);
        setOptimisticLikeCount(data.likesCount);
      } else if (data.type === 'bookmark') {
        setIsBookmarked(data.isBookmarked);
      }
    });

    return unsubscribe;
  }, [post.id, session, subscribeToPostUpdates]);
  
  const likeMutation = api.post.like.useMutation({
    onSuccess: (data: any) => {
      setIsLiked(data.liked);
      if (data.likesCount !== undefined) {
        setOptimisticLikeCount(data.likesCount);
        emitLike(post.id, data.liked, data.likesCount);
      }
    },
    onError: () => {
      // Revert optimistic update on error
      setIsLiked(!isLiked);
      setOptimisticLikeCount(post._count?.likes || 0);
    },
  });

  const bookmarkMutation = api.post.bookmark.useMutation({
    onSuccess: (data) => {
      setIsBookmarked(data.bookmarked);
      // Emit real-time update to other users
      emitBookmark(post.id, data.bookmarked);
    },
    onError: () => {
      // Revert optimistic update on error
      setIsBookmarked(!isBookmarked);
    },
  });

  const shareMutation = api.post.share.useMutation();

  const handleLike = () => {
    if (!session) return;
    trackPostEngagement('like', post.id);
    likeMutation.mutate({ postId: post.id });
  };

  const handleBookmark = () => {
    if (!session) return;
    trackPostEngagement('bookmark', post.id);
    bookmarkMutation.mutate({ postId: post.id });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by ${post.createdBy?.name || post.createdBy?.username}`,
          text: post.content,
          url: `${window.location.origin}/post/${post.id}`,
        });
        trackPostEngagement('share', post.id);
        shareMutation.mutate({ postId: post.id });
      } catch (error) {
        logger.log("Sharing cancelled");
      }
    } else {
      // Fallback to copying to clipboard
      navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
      trackPostEngagement('share', post.id);
      shareMutation.mutate({ postId: post.id });
    }
  };

  const handleImageClick = (imageIndex: number) => {
    setSelectedImageIndex(imageIndex);
    setImageModalOpen(true);
  };

  const nextImage = () => {
    if (post.images && post.images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % post.images!.length);
    }
  };

  const previousImage = () => {
    if (post.images && post.images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + post.images!.length) % post.images!.length);
    }
  };

  return (
    <div className="w-full bg-card border-b border-border py-4">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-4 px-6">
        <Link href={`/profile/${post.createdBy.username}`}>
          <Avatar className="cursor-pointer hover:opacity-80 transition-optimize">
            <AvatarImage src={post.createdBy.image || undefined} />
            <AvatarFallback>
              {post.createdBy.name?.[0] || post.createdBy.username?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col">
            <Link 
              href={`/profile/${post.createdBy.username}`}
              className="font-medium text-foreground hover:text-primary transition-colors truncate"
            >
              {post.createdBy.name || post.createdBy.username || "Unknown User"}
            </Link>
            <div className="text-xs text-muted-foreground mt-0.5">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4">
        <div className="px-6">
          <Link href={`/post/${post.id}`}>
            <div className="cursor-pointer hover:text-muted-foreground">
              <div className="text-foreground">
                {shouldShowSeeMore && !isExpanded ? (
                  <MarkdownRenderer 
                    content={`${truncateMarkdown(hasUrls ? displayText : cleanContent, MAX_LENGTH)}...`}
                    className="prose-sm"
                  />
                ) : (
                  <MarkdownRenderer 
                    content={hasUrls ? displayText : cleanContent}
                    className="prose-sm"
                  />
                )}
              </div>
              {shouldShowSeeMore && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setIsExpanded(!isExpanded);
                  }}
                  className="text-primary hover:underline text-sm mt-1"
                >
                  {isExpanded ? "Show less" : "See more"}
                </button>
              )}
            </div>
          </Link>
        </div>

        {/* Post Images */}
        {post.images && post.images.length > 0 && (
          <div className="mt-3">
            {post.images.length === 1 ? (
              // Single image layout
              <div className="relative overflow-hidden rounded-lg">
                <Image
                  src={post.images[0]}
                  alt="Post image"
                  width={600}
                  height={400}
                  className="object-cover w-full cursor-pointer hover:opacity-90 transition-optimize"
                  style={{ aspectRatio: '3/2' }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleImageClick(0);
                  }}
                />
              </div>
            ) : (
              // Multiple images carousel layout
              <div className="relative overflow-hidden rounded-lg">
                <Image
                  src={post.images[currentImageIndex]}
                  alt={`Post image ${currentImageIndex + 1}`}
                  width={600}
                  height={400}
                  className="object-cover w-full cursor-pointer hover:opacity-90 transition-optimize"
                  style={{ aspectRatio: '3/2' }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleImageClick(currentImageIndex);
                  }}
                />
                
                {/* Navigation arrows */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-primary-foreground hover:text-primary-foreground hover:bg-primary bg-primary rounded-full h-8 w-8 transition-all duration-200"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    previousImage();
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-primary-foreground hover:text-primary-foreground hover:bg-primary bg-primary rounded-full h-8 w-8 transition-all duration-200"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    nextImage();
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                
                {/* Image counter */}
                <div className="absolute top-2 right-2 text-primary-foreground bg-primary px-2 py-1 rounded-full text-xs font-medium">
                  {currentImageIndex + 1} / {post.images.length}
                </div>
                
                {/* Dots indicator */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1">
                  {post.images.map((_, index) => (
                    <button
                      key={index}
                      className={`w-2 h-2 rounded-full transition-all duration-200 ${
                        index === currentImageIndex 
                          ? 'bg-primary scale-110' 
                          : 'bg-primary/50 hover:bg-primary/80'
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setCurrentImageIndex(index);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Link Previews */}
        {hasUrls && (
          <div className="space-y-2 px-6">
            {parsedContent.urls.slice(0, 2).map((url, index) => (
              <LinkPreview key={index} url={url} />
            ))}
          </div>
        )}
        
        {/* Hashtags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 px-6">
            {post.tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/hashtag/${tag.name}`}
                className="text-primary hover:text-primary/80 text-sm font-medium"
              >
                #{tag.name}
              </Link>
            ))}
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="pt-4 mt-4 border-t border-border px-6">
          {/* Standard actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1 sm:space-x-4 flex-shrink-0">
              <Button 
                variant="ghost" 
                size="sm" 
                className={`${isLiked ? "text-red-500 dark:text-red-400" : "text-muted-foreground"} hover:bg-red-500 hover:text-white`}
                onClick={handleLike}
                disabled={likeMutation.isPending || !session}
              >
                {likeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
                ) : (
                  <Heart className={`h-4 w-4 sm:mr-2 ${isLiked ? "fill-current" : ""}`} />
                )}
                <span className="hidden sm:inline">{optimisticLikeCount}</span>
                <span className="sm:hidden ml-1">{optimisticLikeCount}</span>
              </Button>
              
              <Link href={`/post/${post.id}`}>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:bg-blue-500 hover:text-white">
                  <MessageCircle className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">{post._count?.comments || 0}</span>
                  <span className="sm:hidden ml-1">{post._count?.comments || 0}</span>
                </Button>
              </Link>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className={`${isBookmarked ? "text-blue-500 dark:text-blue-400" : "text-muted-foreground"} hover:bg-blue-500 hover:text-white`}
                onClick={handleBookmark}
                disabled={bookmarkMutation.isPending || !session}
              >
                {bookmarkMutation.isPending ? (
                  <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
                ) : (
                  <Bookmark className={`h-4 w-4 sm:mr-2 ${isBookmarked ? "fill-current" : ""}`} />
                )}
                <span className="hidden sm:inline">{isBookmarked ? "Saved" : "Save"}</span>
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-muted-foreground hover:bg-green-500 hover:text-white"
                onClick={handleShare}
                disabled={shareMutation.isPending}
              >
                {shareMutation.isPending ? (
                  <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
                ) : (
                  <Share2 className="h-4 w-4 sm:mr-2" />
                )}
                <span className="hidden sm:inline">{shareMutation.isPending ? "Sharing..." : "Share"}</span>
              </Button>
            </div>
          </div>

          {/* News-specific links - stacked on mobile, inline on desktop */}
          {isNewsPost && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border/50 sm:border-t-0">
              <span className="text-xs text-muted-foreground mb-2 sm:mb-0">Source links:</span>
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                {sourceUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(sourceUrl, '_blank', 'noopener,noreferrer')}
                    className="text-primary border-primary hover:bg-primary hover:text-white flex-1 sm:flex-none"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Read Full Article
                  </Button>
                )}
                {sourceName && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-muted-foreground border-muted-foreground hover:bg-muted hover:text-foreground flex-1 sm:flex-none truncate"
                    disabled
                    title={sourceName}
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    <span className="truncate">{sourceName}</span>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {post.images && post.images.length > 0 && (
        <ImageModal
          images={post.images}
          initialIndex={selectedImageIndex}
          isOpen={imageModalOpen}
          onClose={() => setImageModalOpen(false)}
        />
      )}
    </div>
  );
}