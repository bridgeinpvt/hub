import { useCallback } from 'react';
import { api } from '@/trpc/react';

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  userId?: string;
}

export function useAnalytics() {
  const trackEventMutation = api.analytics.trackEvent.useMutation();

  const track = useCallback((event: string, properties?: Record<string, any>) => {
    trackEventMutation.mutate({
      event,
      properties: {
        timestamp: new Date().toISOString(),
        ...properties,
      },
    });
  }, [trackEventMutation]);

  const trackPageView = useCallback((page: string, additionalProperties?: Record<string, any>) => {
    track('page_view', {
      page,
      ...additionalProperties,
    });
  }, [track]);

  const trackPostEngagement = useCallback((postId: string, action: 'view' | 'like' | 'comment' | 'share') => {
    track('post_engagement', {
      postId,
      action,
    });
  }, [track]);

  const trackUserAction = useCallback((action: string, target?: string, additionalProperties?: Record<string, any>) => {
    track('user_action', {
      action,
      target,
      ...additionalProperties,
    });
  }, [track]);

  return {
    track,
    trackPageView,
    trackPostEngagement,
    trackUserAction,
    isLoading: trackEventMutation.isLoading,
  };
}