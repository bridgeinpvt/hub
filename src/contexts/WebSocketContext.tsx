"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";

interface WebSocketContextType {
  socket: WebSocket | null;
  isConnected: boolean;
  subscribe: (event: string, handler: (data: any) => void) => () => void;
  emit: (event: string, data: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const { data: session } = useAuth();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const eventHandlers = useRef<Map<string, Set<(data: any) => void>>>(new Map());

  useEffect(() => {
    if (!session?.user?.id) return;

    // In a real implementation, you'd use a proper WebSocket server
    // For now, we'll simulate WebSocket with localStorage events for real-time updates
    const connectWebSocket = () => {
      try {
        // Simulate WebSocket connection
        const mockSocket = {
          readyState: 1, // OPEN
          send: (data: string) => {
            const message = JSON.parse(data);
            // Broadcast to other tabs/windows
            localStorage.setItem('ws-broadcast', JSON.stringify({
              ...message,
              timestamp: Date.now(),
              userId: session.user.id
            }));
            localStorage.removeItem('ws-broadcast');
          },
          close: () => {
            setIsConnected(false);
          }
        } as any;

        setSocket(mockSocket);
        setIsConnected(true);

        // Listen for localStorage changes (simulating WebSocket messages)
        const handleStorageChange = (event: StorageEvent) => {
          if (event.key === 'ws-broadcast' && event.newValue) {
            try {
              const message = JSON.parse(event.newValue);
              // Don't process messages from the same user
              if (message.userId !== session.user.id) {
                const handlers = eventHandlers.current.get(message.event);
                if (handlers) {
                  handlers.forEach(handler => handler(message.data));
                }
              }
            } catch (error) {
              logger.error('Error parsing WebSocket message:', error);
            }
          }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
          window.removeEventListener('storage', handleStorageChange);
        };
      } catch (error) {
        logger.error('WebSocket connection error:', error);
        setIsConnected(false);
      }
    };

    const cleanup = connectWebSocket();

    return () => {
      cleanup?.();
      setSocket(null);
      setIsConnected(false);
    };
  }, [session?.user?.id]);

  const subscribe = (event: string, handler: (data: any) => void) => {
    if (!eventHandlers.current.has(event)) {
      eventHandlers.current.set(event, new Set());
    }
    eventHandlers.current.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = eventHandlers.current.get(event);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          eventHandlers.current.delete(event);
        }
      }
    };
  };

  const emit = (event: string, data: any) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify({ event, data }));
    }
  };

  return (
    <WebSocketContext.Provider value={{ socket, isConnected, subscribe, emit }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
}

// Specific hooks for different real-time events
export function useRealTimeUpdates() {
  const { subscribe, emit } = useWebSocket();

  const subscribeToPostUpdates = (postId: string, onUpdate: (data: any) => void) => {
    return subscribe(`post:${postId}:update`, onUpdate);
  };

  const subscribeToNewComments = (postId: string, onComment: (data: any) => void) => {
    return subscribe(`post:${postId}:comment`, onComment);
  };

  const subscribeToNewMessages = (conversationId: string, onMessage: (data: any) => void) => {
    return subscribe(`conversation:${conversationId}:message`, onMessage);
  };

  const emitLike = (postId: string, isLiked: boolean, likesCount: number) => {
    emit(`post:${postId}:update`, { type: 'like', isLiked, likesCount });
  };

  const emitComment = (postId: string, comment: any) => {
    emit(`post:${postId}:comment`, comment);
  };

  const emitBookmark = (postId: string, isBookmarked: boolean) => {
    emit(`post:${postId}:update`, { type: 'bookmark', isBookmarked });
  };

  const emitMessage = (conversationId: string, message: any) => {
    emit(`conversation:${conversationId}:message`, message);
  };

  return {
    subscribeToPostUpdates,
    subscribeToNewComments,
    subscribeToNewMessages,
    emitLike,
    emitComment,
    emitBookmark,
    emitMessage,
  };
}
