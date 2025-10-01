"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { api } from "../../trpc/react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Avatar } from "../ui/avatar";
import { useRealTimeUpdates } from "@/contexts/WebSocketContext";
import { Send, MoreVertical, Phone, Video } from "lucide-react";
import Image from "next/image";
import { MessageContent } from "./MessageContent";

interface ChatWindowProps {
  conversationId: string;
}

export function ChatWindow({ conversationId }: ChatWindowProps) {
  const { data: session } = useSession();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUserId = session?.user?.id;
  const { subscribeToNewMessages, emitMessage } = useRealTimeUpdates();
  
  const { data: messages, refetch, isLoading } = api.chat.getMessages.useQuery({
    conversationId,
    limit: 50,
  });

  const { data: conversations } = api.chat.getConversations.useQuery();
  const conversation = conversations?.find(c => c.id === conversationId);
  const otherParticipant = conversation?.participants?.find(p => p.userId !== currentUserId)?.user;

  
  const { mutate: sendMessage, isPending: isSending } = api.chat.sendMessage.useMutation({
    onSuccess: (newMessage) => {
      setMessage("");
      // Emit real-time message to other users
      emitMessage(conversationId, newMessage);
      refetch();
    },
  });


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!session) return;

    const unsubscribe = subscribeToNewMessages(conversationId, (newMessage) => {
      // Only refetch if the message is from another user
      if (newMessage.sender.id !== currentUserId) {
        refetch();
      }
    });

    return unsubscribe;
  }, [conversationId, session, currentUserId, subscribeToNewMessages, refetch]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    sendMessage({
      conversationId,
      content: message.trim(),
    });
  };



  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Chat Header - Mobile optimized */}
      <div className="bg-background border-b border-border px-3 py-2 md:p-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-2 md:space-x-3 min-w-0 flex-1">
          <div className="relative flex-shrink-0">
            <Avatar className="w-8 h-8 md:w-10 md:h-10">
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
            <div className="absolute bottom-0 right-0 w-2 h-2 md:w-3 md:h-3 bg-green-500 border-2 border-background rounded-full"></div>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground truncate">
              {otherParticipant?.name || "Unknown User"}
            </h3>
            <p className="text-xs text-muted-foreground hidden md:block">Active now</p>
          </div>
        </div>
        <div className="flex items-center space-x-1 flex-shrink-0">
          <Button variant="ghost" size="sm" className="h-8 w-8 md:h-9 md:w-9 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-3 py-2 md:p-4 space-y-2 md:space-y-3 min-h-0">
        {messages?.length ? (
          messages.map((msg, index) => {
            const isOwn = msg.sender.id === currentUserId;
            const showAvatar = !isOwn && (index === 0 || messages[index - 1]?.sender.id !== msg.sender.id);

            return (
              <div
                key={msg.id}
                className={`flex items-end space-x-2 ${isOwn ? "justify-end" : "justify-start"}`}
              >
                {!isOwn && showAvatar && (
                  <Avatar className="w-5 h-5 md:w-6 md:h-6 mb-1 flex-shrink-0">
                    <img
                      src={msg.sender.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender.name || "U")}&size=24`}
                      alt={msg.sender.name || "User"}
                      className="w-full h-full object-cover"
                    />
                  </Avatar>
                )}
                {!isOwn && !showAvatar && <div className="w-5 md:w-6 flex-shrink-0" />}

                <div className={`max-w-[85%] md:max-w-[80%] ${isOwn ? "order-1" : "order-2"}`}>
                  <div
                    className={`rounded-2xl px-3 py-2 md:px-4 md:py-2 ${
                      isOwn
                        ? "bg-primary text-white rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    }`}
                  >
                    <MessageContent
                      content={msg.content}
                      className="text-xs md:text-sm leading-relaxed"
                    />
                  </div>
                  <div className={`text-xs text-muted-foreground mt-1 px-1 ${isOwn ? "text-right" : "text-left"}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-4">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                <Send className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1">No messages yet</h3>
              <p className="text-xs text-muted-foreground">
                Start the conversation!
              </p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message Input */}
      <div className="bg-background border-t border-border px-3 py-2 md:p-4 flex-shrink-0 safe-bottom">
        <form onSubmit={handleSendMessage} className="flex items-end space-x-2 md:space-x-3">
          <div className="flex-1 relative">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message..."
              disabled={isSending}
              className="rounded-full border-border bg-muted px-3 py-2 md:px-4 md:py-3 pr-12 resize-none min-h-0 focus:ring-1 focus:ring-primary text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
          </div>
          <Button
            type="submit"
            disabled={isSending || !message.trim()}
            size="sm"
            className="h-9 w-9 md:h-10 md:w-10 rounded-full p-0 flex-shrink-0 bg-primary hover:bg-primary/90 text-white"
          >
            <Send className="h-3 w-3 md:h-4 md:w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}