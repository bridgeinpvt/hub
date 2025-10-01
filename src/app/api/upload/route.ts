import { NextRequest, NextResponse } from 'next/server';
import { validateFile, uploadToR2 } from '@/lib/r2-storage';
import { db } from '@/server/db';
import { getUserFromHeaders } from '@/lib/shared-auth-middleware';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Get user info from headers set by auth middleware
    const user = getUserFromHeaders(request.headers);

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const purpose = formData.get('purpose') as string; // "profile_picture", "capsule_logo", etc.

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate the file
    const validation = validateFile(file);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload file to R2
    const uploadResult = await uploadToR2(buffer, {
      filename: file.name,
      mimetype: file.type,
      size: file.size,
      purpose: purpose || 'general'
    }, user.id);

    // Store file metadata in database
    const fileRecord = await db.fileStorage.create({
      data: {
        filename: file.name,
        mimetype: file.type,
        size: file.size,
        r2Key: uploadResult.key,
        r2Url: null, // We'll serve through our API endpoint
        uploadedBy: user.id,
        purpose: purpose || 'general',
      },
    });

    return NextResponse.json({ 
      id: fileRecord.id,
      url: `/api/files/${fileRecord.id}`,
      filename: file.name,
      size: file.size,
      mimetype: file.type
    }, { status: 200 });

  } catch (error) {
    logger.error('File upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}