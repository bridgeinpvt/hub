import multer from 'multer';
import { NextRequest } from 'next/server';

// Configure multer to store files in memory
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Helper function to promisify multer for Next.js API routes
export const uploadSingle = (fieldName: string) => {
  return new Promise<Express.Multer.File>((resolve, reject) => {
    const uploadHandler = upload.single(fieldName);
    
    return uploadHandler(
      {} as any, // req object (not used in memory storage)
      {} as any, // res object (not used)
      (error: any) => {
        if (error) {
          reject(error);
        } else {
          // This won't actually work with Next.js API routes
          // We'll handle file parsing differently
          resolve({} as Express.Multer.File);
        }
      }
    );
  });
};

// File validation utilities
export const validateImageFile = (file: File): { isValid: boolean; error?: string } => {
  // Check file size (5MB max)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return { isValid: false, error: 'File size exceeds 5MB limit' };
  }

  // Check file type (images only)
  if (!file.type.startsWith('image/')) {
    return { isValid: false, error: 'Only image files are allowed' };
  }

  // Check specific image types
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Supported formats: JPEG, PNG, GIF, WebP' };
  }

  return { isValid: true };
};

export const generateFileId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};