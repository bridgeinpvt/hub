import { Metadata } from 'next';

interface SEOConfig {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

const DEFAULT_SEO = {
  title: 'Nocage - Connect, Share, Discover',
  description: 'Join Nocage to connect with creators, discover amazing digital products, and share your passion with a vibrant community.',
  keywords: [
    'social network',
    'digital products',
    'creators',
    'freelancers',
    'community',
    'capsules',
    'marketplace',
    'networking'
  ],
  image: '/og-image.png',
  url: 'https://nocage.com',
  type: 'website' as const
};

export function generateSEO(config: SEOConfig = {}): Metadata {
  const {
    title,
    description = DEFAULT_SEO.description,
    keywords = DEFAULT_SEO.keywords,
    image = DEFAULT_SEO.image,
    url = DEFAULT_SEO.url,
    type = DEFAULT_SEO.type,
    author,
    publishedTime,
    modifiedTime
  } = config;

  const fullTitle = title 
    ? `${title} | Nocage`
    : DEFAULT_SEO.title;

  return {
    title: fullTitle,
    description,
    keywords: keywords.join(', '),
    
    // Open Graph
    openGraph: {
      title: fullTitle,
      description,
      url,
      type,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: fullTitle
        }
      ],
      siteName: 'Nocage',
      locale: 'en_US',
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
      ...(author && { authors: [author] })
    },

    // Twitter
    twitter: {
      card: 'summary_large_image',
      site: '@nocage',
      creator: author ? `@${author}` : '@nocage',
      title: fullTitle,
      description,
      images: [image]
    },

    // Additional metadata
    metadataBase: new URL(url),
    alternates: {
      canonical: url,
    },
    
    // Robots
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },

    // Verification
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION,
      yandex: process.env.YANDEX_VERIFICATION,
    },

    // App-specific
    category: 'Social Network',
    classification: 'Business',
    
    // Additional tags
    other: {
      'application-name': 'Nocage',
      'apple-mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'default',
      'apple-mobile-web-app-title': 'Nocage',
      'format-detection': 'telephone=no',
      'mobile-web-app-capable': 'yes',
      'theme-color': '#6D28D9',
      'msapplication-TileColor': '#6D28D9',
    }
  };
}

// Page-specific SEO configurations
export const pageSEO = {
  home: {
    title: 'Home',
    description: 'Discover amazing content, connect with creators, and explore digital products on your personalized Nocage feed.',
    keywords: ['home', 'feed', 'posts', 'discover']
  },
  
  explore: {
    title: 'Explore',
    description: 'Explore trending content, discover new creators, and find exciting digital products on Nocage.',
    keywords: ['explore', 'trending', 'discover', 'popular']
  },
  
  capsules: {
    title: 'Capsules',
    description: 'Browse and purchase amazing digital products created by talented creators in the Nocage marketplace.',
    keywords: ['capsules', 'digital products', 'marketplace', 'buy', 'sell']
  },
  
  messages: {
    title: 'Messages',
    description: 'Connect and chat with other creators, freelancers, and community members on Nocage.',
    keywords: ['messages', 'chat', 'connect', 'community']
  },
  
  profile: (username?: string) => ({
    title: username ? `${username}'s Profile` : 'Profile',
    description: username 
      ? `View ${username}'s profile, posts, and digital products on Nocage.`
      : 'View and edit your Nocage profile.',
    keywords: ['profile', 'user', 'posts', 'creator']
  }),
  
  post: () => ({
    title: 'Post',
    description: 'View this post and join the conversation on Nocage.',
    keywords: ['post', 'discussion', 'community'],
    type: 'article' as const
  }),
  
  login: {
    title: 'Login',
    description: 'Login to your Nocage account to connect with creators and discover amazing digital products.',
    keywords: ['login', 'signin', 'auth'],
    robots: { index: false, follow: true }
  },
  
  signup: {
    title: 'Sign Up',
    description: 'Join Nocage today to connect with creators, discover digital products, and build your community.',
    keywords: ['signup', 'register', 'join', 'create account'],
  },
  
  settings: {
    title: 'Settings',
    description: 'Manage your Nocage account settings, privacy, and preferences.',
    keywords: ['settings', 'preferences', 'account', 'privacy'],
    robots: { index: false, follow: false }
  },
  
  notifications: {
    title: 'Notifications',
    description: 'View your latest notifications and stay updated with your Nocage community.',
    keywords: ['notifications', 'updates', 'activity'],
    robots: { index: false, follow: false }
  },
  
  referrals: {
    title: 'Referrals',
    description: 'Invite friends to Nocage and earn rewards through our referral program.',
    keywords: ['referrals', 'invite', 'rewards', 'friends'],
    robots: { index: false, follow: false }
  }
};