// GA4 Analytics utility functions with conversion tracking

declare global {
  interface Window {
    gtag: (command: string, targetId: string, config?: any) => void;
    dataLayer: any[];
  }
}

export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_TRACKING_ID;

// Initialize gtag if not already present
export const initializeGtag = () => {
  if (typeof window !== 'undefined' && !window.gtag) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() {
      window.dataLayer.push(arguments);
    };
  }
};

// GA4 Recommended Events for Social Media App
export const trackEvent = (eventName: string, parameters?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.gtag && GA_TRACKING_ID) {
    window.gtag('event', eventName, {
      ...parameters,
      timestamp: new Date().toISOString()
    });
  }
};

// Conversion Events - Mark as conversions in GA4
export const trackConversion = (conversionName: string, value?: number, currency = 'USD') => {
  trackEvent(conversionName, {
    currency,
    value: value || 1,
    conversion: true
  });
};

// User Engagement Events
export const trackUserEngagement = {
  // Post interactions
  likePost: (postId: string, userId?: string) => {
    trackEvent('like_post', {
      content_type: 'post',
      item_id: postId,
      engagement_type: 'like',
      user_id: userId
    });
    // Track as conversion for engaged users
    trackConversion('post_engagement');
  },

  sharePost: (postId: string, method: 'native' | 'clipboard', userId?: string) => {
    trackEvent('share', {
      method,
      content_type: 'post',
      item_id: postId,
      user_id: userId
    });
    trackConversion('content_share');
  },

  commentPost: (postId: string, userId?: string) => {
    trackEvent('comment_post', {
      content_type: 'post',
      item_id: postId,
      engagement_type: 'comment',
      user_id: userId
    });
    trackConversion('post_engagement');
  },

  bookmarkPost: (postId: string, action: 'add' | 'remove', userId?: string) => {
    trackEvent('bookmark_post', {
      content_type: 'post',
      item_id: postId,
      action,
      user_id: userId
    });
    if (action === 'add') {
      trackConversion('content_save');
    }
  },

  // User journey events
  signUp: (method: string, userId: string) => {
    trackEvent('sign_up', {
      method,
      user_id: userId
    });
    trackConversion('user_registration', 10); // Assign value to registration
  },

  login: (method: string, userId: string) => {
    trackEvent('login', {
      method,
      user_id: userId
    });
  },

  // Content creation events
  createPost: (postId: string, contentType: 'text' | 'image' | 'mixed', userId?: string) => {
    trackEvent('create_content', {
      content_type: 'post',
      item_id: postId,
      content_format: contentType,
      user_id: userId
    });
    trackConversion('content_creation', 5); // Value for content creation
  },

  // Search and discovery
  search: (query: string, category: 'posts' | 'users' | 'news', resultsCount: number) => {
    trackEvent('search', {
      search_term: query,
      category,
      results_count: resultsCount
    });
  },

  viewProfile: (profileUserId: string, viewerUserId?: string) => {
    trackEvent('view_profile', {
      content_type: 'profile',
      item_id: profileUserId,
      user_id: viewerUserId
    });
  },

  // Navigation and page views
  pageView: (page: string, userId?: string) => {
    trackEvent('page_view', {
      page_location: window.location.href,
      page_title: document.title,
      page_name: page,
      user_id: userId
    });
  }
};

// Enhanced UTM and Campaign Tracking
export const trackCampaign = (utmParams: Record<string, string | null>) => {
  const validParams = Object.entries(utmParams).reduce((acc, [key, value]) => {
    if (value) acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  if (Object.keys(validParams).length > 0) {
    trackEvent('campaign_view', {
      ...validParams,
      timestamp: new Date().toISOString()
    });
  }
};

// Custom dimensions for user segmentation
export const setUserProperties = (userId: string, properties: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.gtag && GA_TRACKING_ID) {
    window.gtag('config', GA_TRACKING_ID, {
      user_id: userId,
      custom_map: properties
    });
  }
};

// Audience building helpers
export const trackUserSegment = (segment: string, userId?: string) => {
  trackEvent('user_segment', {
    segment_name: segment,
    user_id: userId
  });
};

// E-commerce style events for social engagement
export const trackSocialEcommerce = {
  viewContent: (contentId: string, contentType: 'post' | 'profile' | 'hashtag', value?: number) => {
    trackEvent('view_item', {
      item_id: contentId,
      item_name: contentType,
      item_category: 'social_content',
      value: value || 1
    });
  },

  selectContent: (contentId: string, contentType: string) => {
    trackEvent('select_content', {
      content_type: contentType,
      item_id: contentId
    });
  }
};

export default {
  trackEvent,
  trackConversion,
  trackUserEngagement,
  trackCampaign,
  setUserProperties,
  trackUserSegment,
  trackSocialEcommerce
};