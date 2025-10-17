/**
 * Pexels API Client
 *
 * Wrapper for Pexels API with rate limiting and error handling.
 * Follows Principle IX: Pexels Content via sync service, no direct client access.
 *
 * @see https://www.pexels.com/api/documentation/#videos-popular
 */

import { env } from "@/config/env";
import type { PexelsPopularVideosResponse, PexelsVideo } from "@/types/pexels";

/**
 * Pexels API base URL
 */
const PEXELS_API_BASE = "https://api.pexels.com/v1";

/**
 * Rate limiter for Pexels API
 *
 * Ensures we don't exceed rate limits (200 requests/hour on free tier).
 * Implements 1 second minimum delay between requests.
 */
class RateLimiter {
  private lastRequestTime = 0;
  private minInterval = 1000; // 1 second

  async throttle() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }
}

const pexelsRateLimiter = new RateLimiter();

/**
 * Pexels API client
 */
export class PexelsClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Fetch popular videos from Pexels API
   *
   * Rate limiting: 200 requests per hour (free tier)
   * Implements 1 second delay between requests via rate limiter.
   *
   * @param page - Page number (1-indexed)
   * @param perPage - Videos per page (max 80)
   * @returns Array of Pexels videos
   * @throws Error if API request fails
   */
  async fetchPopularVideos(
    page: number = 1,
    perPage: number = 20,
  ): Promise<PexelsVideo[]> {
    // Apply rate limiting
    await pexelsRateLimiter.throttle();

    const url = `${PEXELS_API_BASE}/videos/popular?page=${page}&per_page=${perPage}`;

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: this.apiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Pexels API error: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      const data = (await response.json()) as PexelsPopularVideosResponse;

      if (!data || !Array.isArray(data.videos)) {
        throw new Error("Invalid Pexels API response format");
      }

      return data.videos;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch Pexels videos: ${error.message}`);
      }
      throw new Error("Failed to fetch Pexels videos: Unknown error");
    }
  }

  /**
   * Search videos by query
   *
   * @param query - Search query string
   * @param page - Page number (1-indexed)
   * @param perPage - Videos per page (max 80)
   * @returns Array of Pexels videos
   */
  async searchVideos(
    query: string,
    page: number = 1,
    perPage: number = 20,
  ): Promise<PexelsVideo[]> {
    await pexelsRateLimiter.throttle();

    const url = `${PEXELS_API_BASE}/videos/search?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`;

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: this.apiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Pexels API error: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      const data = (await response.json()) as PexelsPopularVideosResponse;

      if (!data || !Array.isArray(data.videos)) {
        throw new Error("Invalid Pexels API response format");
      }

      return data.videos;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to search Pexels videos: ${error.message}`);
      }
      throw new Error("Failed to search Pexels videos: Unknown error");
    }
  }
}

/**
 * Create Pexels client instance
 *
 * Uses API key from environment variables.
 */
export function createPexelsClient(): PexelsClient {
  return new PexelsClient(env.PEXELS_API_KEY);
}

/**
 * Singleton instance for server-side use
 */
export const pexelsClient = createPexelsClient();
