"use client";

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useFileUpload } from '@/hooks/useFileUpload';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onUploadComplete?: (fileUrl: string, fileId: string) => void;
  purpose?: string;
  accept?: string;
  maxSize?: number; // in MB
  className?: string;
  disabled?: boolean;
  currentImage?: string;
  variant?: 'button' | 'dropzone' | 'avatar';
  size?: 'sm' | 'md' | 'lg';
}

export function FileUpload({
  onUploadComplete,
  purpose,
  accept = 'image/*',
  maxSize = 5,
  className,
  disabled = false,
  currentImage,
  variant = 'button',
  size = 'md',
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [isDragOver, setIsDragOver] = useState(false);

  const { uploadFile, isUploading, uploadProgress, error, setError } = useFileUpload({
    purpose,
    onSuccess: (response) => {
      setPreview(response.url);
      onUploadComplete?.(response.url, response.id);
    },
  });

  const handleFileSelect = async (file: File) => {
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size must be less than ${maxSize}MB`);
      return;
    }

    // Create preview
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);

    // Upload file
    await uploadFile(file);
    
    // Clean up preview URL
    URL.revokeObjectURL(previewUrl);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const removeImage = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const sizeClasses = {
    sm: 'h-24 w-24',
    md: 'h-32 w-32',
    lg: 'h-48 w-48',
  };

  if (variant === 'avatar') {
    return (
      <div className={cn('relative', sizeClasses[size], className)}>
        <div 
          className={cn(
            'relative w-full h-full rounded-full border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors cursor-pointer overflow-hidden group',
            isDragOver && 'border-blue-500 bg-blue-50',
            isUploading && 'pointer-events-none',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={!disabled ? openFileDialog : undefined}
        >
          {preview ? (
            <>
              <img 
                src={preview} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Upload className="h-6 w-6 text-white" />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <ImageIcon className="h-8 w-8 mb-2" />
              <span className="text-xs text-center">Upload Image</span>
            </div>
          )}
          
          {isUploading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <span className="text-xs">{uploadProgress}%</span>
              </div>
            </div>
          )}
        </div>

        {preview && !isUploading && (
          <Button
            size="sm"
            variant="destructive"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
            onClick={(e) => {
              e.stopPropagation();
              removeImage();
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />

        {error && (
          <p className="text-sm text-red-600 mt-2">{error}</p>
        )}
      </div>
    );
  }

  if (variant === 'dropzone') {
    return (
      <div className={cn('space-y-4', className)}>
        <div
          className={cn(
            'border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer',
            isDragOver && 'border-blue-500 bg-blue-50',
            isUploading && 'pointer-events-none opacity-75',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={!disabled ? openFileDialog : undefined}
        >
          {preview ? (
            <div className="space-y-4">
              <img 
                src={preview} 
                alt="Preview" 
                className="max-h-48 max-w-full mx-auto rounded-lg"
              />
              <p className="text-sm text-muted-foreground">Click to change image</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <p className="text-lg font-medium text-muted-foreground">
                  Drop your image here, or click to browse
                </p>
                <p className="text-sm text-muted-foreground">
                  Supports: JPG, PNG, GIF, WebP (max {maxSize}MB)
                </p>
              </div>
            </div>
          )}

          {isUploading && (
            <div className="mt-4">
              <div className="bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Uploading... {uploadProgress}%</p>
            </div>
          )}
        </div>

        {preview && !isUploading && (
          <Button
            variant="outline"
            onClick={removeImage}
            className="w-full"
          >
            <X className="h-4 w-4 mr-2" />
            Remove Image
          </Button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }

  // Button variant (default)
  return (
    <div className={cn('space-y-2', className)}>
      <Button
        variant="outline"
        onClick={openFileDialog}
        disabled={disabled || isUploading}
        className="w-full"
      >
        <Upload className="h-4 w-4 mr-2" />
        {isUploading ? `Uploading... ${uploadProgress}%` : 'Upload Image'}
      </Button>

      {preview && (
        <div className="relative">
          <img 
            src={preview} 
            alt="Preview" 
            className="max-h-32 max-w-full mx-auto rounded-lg"
          />
          <Button
            size="sm"
            variant="destructive"
            className="absolute top-2 right-2"
            onClick={removeImage}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}