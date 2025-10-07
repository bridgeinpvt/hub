"use client";

import React, { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/trpc/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/toaster";
import { X, ImageIcon, Upload, Type, List, Hash } from "lucide-react";
import Image from "next/image";
import dynamic from 'next/dynamic';

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false,
  loading: () => <div className="h-24 bg-muted rounded animate-pulse" />
});

export function CreatePostForm({ onPostCreated }: { onPostCreated?: () => void }) {
  const { data: session } = useAuth();
  const { data: currentUser } = api.user.getCurrentUser.useQuery(
    undefined,
    { enabled: !!session?.user?.id }
  );
  const { addToast } = useToast();
  const [content, setContent] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [useRichEditor, setUseRichEditor] = useState(false);

  // ReactQuill modules configuration
  const quillModules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['blockquote'],
      ['clean']
    ],
  }), []);

  const quillFormats = [
    'header', 'bold', 'italic', 'underline',
    'list', 'bullet', 'blockquote'
  ];

  const createPostMutation = api.post.create.useMutation({
    onSuccess: () => {
      addToast({
        title: "Success!",
        description: "Your post has been created.",
        variant: "success",
      });
      setContent("");
      setHashtags([]);
      setHashtagInput("");
      setImages([]);
      setIsExpanded(false);
      onPostCreated?.();
    },
    onError: (error) => {
      addToast({
        title: "Error",
        description: error.message || "Failed to create post",
        variant: "error",
      });
    },
  });

  const addHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#/, "");
    if (tag && !hashtags.includes(tag) && hashtags.length < 5) {
      setHashtags([...hashtags, tag]);
      setHashtagInput("");
    }
  };

  const removeHashtag = (tagToRemove: string) => {
    setHashtags(hashtags.filter(tag => tag !== tagToRemove));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error('Upload failed');
        }
        
        const data = await response.json();
        return data.url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      setImages(prev => [...prev, ...uploadedUrls]);
    } catch (error) {
      addToast({
        title: "Error",
        description: "Failed to upload images",
        variant: "error",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleHashtagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      addHashtag();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    createPostMutation.mutate({
      content: content.trim(),
      images: images,
      hashtags: hashtags,
    });
  };

  if (!session) return null;

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex space-x-3">
          <Avatar className="h-10 w-10 bg-purple-600 text-white">
            {(currentUser?.image || session.user?.image) ? (
              <Image 
                src={currentUser?.image || session.user.image || ""} 
                alt={currentUser?.name || session.user.name || "User"}
                fill
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <span className="text-sm font-medium">
                {(currentUser?.name?.[0] || session.user?.name?.[0])?.toUpperCase() || "U"}
              </span>
            )}
          </Avatar>
          
          <div className="flex-1">
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Editor Toggle */}
              <div className="flex items-center gap-2 mb-2">
                <Button
                  type="button"
                  variant={!useRichEditor ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUseRichEditor(false)}
                  className="text-xs"
                >
                  <Type className="h-3 w-3 mr-1" />
                  Simple
                </Button>
                <Button
                  type="button"
                  variant={useRichEditor ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUseRichEditor(true)}
                  className="text-xs"
                >
                  <List className="h-3 w-3 mr-1" />
                  Rich
                </Button>
              </div>

              {/* Content Editor */}
              {useRichEditor ? (
                <div className="border rounded-md border-border bg-card">
                  <ReactQuill
                    value={content}
                    onChange={setContent}
                    onFocus={() => setIsExpanded(true)}
                    placeholder="What's happening? Use headings, lists, and formatting..."
                    modules={quillModules}
                    formats={quillFormats}
                    theme="snow"
                    className="quill-editor"
                    style={{ 
                      minHeight: isExpanded ? '120px' : '60px'
                    }}
                  />
                </div>
              ) : (
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onFocus={() => setIsExpanded(true)}
                  placeholder="What's happening?"
                  className={`resize-none bg-background text-foreground placeholder:text-muted-foreground ${
                    isExpanded ? "min-h-[100px]" : "min-h-[50px]"
                  }`}
                  maxLength={1000}
                />
              )}
              
              {isExpanded && (
                <>
                  {/* Hashtags Section */}
                  <div className="space-y-3">
                    <div>
                      <Input
                        value={hashtagInput}
                        onChange={(e) => setHashtagInput(e.target.value)}
                        onKeyDown={handleHashtagKeyPress}
                        onBlur={() => {
                          if (hashtagInput.trim()) addHashtag();
                        }}
                        placeholder="Add hashtags (max 5)..."
                        className="text-sm"
                        maxLength={30}
                        disabled={hashtags.length >= 5}
                      />
                      {hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {hashtags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs"
                            >
                              #{tag}
                              <button
                                type="button"
                                onClick={() => removeHashtag(tag)}
                                className="hover:bg-primary/80 rounded-full p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Image Upload Section */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          id="image-upload"
                          multiple
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={uploading || images.length >= 4}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('image-upload')?.click()}
                          disabled={uploading || images.length >= 4}
                          className="flex items-center gap-2"
                        >
                          {uploading ? (
                            <Upload className="h-4 w-4 animate-spin" />
                          ) : (
                            <ImageIcon className="h-4 w-4" />
                          )}
                          {uploading ? "Uploading..." : "Add Images"}
                        </Button>
                        {images.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {images.length}/4 images
                          </span>
                        )}
                      </div>

                      {/* Image Preview */}
                      {images.length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                          {images.map((imageUrl, index) => (
                            <div key={index} className="relative group">
                              <Image
                                src={imageUrl}
                                alt={`Upload ${index + 1}`}
                                width={150}
                                height={150}
                                className="rounded-lg object-cover w-full h-32"
                              />
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div className="flex items-center gap-4 text-sm">
                      {useRichEditor ? (
                        <span className={`${content.length > 800 ? 'text-orange-500' : content.length > 950 ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {content.length}/1000
                        </span>
                      ) : (
                        <span className={`${content.length > 800 ? 'text-orange-500' : content.length > 950 ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {content.length}/1000
                        </span>
                      )}
                      <span className="text-muted-foreground">{hashtags.length}/5 tags</span>
                    </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsExpanded(false);
                        setContent("");
                        setHashtags([]);
                        setHashtagInput("");
                        setImages([]);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!content.trim() || createPostMutation.isPending}
                    >
                      {createPostMutation.isPending ? "Posting..." : "Post"}
                    </Button>
                    </div>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}