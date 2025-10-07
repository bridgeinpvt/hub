"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "../../trpc/react";
import { Avatar } from "../ui/avatar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ChatModal } from "./ChatModal";
import { ConversationSkeleton } from "@/components/skeletons";
import { Plus, MessageSquare } from "lucide-react";
import { getPlainTextPreview } from "./MessageContent";
import { toast } from "sonner";

// Helper function to format message time
const formatMessageTime = (date: string | Date) => {
  const messageDate = new Date(date);
  const now = new Date();
  const diffInHours = Math.abs(now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);
  
  if (diffInHours < 24) {
    return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffInHours < 168) { // 7 days
    return messageDate.toLocaleDateString([], { weekday: 'short' });
  } else {
    return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
};

interface ConversationListProps {
  selectedConversation: string | null;
  onSelectConversation: (id: string) => void;
}

export function ConversationList({
  selectedConversation,
  onSelectConversation
}: ConversationListProps) {
  const { data: session } = useAuth();
  const utils = api.useUtils();
  const { data: conversations, isLoading, refetch } = api.chat.getConversations.useQuery(undefined, {
    refetchInterval: 10000 // Refetch conversations every 10 seconds to ensure proper ordering
  });
  const { data: unreadCounts } = api.chat.getUnreadCounts.useQuery(undefined, {
    refetchInterval: 5000 // Check for new messages every 5 seconds
  });
  const markAsReadMutation = api.chat.markConversationAsRead.useMutation({
    onSuccess: () => {
      // Refresh unread counts when messages are marked as read
      utils.chat.getUnreadCounts.invalidate();
    },
  });
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);

  // Track previous unread counts to detect new messages
  const prevUnreadCountsRef = useRef<Record<string, number>>({});

  // Show toast notification for new messages
  useEffect(() => {
    if (!unreadCounts || !conversations) return;

    const prevCounts = prevUnreadCountsRef.current;

    // Check for new messages
    Object.entries(unreadCounts).forEach(([conversationId, currentCount]) => {
      const prevCount = prevCounts[conversationId] || 0;

      if (currentCount > prevCount && prevCount !== undefined) {
        // Refresh conversations to ensure proper ordering
        refetch();
        // Also invalidate the query cache for immediate update
        utils.chat.getConversations.invalidate();

        // Find the conversation details
        const conversation = conversations.find(conv => conv.id === conversationId);
        if (conversation) {
          const otherParticipant = conversation.participants?.find(p => p.userId !== session?.user?.id)?.user;
          const senderName = otherParticipant?.name || "Someone";

          // Show toast notification
          toast.info(`New message from ${senderName}`, {
            description: conversation.lastMessage?.content
              ? getPlainTextPreview(conversation.lastMessage.content, 60)
              : "New message received",
            duration: 4000,
            action: {
              label: "View",
              onClick: () => onSelectConversation(conversationId)
            }
          });
        }
      }
    });

    // Update the ref with current counts
    prevUnreadCountsRef.current = { ...unreadCounts };
  }, [unreadCounts, conversations, session?.user?.id, onSelectConversation]);

  const handleChatStarted = (conversationId: string) => {
    refetch(); // Refresh conversations list
    onSelectConversation(conversationId); // Open the new conversation
  };

  const handleSelectConversation = async (conversationId: string) => {
    onSelectConversation(conversationId);

    // Mark conversation as read if it has unread messages
    if (unreadCounts?.[conversationId] && unreadCounts[conversationId] > 0) {
      await markAsReadMutation.mutateAsync({ conversationId });
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-3 py-3 md:p-4 border-b border-border flex-shrink-0 bg-background relative z-10">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg md:text-xl font-bold text-foreground truncate flex-1 min-w-0">Messages</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsNewChatModalOpen(true)}
            className="flex items-center justify-center h-9 w-9 md:h-auto md:w-auto md:px-3 md:py-2 p-0 flex-shrink-0 bg-primary text-white hover:bg-primary/90 md:bg-transparent md:text-foreground md:hover:bg-muted border-primary md:border-border"
          >
            <Plus className="h-4 w-4 md:h-4 md:w-4 flex-shrink-0" />
            <span className="hidden md:inline text-sm ml-2">New</span>
          </Button>
        </div>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="space-y-0">
              {[...Array(5)].map((_, i) => (
                <ConversationSkeleton key={i} />
              ))}
            </div>
          ) : conversations?.length ? (
          <div className="divide-y divide-border">
            {conversations.map((conversation) => {
              // Find the other participant (not the current user)
              const currentUserId = session?.user?.id;
              const otherParticipant = conversation.participants?.find(p => p.userId !== currentUserId)?.user;
              const lastMessage = conversation.messages?.[0]; // Latest message
              const isSelected = selectedConversation === conversation.id;
              const unreadCount = unreadCounts?.[conversation.id] || 0;

              return (
                <div
                  key={conversation.id}
                  className={`px-3 py-3 md:p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                    isSelected ? "bg-muted md:border-r-2 md:border-primary" : ""
                  }`}
                  onClick={() => handleSelectConversation(conversation.id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative flex-shrink-0">
                      <Avatar className="w-12 h-12 md:w-14 md:h-14 border-2 border-background">
                        <img
                          src={
                            otherParticipant?.image ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              otherParticipant?.name || "User"
                            )}&background=6366f1&color=fff`
                          }
                          alt={otherParticipant?.name || "User"}
                          className="w-full h-full object-cover"
                        />
                      </Avatar>
                      {/* Online indicator */}
                      <div className="absolute bottom-0 right-0 w-3 h-3 md:w-4 md:h-4 bg-emerald-500 dark:bg-emerald-400 border-2 border-background rounded-full"></div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm md:text-sm font-semibold text-foreground truncate pr-2">
                          {conversation.type === "direct"
                            ? otherParticipant?.name || "Unknown User"
                            : conversation.name || "Group Chat"}
                        </h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {lastMessage && (
                            <span className="text-xs text-muted-foreground">
                              {formatMessageTime(lastMessage.createdAt)}
                            </span>
                          )}
                          {unreadCount > 0 && (
                            <Badge className="bg-primary text-primary-foreground min-w-[20px] h-5 text-xs px-1.5 rounded-full flex-shrink-0">
                              {unreadCount > 99 ? "99+" : unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {lastMessage ? (
                        <p className="text-xs md:text-sm text-muted-foreground truncate">
                          {lastMessage.sender.id === currentUserId ? "You: " : ""}
                          {getPlainTextPreview(lastMessage.content, 35)}
                        </p>
                      ) : (
                        <p className="text-xs md:text-sm text-muted-foreground italic">No messages yet</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 md:p-6 text-center">
            <div className="py-8 md:py-12 text-muted-foreground">
              <MessageSquare className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 text-muted-foreground" />
              <h3 className="text-base md:text-lg font-semibold text-foreground mb-2">No messages yet</h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                Start chatting with friends and community members
              </p>
            </div>
          </div>
          )}
      </div>

      {/* Chat Modal */}
      <ChatModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
        onChatStarted={handleChatStarted}
      />
    </div>
  );
}