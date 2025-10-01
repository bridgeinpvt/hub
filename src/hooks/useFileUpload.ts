import { useState } from 'react';
import { logger } from '@/lib/logger';

interface UploadResponse {
  id: string;
  url: string;
  filename: string;
  size: number;
  mimetype: string;
}

interface UseFileUploadOptions {
  purpose?: string;
  onSuccess?: (response: UploadResponse) => void;
  onError?: (error: string) => void;
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (file: File): Promise<UploadResponse | null> => {
    if (!file) {
      setError('No file selected');
      return null;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // For auth-service, simulate upload without actual upload functionality
      // In a real implementation, you'd upload to your file storage service
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      clearInterval(progressInterval);
      setUploadProgress(100);

      const result: UploadResponse = {
        id: `file_${Date.now()}`,
        url: URL.createObjectURL(file),
        filename: file.name,
        size: file.size,
        mimetype: file.type
      };

      options.onSuccess?.(result);
      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      options.onError?.(errorMessage);
      return null;
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  return {
    uploadFile,
    isUploading,
    uploadProgress,
    error,
    setError,
  };
}

// Simplified hooks for common use cases (no TRPC dependencies)
export function useProfilePictureUpload() {
  return useFileUpload({
    purpose: 'profile_picture',
    onSuccess: async (response) => {
      logger.info('Profile picture uploaded:', response);
    },
  });
}

export function useCapsuleLogoUpload(capsuleId: string) {
  return useFileUpload({
    purpose: 'capsule_logo',
    onSuccess: async (response) => {
      logger.info('Capsule logo uploaded:', response);
    },
  });
}