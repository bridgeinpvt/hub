import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { logger } from '@/lib/logger';
import { r2Client } from '@/lib/r2-storage';
import { GetObjectCommand } from '@aws-sdk/client-s3';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const fileId = params.id;

    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
    }

    // Get file metadata from database
    const file = await db.fileStorage.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // If file has R2 key, fetch from R2
    if (file.r2Key) {
      try {
        const command = new GetObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME!,
          Key: file.r2Key,
        });
        
        const response = await r2Client.send(command);
        const stream = response.Body as ReadableStream;
        
        return new NextResponse(stream, {
          headers: {
            'Content-Type': file.mimetype,
            'Content-Disposition': `inline; filename="${file.filename}"`,
            'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
          },
        });
      } catch (error) {
        logger.error('Failed to fetch from R2:', error);
        // Fall through to database fallback
      }
    }

    // Fallback: serve from database (legacy files)
    if (file.data) {
      return new NextResponse(Buffer.from(file.data), {
        headers: {
          'Content-Type': file.mimetype,
          'Content-Disposition': `inline; filename="${file.filename}"`,
        },
      });
    }

    return NextResponse.json({ error: 'File content not available' }, { status: 500 });

  } catch (error) {
    logger.error('File serve error:', error);
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 });
  }
}

// Add OPTIONS handler for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}