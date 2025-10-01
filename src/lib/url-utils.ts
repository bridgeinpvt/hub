// URL detection and parsing utilities

export interface ParsedContent {
  text: string;
  urls: string[];
}

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

/**
 * Extract URLs from text content
 */
export function extractUrls(text: string): string[] {
  const matches = text.match(URL_REGEX);
  return matches ? matches.map(url => url.replace(/[.,;!?]+$/, '')) : [];
}

/**
 * Parse content to separate text and URLs
 */
export function parsePostContent(content: string): ParsedContent {
  const urls = extractUrls(content);
  
  // Remove URLs from text for display
  let textWithoutUrls = content;
  urls.forEach(url => {
    textWithoutUrls = textWithoutUrls.replace(url, '').trim();
  });
  
  return {
    text: textWithoutUrls,
    urls: urls
  };
}

/**
 * Check if a string is a valid URL
 */
export function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format URL for display (remove protocol, www, etc.)
 */
export function formatUrlForDisplay(url: string): string {
  try {
    const urlObj = new URL(url);
    let hostname = urlObj.hostname;
    
    // Remove www. prefix
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }
    
    return hostname;
  } catch {
    return url;
  }
}