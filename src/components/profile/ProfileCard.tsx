import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Settings, MapPin, Calendar, Briefcase, MessageCircle, UserPlus, UserMinus } from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";

interface ProfileCardProps {
  user: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
    bio?: string | null;
    location?: string | null;
    userRole?: string | null;
    createdAt?: Date;
  };
}

export function ProfileCard({ user }: ProfileCardProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const utils = api.useUtils();
  const isOwnProfile = session?.user?.id === user.id;
  const [isFollowing, setIsFollowing] = useState(false);

  // Check if current user is following this user
  const { data: followStatus } = api.user.isFollowing.useQuery(
    { userId: user.id },
    { enabled: !isOwnProfile && !!session }
  );


  // Follow/unfollow mutation
  const followMutation = api.user.toggleFollow.useMutation({
    onSuccess: (data) => {
      setIsFollowing(data.following);
      toast.success(data.following ? 
        `Now following ${user.name || user.username}!` : 
        `Unfollowed ${user.name || user.username}`
      );
      // Refetch user data to update counts
      if (user.username) {
        utils.user.getByUsername.invalidate({ username: user.username });
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update follow status");
    },
  });

  React.useEffect(() => {
    if (followStatus) {
      setIsFollowing(followStatus.isFollowing);
    }
  }, [followStatus]);

  const getRoleDisplayName = (role: string | null) => {
    if (!role || role === "USER") return null;
    return role.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleEditProfile = () => {
    router.push("/settings");
  };

  const handleFollow = () => {
    if (!session) {
      toast.error("Please login to follow users");
      return;
    }
    followMutation.mutate({ userId: user.id });
  };

  const startConversationMutation = api.chat.startConversation.useMutation({
    onSuccess: (conversationId) => {
      toast.success("Starting conversation...");
      // Redirect to the conversation
      router.push(`/messages?conversation=${conversationId}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to start conversation");
    },
  });

  const handleMessage = () => {
    if (!session) {
      toast.error("Please login to send messages");
      return;
    }

    // Start conversation directly
    startConversationMutation.mutate({
      participantId: user.id,
      message: "Hi! I'd like to connect with you.",
    });
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
            <Avatar className="h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0">
              <AvatarImage src={user.image || undefined} />
              <AvatarFallback className="text-base sm:text-lg">
                {user.name?.[0] || user.username?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold truncate">
                {user.name || user.username || "Unknown User"}
              </h1>
              {user.username && (
                <p className="text-muted-foreground text-sm sm:text-base truncate">@{user.username}</p>
              )}
              {user.userRole && getRoleDisplayName(user.userRole) && (
                <div className="flex items-center mt-1 text-xs sm:text-sm text-muted-foreground">
                  <Briefcase className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                  <span className="truncate">{getRoleDisplayName(user.userRole)}</span>
                </div>
              )}
            </div>
          </div>
          
          {isOwnProfile && (
            <Button variant="outline" size="sm" onClick={handleEditProfile} className="w-full sm:w-auto">
              <Settings className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Manage Profile</span>
              <span className="sm:hidden">Manage</span>
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {user.bio && (
          <p className="text-foreground">{user.bio}</p>
        )}
        
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
          {user.location && (
            <div className="flex items-center min-w-0">
              <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
              <span className="truncate">{user.location}</span>
            </div>
          )}
          {user.createdAt && (
            <div className="flex items-center">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
              <span>Joined {new Date(user.createdAt).toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
              })}</span>
            </div>
          )}
        </div>
        
        {!isOwnProfile && (
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button 
              onClick={handleFollow}
              disabled={followMutation.isPending}
              variant={isFollowing ? "outline" : "default"}
              className="flex-1 sm:flex-none"
            >
              {followMutation.isPending ? (
                "Loading..."
              ) : isFollowing ? (
                <>
                  <UserMinus className="h-4 w-4 mr-2" />
                  Unfollow
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Follow
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleMessage}
              disabled={startConversationMutation.isPending}
              className="flex-1 sm:flex-none"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              {startConversationMutation.isPending ? "Starting..." : "Message"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}