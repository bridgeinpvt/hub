import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize R2 client
const r2Client = new S3Client({
  region: 'auto', // Cloudflare R2 uses 'auto' region
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

export interface UploadResult {
  key: string;
  url: string;
  size: number;
}

export interface FileMetadata {
  filename: string;
  mimetype: string;
  size: number;
  purpose?: string;
}

/**
 * Upload a file to Cloudflare R2
 */
export async function uploadToR2(
  buffer: Buffer,
  metadata: FileMetadata,
  userId: string
): Promise<UploadResult> {
  // Generate unique key with user ID and timestamp
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substr(2, 9);
  const extension = metadata.filename.split('.').pop() || 'bin';
  const key = `uploads/${userId}/${timestamp}-${randomId}.${extension}`;

  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: metadata.mimetype,
      ContentLength: metadata.size,
      Metadata: {
        'original-filename': metadata.filename,
        'uploaded-by': userId,
        'purpose': metadata.purpose || 'general',
      },
    });

    await r2Client.send(command);

    return {
      key,
      url: `/api/files/temp-placeholder`, // Will be updated with actual file ID after DB insert
      size: metadata.size,
    };
  } catch (error) {
    console.error('R2 upload error:', error);
    throw new Error('Failed to upload file to R2 storage');
  }
}

/**
 * Delete a file from Cloudflare R2
 */
export async function deleteFromR2(key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(command);
  } catch (error) {
    console.error('R2 delete error:', error);
    throw new Error('Failed to delete file from R2 storage');
  }
}

/**
 * Generate a presigned URL for direct file access (useful for temporary access)
 */
export async function getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    return await getSignedUrl(r2Client, command, { expiresIn });
  } catch (error) {
    console.error('R2 presigned URL error:', error);
    throw new Error('Failed to generate presigned URL');
  }
}

/**
 * Validate file before upload
 */
export const validateFile = (file: File): { isValid: boolean; error?: string } => {
  // Check file size (10MB max for R2)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return { isValid: false, error: 'File size exceeds 10MB limit' };
  }

  // Check file type (images only for now)
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

export { r2Client };