/**
 * Video Domain Types
 *
 * Core domain types for the video entity.
 * These are used throughout the application and differ from the Pexels API types.
 */

/**
 * Video quality URLs
 *
 * Different quality options for video playback
 */
export interface VideoUrls {
  tiny: string; // 640x360 or lower
  small: string; // 960x540
  medium: string; // 1280x720
  large: string; // 1920x1080
  hd: string | null; // 2560x1440 (if available)
  fullHd: string | null; // 3840x2160 (if available)
}

/**
 * Video creator information
 */
export interface VideoCreator {
  name: string;
  url: string; // Creator profile URL on Pexels
}

/**
 * Video entity
 *
 * Represents a video in our system.
 * This is the main domain model for videos.
 */
export interface Video {
  id: string; // MongoDB _id as string
  pexelsId: number; // Original Pexels video ID
  title: string; // Video title/description
  creator: VideoCreator;
  duration: number; // Duration in seconds
  width: number; // Video width in pixels
  height: number; // Video height in pixels
  thumbnailUrl: string; // Thumbnail image URL
  videoUrls: VideoUrls;
  tags: string[]; // Video tags/categories
  uploadedAt: Date; // When video was uploaded to Pexels
  syncedAt: Date; // When video was synced to our database
}

/**
 * Video cursor for pagination
 *
 * Opaque cursor string (base64 encoded) containing pagination state
 */
export type VideoCursor = string;

/**
 * Cursor data (decoded)
 *
 * Internal structure of the cursor (not exposed to clients)
 */
export interface CursorData {
  uploadedAt: string; // ISO date string
  id: string; // MongoDB _id as string
}

/**
 * Paginated videos response
 *
 * Response structure for infinite queries
 */
export interface PaginatedVideos {
  items: Video[]; // Array of videos for this page
  nextCursor: VideoCursor | null; // Cursor for next page (null if last page)
  hasMore: boolean; // Whether more videos exist
}

/**
 * Video sync statistics
 *
 * Response from Pexels sync operation
 */
export interface VideoSyncStats {
  success: boolean;
  syncedCount: number; // New videos added
  skippedCount: number; // Duplicate videos (already in DB)
  totalFetched: number; // Total videos fetched from Pexels
  page: number; // Page number that was synced
  errors: string[]; // Non-fatal errors encountered
}
