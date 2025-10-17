/**
 * Pexels API Types
 * 
 * Type definitions for Pexels API responses.
 * These types match the structure returned by the Pexels API.
 * 
 * @see https://www.pexels.com/api/documentation/#videos-popular
 */

/**
 * Pexels video file (different quality options)
 */
export interface PexelsVideoFile {
  id: number;
  quality: 'sd' | 'hd' | 'uhd';    // Standard, High, Ultra High Definition
  file_type: string;                // e.g., "video/mp4"
  width: number;
  height: number;
  fps: number;
  link: string;                     // Direct video URL
}

/**
 * Pexels video thumbnail/picture
 */
export interface PexelsVideoPicture {
  id: number;
  picture: string;                  // Thumbnail image URL
  nr: number;                       // Frame number
}

/**
 * Pexels user (video creator/photographer)
 */
export interface PexelsUser {
  id: number;
  name: string;
  url: string;                      // Creator profile URL on Pexels
}

/**
 * Pexels video entity
 * 
 * Represents a single video from the Pexels API
 */
export interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  duration: number;                 // Duration in seconds
  full_res: null;                   // Not used in video API
  tags: string[];                   // Array of tags/categories
  url: string;                      // Video page URL on Pexels
  image: string;                    // Thumbnail URL
  avg_color: null;                  // Not used in video API
  user: PexelsUser;
  video_files: PexelsVideoFile[];
  video_pictures: PexelsVideoPicture[];
}

/**
 * Pexels API popular videos response
 * 
 * Response structure from GET /videos/popular endpoint
 */
export interface PexelsPopularVideosResponse {
  page: number;
  per_page: number;
  total_results: number;
  url: string;                      // API endpoint URL
  videos: PexelsVideo[];
  next_page?: string;               // URL to next page (if available)
  prev_page?: string;               // URL to previous page (if available)
}

/**
 * Pexels API error response
 */
export interface PexelsErrorResponse {
  error: string;
}
