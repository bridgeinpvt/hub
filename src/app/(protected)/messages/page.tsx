"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { MessageSquare, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MessagesPage() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const searchParams = useSearchParams();

  // Handle URL parameters
  useEffect(() => {
    const conversationId = searchParams.get('conversation');
    if (conversationId) {
      setSelectedConversation(conversationId);
    }
  }, [searchParams]);

  const handleBackToList = () => {
    setSelectedConversation(null);
  };

  return (
    <div className="h-[100dvh] md:h-[calc(100vh-8rem)] bg-background flex overflow-hidden">
      {/* Mobile: Full screen conversation list or chat */}
      <div className="flex-1 md:hidden">
        {selectedConversation ? (
          <div className="h-full flex flex-col">
            {/* Mobile chat header with back button */}
            <div className="bg-background border-b border-border px-3 py-2 flex items-center flex-shrink-0 safe-top">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToList}
                className="mr-2 h-8 w-8 p-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-base font-semibold text-foreground truncate">Chat</h2>
            </div>
            <div className="flex-1 min-h-0">
              <ChatWindow conversationId={selectedConversation} />
            </div>
          </div>
        ) : (
          <div className="h-full">
            <ConversationList
              selectedConversation={selectedConversation}
              onSelectConversation={setSelectedConversation}
            />
          </div>
        )}
      </div>

      {/* Desktop: Side-by-side layout */}
      <div className="hidden md:flex w-full min-h-0">
        {/* Sidebar - Conversations List */}
        <div className="w-80 lg:w-96 border-r border-border flex-shrink-0">
          <ConversationList
            selectedConversation={selectedConversation}
            onSelectConversation={setSelectedConversation}
          />
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 min-w-0">
          {selectedConversation ? (
            <ChatWindow conversationId={selectedConversation} />
          ) : (
            <div className="h-full flex items-center justify-center bg-background">
              <div className="text-center max-w-md mx-auto p-4 md:p-8">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                  <MessageSquare className="h-8 w-8 md:h-10 md:w-10 text-muted-foreground" />
                </div>
                <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-2 md:mb-3">Welcome to Messages</h2>
                <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
                  Connect with your community and support your customers.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}