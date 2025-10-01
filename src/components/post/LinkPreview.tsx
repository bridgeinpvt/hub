import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

interface LinkPreviewProps {
  url: string;
}

interface LinkMetadata {
  title?: string;
  description?: string;
  image?: string;
  domain?: string;
}

export function LinkPreview({ url }: LinkPreviewProps) {
  // For now, we'll simulate link metadata - in a real app you'd fetch this from an API
  const getSimulatedMetadata = (url: string): LinkMetadata => {
    const domain = new URL(url).hostname.replace(/^www\./, '');
    
    // Simulate different preview types based on domain
    if (domain.includes('github.com')) {
      return {
        title: "GitHub Repository",
        description: "Build software better, together. Contribute to open source projects.",
        image: "https://github.githubassets.com/images/modules/site/social-cards/github-social.png",
        domain: "github.com"
      };
    } else if (domain.includes('twitter.com') || domain.includes('x.com')) {
      return {
        title: "Post on X",
        description: "See what's happening in the world right now.",
        image: "/api/placeholder/400/200",
        domain: "x.com"
      };
    } else if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
      return {
        title: "Video on YouTube",
        description: "Watch this video on YouTube",
        image: "/api/placeholder/400/225",
        domain: "youtube.com"
      };
    } else {
      return {
        title: "Shared Link",
        description: "Check out this link",
        domain: domain
      };
    }
  };

  const metadata = getSimulatedMetadata(url);

  return (
    <Card className="mt-3 overflow-hidden border border-border hover:bg-muted/50 transition-colors">
      <CardContent className="p-0">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <div className="flex">
            {metadata.image && (
              <div className="w-32 h-20 flex-shrink-0">
                <img
                  src={metadata.image}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
            )}
            <div className="flex-1 p-3 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-foreground line-clamp-2">
                    {metadata.title || "Shared Link"}
                  </h4>
                  {metadata.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {metadata.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1 flex items-center">
                    {metadata.domain}
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </p>
                </div>
              </div>
            </div>
          </div>
        </a>
      </CardContent>
    </Card>
  );
}