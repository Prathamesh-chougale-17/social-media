/**
 * Video Database Queries
 * 
 * Query functions for the videos collection, including cursor-based pagination,
 * data transformations, and upsert operations.
 * 
 * Follows Principle III: tRPC-First Data - these are only called from tRPC procedures.
 */

import { type Db, ObjectId } from 'mongodb';
import type { VideoDocument } from '../models/video';
import { VIDEOS_COLLECTION } from '../models/video';
import type { Video, CursorData, PaginatedVideos } from '@/types/video';
import type { PexelsVideo, PexelsVideoFile } from '@/types/pexels';

/**
 * Encode cursor for pagination
 * 
 * Creates a base64-encoded cursor from the last video document.
 * Cursor format: base64({ uploadedAt: ISO string, id: MongoDB _id })
 * 
 * @param doc - Last video document from current page
 * @returns Base64-encoded cursor string
 */
export function encodeCursor(doc: VideoDocument): string {
  const data: CursorData = {
    uploadedAt: doc.uploadedAt.toISOString(),
    id: doc._id.toString(),
  };
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

/**
 * Decode cursor for pagination
 * 
 * Decodes base64 cursor back to cursor data object.
 * 
 * @param cursor - Base64-encoded cursor string
 * @returns Decoded cursor data
 * @throws Error if cursor is invalid
 */
export function decodeCursor(cursor: string): CursorData {
  try {
    const json = Buffer.from(cursor, 'base64').toString('utf-8');
    const data = JSON.parse(json) as CursorData;
    
    if (!data.uploadedAt || !data.id) {
      throw new Error('Invalid cursor format');
    }
    
    return data;
  } catch (error) {
    throw new Error('Failed to decode cursor');
  }
}

/**
 * Transform MongoDB VideoDocument to domain Video type
 * 
 * Converts MongoDB ObjectId to string and ensures proper typing.
 * 
 * @param doc - MongoDB video document
 * @returns Domain Video object
 */
export function transformVideoDocument(doc: VideoDocument): Video {
  return {
    id: doc._id.toString(),
    pexelsId: doc.pexelsId,
    title: doc.title,
    creator: doc.creator,
    duration: doc.duration,
    width: doc.width,
    height: doc.height,
    thumbnailUrl: doc.thumbnailUrl,
    videoUrls: doc.videoUrls,
    tags: doc.tags,
    uploadedAt: doc.uploadedAt,
    syncedAt: doc.syncedAt,
  };
}

/**
 * Get quality key from video dimensions
 * 
 * Maps video width/height to quality tier.
 * 
 * @param width - Video width in pixels
 * @param height - Video height in pixels
 * @returns Quality key or null if dimensions are too high
 */
function getQualityKey(width: number, height: number): keyof VideoDocument['videoUrls'] | null {
  const maxDim = Math.max(width, height);
  
  if (maxDim <= 640) return 'tiny';
  if (maxDim <= 960) return 'small';
  if (maxDim <= 1280) return 'medium';
  if (maxDim <= 1920) return 'large';
  if (maxDim <= 2560) return 'hd';
  if (maxDim <= 3840) return 'fullHd';
  
  return null; // Skip extremely high resolution videos
}

/**
 * Extract video URLs from Pexels video files
 * 
 * Groups video files by quality and creates VideoUrls structure.
 * 
 * @param videoFiles - Array of Pexels video files
 * @returns VideoUrls object or null if required qualities are missing
 */
function extractVideoUrls(videoFiles: PexelsVideoFile[]): VideoDocument['videoUrls'] | null {
  const urlMap: Partial<VideoDocument['videoUrls']> = {};
  
  for (const file of videoFiles) {
    const quality = getQualityKey(file.width, file.height);
    if (quality && !urlMap[quality]) {
      urlMap[quality] = file.link;
    }
  }
  
  // Ensure we have at least tiny, small, medium, large
  if (!urlMap.tiny || !urlMap.small || !urlMap.medium || !urlMap.large) {
    return null; // Skip videos without basic quality levels
  }
  
  return {
    tiny: urlMap.tiny,
    small: urlMap.small,
    medium: urlMap.medium,
    large: urlMap.large,
    hd: urlMap.hd ?? null,
    fullHd: urlMap.fullHd ?? null,
  };
}

/**
 * Transform Pexels video to MongoDB VideoDocument format
 * 
 * Converts Pexels API response to our internal schema.
 * Returns null if transformation fails (invalid data).
 * 
 * @param pexelsVideo - Video from Pexels API
 * @returns VideoDocument (without _id) or null
 */
export function transformPexelsVideo(pexelsVideo: PexelsVideo): Omit<VideoDocument, '_id'> | null {
  try {
    const videoUrls = extractVideoUrls(pexelsVideo.video_files);
    
    if (!videoUrls) {
      return null; // Skip videos without valid URLs
    }
    
    return {
      pexelsId: pexelsVideo.id,
      title: `Video by ${pexelsVideo.user.name}`, // Pexels doesn't provide titles
      creator: {
        name: pexelsVideo.user.name,
        url: pexelsVideo.user.url,
      },
      duration: pexelsVideo.duration,
      width: pexelsVideo.width,
      height: pexelsVideo.height,
      thumbnailUrl: pexelsVideo.image,
      videoUrls,
      tags: pexelsVideo.tags || [],
      uploadedAt: new Date(), // Pexels doesn't provide upload date
      syncedAt: new Date(),
    };
  } catch (error) {
    console.error(`Failed to transform Pexels video ${pexelsVideo.id}:`, error);
    return null;
  }
}

/**
 * Get paginated videos with cursor-based pagination
 * 
 * Fetches videos from MongoDB using cursor-based pagination.
 * Uses compound index (uploadedAt DESC, _id DESC) for efficient queries.
 * 
 * @param db - MongoDB database instance
 * @param limit - Number of videos per page
 * @param cursor - Optional cursor from previous page
 * @returns Paginated videos with next cursor
 */
export async function getVideosWithCursor(
  db: Db,
  limit: number,
  cursor?: string
): Promise<PaginatedVideos> {
  let query = {};
  
  if (cursor) {
    const { uploadedAt, id } = decodeCursor(cursor);
    query = {
      $or: [
        { uploadedAt: { $lt: new Date(uploadedAt) } },
        {
          uploadedAt: new Date(uploadedAt),
          _id: { $lt: new ObjectId(id) },
        },
      ],
    };
  }
  
  // Fetch limit + 1 to check if there are more pages
  const videoDocs = await db
    .collection<VideoDocument>(VIDEOS_COLLECTION)
    .find(query)
    .sort({ uploadedAt: -1, _id: -1 })
    .limit(limit + 1)
    .toArray();
  
  const hasMore = videoDocs.length > limit;
  const items = hasMore ? videoDocs.slice(0, limit) : videoDocs;
  const nextCursor = hasMore ? encodeCursor(items[items.length - 1]) : null;
  
  return {
    items: items.map(transformVideoDocument),
    nextCursor,
    hasMore,
  };
}

/**
 * Upsert videos to MongoDB
 * 
 * Inserts new videos or skips duplicates based on pexelsId.
 * Uses updateOne with upsert=true and $setOnInsert.
 * 
 * @param db - MongoDB database instance
 * @param videos - Array of video documents to upsert
 * @returns Sync statistics (synced count, skipped count)
 */
export async function upsertVideos(
  db: Db,
  videos: Omit<VideoDocument, '_id'>[]
): Promise<{ syncedCount: number; skippedCount: number }> {
  const collection = db.collection<VideoDocument>(VIDEOS_COLLECTION);
  
  let syncedCount = 0;
  let skippedCount = 0;
  
  for (const video of videos) {
    try {
      const result = await collection.updateOne(
        { pexelsId: video.pexelsId },
        { $setOnInsert: video },
        { upsert: true }
      );
      
      if (result.upsertedCount > 0) {
        syncedCount++;
      } else {
        skippedCount++;
      }
    } catch (error) {
      console.error(`Failed to upsert video ${video.pexelsId}:`, error);
      // Continue with next video (non-fatal error)
    }
  }
  
  return { syncedCount, skippedCount };
}
