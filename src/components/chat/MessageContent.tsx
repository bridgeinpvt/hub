import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExternalLink } from "lucide-react";

interface MessageContentProps {
  content: string;
  className?: string;
  isOwnMessage?: boolean;
}

// Helper function to detect if URL should be truncated for display
function getTruncatedUrl(url: string, maxLength: number = 50): string {
  if (url.length <= maxLength) return url;
  const truncated = url.substring(0, maxLength - 3) + '...';
  return truncated;
}

// Helper function to strip markdown and get plain text preview
export function getPlainTextPreview(content: string, maxLength: number = 100): string {
  // Remove markdown formatting
  const plainText = content
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
    .replace(/\*([^*]+)\*/g, '$1') // Italic
    .replace(/_([^_]+)_/g, '$1') // Italic underscore
    .replace(/`([^`]+)`/g, '$1') // Inline code
    .replace(/```[\s\S]*?```/g, '[code]') // Code blocks
    .replace(/#{1,6}\s+([^\n]+)/g, '$1') // Headers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '[image]') // Images
    .replace(/^\s*[-*+]\s+/gm, '') // List items
    .replace(/^\s*\d+\.\s+/gm, '') // Numbered lists
    .replace(/>\s+/g, '') // Blockquotes
    .trim();

  return plainText.length > maxLength
    ? plainText.substring(0, maxLength) + '...'
    : plainText;
}

export function MessageContent({ content, className = "", isOwnMessage = false }: MessageContentProps) {
  // URL regex pattern for detecting links
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  // Check if content contains markdown patterns
  const hasMarkdown = /[*_`#\[\]!]/.test(content);

  // Dynamic link colors based on message type
  const linkColors = isOwnMessage
    ? "text-blue-200 hover:text-blue-100"
    : "text-blue-600 hover:text-blue-700";

  // If content has markdown patterns, use ReactMarkdown
  if (hasMarkdown) {
    return (
      <div className={`message-content overflow-hidden ${className}`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // Custom styling for markdown elements
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            em: ({ children }) => <em className="italic">{children}</em>,
            code: ({ children }) => (
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono border">
                {children}
              </code>
            ),
            pre: ({ children }) => (
              <pre className="bg-muted p-3 rounded-md text-xs font-mono overflow-x-auto my-2 border max-w-full">
                {children}
              </pre>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={`${linkColors} underline inline-flex items-baseline gap-1 break-words`}
              >
                <span className="break-words">{children}</span>
                <ExternalLink className="h-3 w-3 flex-shrink-0 ml-1 opacity-75" />
              </a>
            ),
            ul: ({ children }) => <ul className="list-disc list-inside my-2">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside my-2">{children}</ol>,
            li: ({ children }) => <li className="mb-1">{children}</li>,
            h1: ({ children }) => <h1 className="text-lg font-bold my-2">{children}</h1>,
            h2: ({ children }) => <h2 className="text-base font-bold my-2">{children}</h2>,
            h3: ({ children }) => <h3 className="text-sm font-bold my-2">{children}</h3>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/20 pl-3 py-2 my-2 italic rounded-r">
                {children}
              </blockquote>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  }

  // For plain text, just detect and make links clickable
  const parts = content.split(urlRegex);

  return (
    <span className={`message-content overflow-hidden ${className}`}>
      {parts.map((part, index) => {
        if (urlRegex.test(part)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className={`${linkColors} underline inline-flex items-baseline gap-1 break-words`}
            >
              <span className="break-words">{getTruncatedUrl(part, 60)}</span>
              <ExternalLink className="h-3 w-3 flex-shrink-0 ml-1 opacity-75" />
            </a>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}