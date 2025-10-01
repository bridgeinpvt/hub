"use client";

import React, { useState } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Search, MessageCircle, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserListSkeleton } from "@/components/skeletons";

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChatStarted: (conversationId: string) => void;
}

interface User {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
}

export function ChatModal({ isOpen, onClose, onChatStarted }: ChatModalProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: followers, isLoading: followersLoading } = api.user.getFollowers.useQuery(
    { limit: 50 },
    { enabled: isOpen }
  );

  const { data: following, isLoading: followingLoading } = api.user.getFollowing.useQuery(
    { limit: 50 },
    { enabled: isOpen }
  );

  const startConversationMutation = api.chat.startConversation.useMutation({
    onSuccess: (conversationId: string) => {
      onChatStarted(conversationId);
      onClose();
      setSelectedUser(null);
      setMessage("");
      setSearchQuery("");
    },
  });

  const handleStartChat = () => {
    if (!selectedUser) return;
    
    startConversationMutation.mutate({
      participantId: selectedUser.id,
      message: message.trim() || undefined,
    });
  };

  const getAllUsers = () => {
    const allUsers = [...(followers || []), ...(following || [])];
    // Remove duplicates based on user ID
    const uniqueUsers = allUsers.filter((user, index, array) =>
      array.findIndex(u => u.id === user.id) === index
    );
    return uniqueUsers;
  };

  const filterUsers = (users: User[] | undefined) => {
    if (!users) return [];

    if (!searchQuery) return users;

    return users.filter(user =>
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const UserList = ({ users, loading, title }: { users: User[] | undefined, loading: boolean, title: string }) => (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground px-2">{title}</h3>
      {loading ? (
        <UserListSkeleton count={3} />
      ) : filterUsers(users)?.length > 0 ? (
        <div className="space-y-1">
          {filterUsers(users)?.map((user) => (
            <div
              key={user.id}
              className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                selectedUser?.id === user.id
                  ? "bg-primary/10 border border-primary/20"
                  : ""
              }`}
              onClick={() => setSelectedUser(user)}
            >
              <Avatar className="w-10 h-10">
                <img
                  src={
                    user.image ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name || user.username || "U")}`
                  }
                  alt={user.name || user.username || "User"}
                  className="w-full h-full object-cover rounded-full"
                />
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground truncate">
                  {user.name || user.username}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  @{user.username}
                </p>
              </div>
              {selectedUser?.id === user.id && (
                <MessageCircle className="w-4 h-4 text-blue-600" />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm">No {title.toLowerCase()} found</p>
        </div>
      )}
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <Card className="relative w-full max-w-2xl max-h-[80vh] overflow-hidden bg-background border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <span>Start New Chat</span>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* User Lists */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">
                All ({getAllUsers().length})
              </TabsTrigger>
              <TabsTrigger value="followers">
                Followers ({followers?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="following">
                Following ({following?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="max-h-64 overflow-y-auto">
              <UserList users={getAllUsers()} loading={followersLoading || followingLoading} title="All Users" />
            </TabsContent>

            <TabsContent value="followers" className="max-h-64 overflow-y-auto">
              <UserList users={followers} loading={followersLoading} title="Followers" />
            </TabsContent>

            <TabsContent value="following" className="max-h-64 overflow-y-auto">
              <UserList users={following} loading={followingLoading} title="Following" />
            </TabsContent>
          </Tabs>

          {/* Selected User & Message */}
          {selectedUser && (
            <div className="border-t pt-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Message (optional)
                </label>
                <Textarea
                  placeholder="Type your message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleStartChat}
              disabled={!selectedUser || startConversationMutation.isPending}
            >
              {startConversationMutation.isPending ? "Starting..." : "Start Chat"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}