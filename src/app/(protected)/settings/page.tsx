"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/toaster";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUpload } from "@/components/ui/file-upload";
import { useProfilePictureUpload } from "@/hooks/useFileUpload";
import { LocationSelector } from "@/components/ui/location-selector";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useTheme } from "next-themes";
import { User, Lock, Bell, Palette, Check } from "lucide-react";

type UserRole = "USER" | "STARTUP_FOUNDER" | "FREELANCER" | "CREATOR" | "ANGEL_INVESTOR";

export default function SettingsPage() {
  const { data: session } = useSession();
  const { addToast } = useToast();
  const { theme, setTheme } = useTheme();

  const { data: currentUser, refetch } = api.user.getCurrentUser.useQuery(
    undefined,
    { enabled: !!session?.user?.id }
  );
  
  // Profile picture upload hook
  const {
    uploadFile: uploadProfilePicture,
    isUploading: isUploadingProfilePicture,
    uploadProgress: profilePictureProgress
  } = useProfilePictureUpload();
  
  
  const [formData, setFormData] = useState({
    name: currentUser?.name || "",
    username: currentUser?.username || "",
    bio: currentUser?.bio || "",
    location: currentUser?.location || "",
    userRole: (currentUser?.userRole || "USER") as UserRole,
    image: currentUser?.image || "",
  });

  const updateProfileMutation = api.user.updateProfile.useMutation({
    onSuccess: () => {
      addToast({
        title: "Success!",
        description: "Your profile has been updated.",
        variant: "success",
      });
      refetch();
    },
    onError: (error) => {
      addToast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "error",
      });
    },
  });

  const deleteAccountMutation = api.user.deleteAccount.useMutation({
    onSuccess: () => {
      addToast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
        variant: "success",
      });
      // Redirect to home or login page
      window.location.href = "/";
    },
    onError: (error: any) => {
      addToast({
        title: "Error",
        description: error.message || "Failed to delete account",
        variant: "error",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      name: formData.name,
      username: formData.username,
      bio: formData.bio,
      location: formData.location,
      userRole: formData.userRole,
      image: formData.image,
    };
    updateProfileMutation.mutate(submitData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };


  const handleProfilePictureUpload = async (imageUrl: string, fileId: string) => {
    // Update the form data immediately for UI feedback
    setFormData(prev => ({
      ...prev,
      image: imageUrl
    }));
  };

  // Update form data when user data loads
  React.useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name || "",
        username: currentUser.username || "",
        bio: currentUser.bio || "",
        location: currentUser.location || "",
        userRole: (currentUser.userRole || "USER") as UserRole,
        image: currentUser.image || "",
      });
    }
  }, [currentUser]);

  if (!session) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please login to access settings.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground text-lg">Manage your account settings and preferences</p>
        </div>
        <ThemeToggle />
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Account
          </TabsTrigger>
          <TabsTrigger value="theme" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Theme
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture */}
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={formData.image || undefined} />
                  <AvatarFallback className="text-lg">
                    {formData.name?.[0] || formData.username?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <FileUpload
                    variant="button"
                    purpose="profile_picture"
                    maxSize={2}
                    onUploadComplete={handleProfilePictureUpload}
                    currentImage={formData.image}
                    disabled={isUploadingProfilePicture}
                  />
                  <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                    JPG, PNG or GIF. Max size of 2MB.
                  </p>
                </div>
              </div>

              {/* User Details Display */}
              <div className="bg-muted/30 rounded-lg p-4 mb-6">
                <h3 className="font-semibold mb-3">Account Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <p className="font-medium">{currentUser?.email || "Not set"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone:</span>
                    <p className="font-medium">
                      {currentUser?.phone && currentUser?.countryCode 
                        ? `+${currentUser.countryCode}${currentUser.phone}` 
                        : currentUser?.phone 
                          ? currentUser.phone 
                          : "Not set"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Member since:</span>
                    <p className="font-medium">
                      {currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : "Unknown"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Account Status:</span>
                    <p className="font-medium text-green-600">Active</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Display Name</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder="Your display name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Username</label>
                    <Input
                      value={formData.username}
                      readOnly
                      disabled
                      placeholder="@username"
                      className="bg-muted cursor-not-allowed"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Username cannot be changed after account creation
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Bio</label>
                  <Textarea
                    value={formData.bio}
                    onChange={(e) => handleInputChange("bio", e.target.value)}
                    placeholder="Tell people about yourself..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <LocationSelector
                      value={formData.location}
                      onChange={(value) => handleInputChange("location", value)}
                      label="Location"
                      placeholder="Select your location"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Role</label>
                    <Select 
                      value={formData.userRole} 
                      onValueChange={(value: UserRole) => handleInputChange("userRole", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USER">General User</SelectItem>
                        <SelectItem value="STARTUP_FOUNDER">Startup Founder</SelectItem>
                        <SelectItem value="FREELANCER">Freelancer</SelectItem>
                        <SelectItem value="CREATOR">Content Creator</SelectItem>
                        <SelectItem value="ANGEL_INVESTOR">Angel Investor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="theme" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Theme Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">Appearance</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose how the interface looks to you.
                  </p>
                </div>
                <ThemeToggle />
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Theme Options</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setTheme('light')}
                    className={`p-3 border rounded-lg text-center transition-all hover:shadow-md relative ${
                      theme === 'light' ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/50'
                    }`}
                  >
                    {theme === 'light' && (
                      <div className="absolute top-2 right-2">
                        <Check className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div className="w-16 h-10 bg-white border mx-auto mb-2 rounded shadow-sm"></div>
                    <p className="text-xs font-medium">Light</p>
                    <p className="text-xs text-muted-foreground">Clean and bright</p>
                  </button>

                  <button
                    onClick={() => setTheme('dark')}
                    className={`p-3 border rounded-lg text-center transition-all hover:shadow-md relative ${
                      theme === 'dark' ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/50'
                    }`}
                  >
                    {theme === 'dark' && (
                      <div className="absolute top-2 right-2">
                        <Check className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div className="w-16 h-10 bg-gray-900 border mx-auto mb-2 rounded shadow-sm"></div>
                    <p className="text-xs font-medium">Dark</p>
                    <p className="text-xs text-muted-foreground">Easy on the eyes</p>
                  </button>

                  <button
                    onClick={() => setTheme('system')}
                    className={`p-3 border rounded-lg text-center transition-all hover:shadow-md relative ${
                      theme === 'system' ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/50'
                    }`}
                  >
                    {theme === 'system' && (
                      <div className="absolute top-2 right-2">
                        <Check className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div className="w-16 h-10 bg-gradient-to-br from-white to-gray-900 border mx-auto mb-2 rounded shadow-sm"></div>
                    <p className="text-xs font-medium">System</p>
                    <p className="text-xs text-muted-foreground">Matches your device</p>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">Email</h3>
                <p className="text-sm text-muted-foreground">{session.user?.email}</p>
                <Button variant="outline" size="sm" className="mt-2">
                  Change Email
                </Button>
              </div>
              
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium text-red-600">Danger Zone</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Permanently delete your account and all associated data.
                </p>
                <ConfirmationModal
                  title="Delete Account"
                  description="This action cannot be undone. This will permanently delete your account and remove all your data from our servers."
                  confirmText="Delete Account"
                  confirmationPhrase={currentUser?.username || ""}
                  onConfirm={() => deleteAccountMutation.mutate()}
                  variant="destructive"
                  isLoading={deleteAccountMutation.isPending}
                >
                  <Button variant="destructive" size="sm">
                    Delete Account
                  </Button>
                </ConfirmationModal>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p>Notification settings coming soon...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}