# Data Model: Infinite Scroll Video Feed

**Feature**: Infinite Scroll Video Feed  
**Date**: 2025-10-17  
**Phase**: 1 (Design)

## Overview

This document defines the MongoDB schema for the `videos` collection and related TypeScript types. The data model supports infinite scroll pagination with cursor-based queries and efficient indexing.

## MongoDB Collections

### videos Collection

**Purpose**: Store video metadata synced from Pexels API

**Document Schema**:

```typescript
interface VideoDocument {
  _id: ObjectId;                    // MongoDB auto-generated ID
  pexelsId: number;                 // Unique Pexels video ID
  title: string;                    // Video title/description
  creator: {
    name: string;                   // Creator/photographer name
    url: string;                    // Creator profile URL on Pexels
  };
  duration: number;                 // Video duration in seconds
  width: number;                    // Video width in pixels
  height: number;                   // Video height in pixels
  thumbnailUrl: string;             // Thumbnail image URL (from Pexels CDN)
  videoUrls: {
    tiny: string;                   // Low quality video URL
    small: string;                  // Medium quality video URL
    medium: string;                 // Standard quality video URL
    large: string;                  // High quality video URL
    hd: string | null;              // HD quality video URL (if available)
    fullHd: string | null;          // Full HD quality URL (if available)
  };
  tags: string[];                   // Video tags/categories
  uploadedAt: Date;                 // When video was uploaded to Pexels
  syncedAt: Date;                   // When video was synced to our database
}
```

**Indexes**:

1. **Unique Index on pexelsId**
   ```javascript
   db.videos.createIndex({ pexelsId: 1 }, { unique: true })
   ```
   - **Purpose**: Prevent duplicate videos, fast upsert operations
   - **Query**: `db.videos.findOne({ pexelsId: 12345 })`
   - **Performance**: O(log n) lookup

2. **Compound Index for Cursor Pagination**
   ```javascript
   db.videos.createIndex({ uploadedAt: -1, _id: -1 })
   ```
   - **Purpose**: Support cursor-based pagination with sorting
   - **Query**: `db.videos.find({ $or: [...] }).sort({ uploadedAt: -1, _id: -1 })`
   - **Performance**: O(log n) + O(limit) for paginated queries
   - **Note**: Descending order (-1) for newest-first sorting

**Validation Rules**:

```javascript
db.createCollection("videos", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["pexelsId", "title", "creator", "duration", "thumbnailUrl", "videoUrls", "uploadedAt", "syncedAt"],
      properties: {
        pexelsId: {
          bsonType: "int",
          minimum: 1
        },
        title: {
          bsonType: "string",
          minLength: 1,
          maxLength: 500
        },
        creator: {
          bsonType: "object",
          required: ["name", "url"],
          properties: {
            name: { bsonType: "string" },
            url: { bsonType: "string", pattern: "^https://" }
          }
        },
        duration: {
          bsonType: "int",
          minimum: 1,
          maximum: 36000 // 10 hours max
        },
        thumbnailUrl: {
          bsonType: "string",
          pattern: "^https://"
        },
        uploadedAt: {
          bsonType: "date"
        },
        syncedAt: {
          bsonType: "date"
        }
      }
    }
  }
})
```

**Estimated Document Size**: ~1.5 KB per document

**Estimated Collection Size** (for 1,000 videos):
- Documents: ~1.5 MB
- Indexes: ~150 KB
- **Total**: ~1.65 MB

---

## TypeScript Types

### Domain Types (types/video.ts)

```typescript
/**
 * Video entity representing a video from Pexels
 * Stored in MongoDB videos collection
 */
export interface Video {
  id: string;                       // MongoDB _id as string
  pexelsId: number;
  title: string;
  creator: {
    name: string;
    url: string;
  };
  duration: number;                 // seconds
  width: number;
  height: number;
  thumbnailUrl: string;
  videoUrls: VideoUrls;
  tags: string[];
  uploadedAt: Date;
  syncedAt: Date;
}

/**
 * Video quality URLs from Pexels
 */
export interface VideoUrls {
  tiny: string;                     // 640x360
  small: string;                    // 960x540
  medium: string;                   // 1280x720
  large: string;                    // 1920x1080
  hd: string | null;                // 2560x1440 (if available)
  fullHd: string | null;            // 3840x2160 (if available)
}

/**
 * Cursor for pagination (base64 encoded)
 */
export type VideoCursor = string;

/**
 * Paginated video response
 */
export interface PaginatedVideos {
  items: Video[];
  nextCursor: VideoCursor | null;
  hasMore: boolean;
}
```

### Zod Schemas (lib/db/models/video.ts)

```typescript
import { z } from 'zod';

/**
 * Video creator schema
 */
export const VideoCreatorSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
});

/**
 * Video URLs schema
 */
export const VideoUrlsSchema = z.object({
  tiny: z.string().url(),
  small: z.string().url(),
  medium: z.string().url(),
  large: z.string().url(),
  hd: z.string().url().nullable(),
  fullHd: z.string().url().nullable(),
});

/**
 * Video schema for validation
 */
export const VideoSchema = z.object({
  id: z.string(),
  pexelsId: z.number().int().positive(),
  title: z.string().min(1).max(500),
  creator: VideoCreatorSchema,
  duration: z.number().int().positive().max(36000), // 10 hours
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  thumbnailUrl: z.string().url(),
  videoUrls: VideoUrlsSchema,
  tags: z.array(z.string()),
  uploadedAt: z.date(),
  syncedAt: z.date(),
});

/**
 * Type inference from Zod schema
 */
export type Video = z.infer<typeof VideoSchema>;

/**
 * MongoDB document shape (before transformation)
 */
export interface VideoDocument {
  _id: ObjectId;
  pexelsId: number;
  title: string;
  creator: {
    name: string;
    url: string;
  };
  duration: number;
  width: number;
  height: number;
  thumbnailUrl: string;
  videoUrls: {
    tiny: string;
    small: string;
    medium: string;
    large: string;
    hd: string | null;
    fullHd: string | null;
  };
  tags: string[];
  uploadedAt: Date;
  syncedAt: Date;
}
```

### Pexels API Types (types/pexels.ts)

```typescript
/**
 * Pexels API video response
 */
export interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  duration: number;
  image: string;                    // thumbnail URL
  video_files: PexelsVideoFile[];
  video_pictures: PexelsVideoPicture[];
  user: {
    id: number;
    name: string;
    url: string;
  };
}

/**
 * Pexels video file (different qualities)
 */
export interface PexelsVideoFile {
  id: number;
  quality: 'sd' | 'hd' | 'uhd';    // Standard, High, Ultra High Definition
  file_type: string;                // e.g., "video/mp4"
  width: number;
  height: number;
  link: string;                     // video URL
}

/**
 * Pexels video thumbnail
 */
export interface PexelsVideoPicture {
  id: number;
  picture: string;                  // thumbnail URL
  nr: number;                       // frame number
}

/**
 * Pexels API popular videos response
 */
export interface PexelsPopularVideosResponse {
  page: number;
  per_page: number;
  total_results: number;
  url: string;
  videos: PexelsVideo[];
}
```

---

## Data Transformation

### Pexels API → MongoDB

When syncing videos from Pexels to MongoDB:

```typescript
function transformPexelsVideo(pexelsVideo: PexelsVideo): Omit<VideoDocument, '_id'> {
  // Group video files by quality
  const videoFiles = pexelsVideo.video_files.reduce((acc, file) => {
    const quality = getQualityKey(file.width);
    acc[quality] = file.link;
    return acc;
  }, {} as Record<string, string>);

  return {
    pexelsId: pexelsVideo.id,
    title: `Video by ${pexelsVideo.user.name}`, // Pexels videos don't have titles
    creator: {
      name: pexelsVideo.user.name,
      url: pexelsVideo.user.url,
    },
    duration: pexelsVideo.duration,
    width: pexelsVideo.width,
    height: pexelsVideo.height,
    thumbnailUrl: pexelsVideo.image,
    videoUrls: {
      tiny: videoFiles.tiny || videoFiles.small,
      small: videoFiles.small || videoFiles.medium,
      medium: videoFiles.medium || videoFiles.large,
      large: videoFiles.large || videoFiles.hd,
      hd: videoFiles.hd || null,
      fullHd: videoFiles.fullHd || null,
    },
    tags: [], // Pexels API doesn't provide tags
    uploadedAt: new Date(), // Pexels doesn't provide upload date, use current time
    syncedAt: new Date(),
  };
}

function getQualityKey(width: number): string {
  if (width <= 640) return 'tiny';
  if (width <= 960) return 'small';
  if (width <= 1280) return 'medium';
  if (width <= 1920) return 'large';
  if (width <= 2560) return 'hd';
  return 'fullHd';
}
```

### MongoDB → Domain Type

When querying MongoDB and returning to client:

```typescript
function transformVideoDocument(doc: VideoDocument): Video {
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
```

---

## Cursor Encoding/Decoding

### Cursor Format

Cursor is base64-encoded JSON with pagination state:

```typescript
interface CursorData {
  uploadedAt: string;               // ISO date string
  id: string;                       // MongoDB _id as string
}

function encodeCursor(video: Video): string {
  const data: CursorData = {
    uploadedAt: video.uploadedAt.toISOString(),
    id: video.id,
  };
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

function decodeCursor(cursor: string): CursorData {
  const json = Buffer.from(cursor, 'base64').toString('utf-8');
  return JSON.parse(json);
}
```

### MongoDB Query with Cursor

```typescript
async function getVideosWithCursor(
  limit: number,
  cursor?: string
): Promise<{ videos: Video[]; nextCursor: string | null }> {
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

  const videos = await db
    .collection('videos')
    .find(query)
    .sort({ uploadedAt: -1, _id: -1 })
    .limit(limit + 1)
    .toArray();

  const hasMore = videos.length > limit;
  const items = hasMore ? videos.slice(0, limit) : videos;
  const nextCursor = hasMore ? encodeCursor(items[items.length - 1]) : null;

  return {
    videos: items.map(transformVideoDocument),
    nextCursor,
  };
}
```

---

## Entity Relationships

### Current Feature (MVP)

```
┌─────────┐
│ Video   │
└─────────┘
```

No relationships in MVP - videos are standalone entities.

### Future Features

```
┌─────────┐     1:N      ┌──────────────┐
│ Video   │─────────────>│ Interaction  │ (likes, comments)
└─────────┘              └──────────────┘
     │
     │ N:M
     ▼
┌─────────┐     1:N      ┌──────────────┐
│ User    │─────────────>│ Bookmark     │
└─────────┘              └──────────────┘
```

**Note**: User and Interaction entities will be defined in separate features.

---

## Performance Considerations

### Query Performance

**Expected Load**:
- 1,000 videos in database (initial sync)
- 100 concurrent users scrolling
- 15 videos per page
- Average 3 pages per session = 45 videos viewed

**Query Latency** (with indexes):
- First page (no cursor): ~10-20ms
- Subsequent pages (with cursor): ~10-20ms
- Sync operation (upsert 20 videos): ~50-100ms

**Index Size**:
- 1,000 videos: ~150 KB
- 10,000 videos: ~1.5 MB
- 100,000 videos: ~15 MB

**Scaling**:
- MongoDB can handle 100K+ videos with sub-50ms query times
- Indexes fit in RAM for fast lookups
- Sharding not needed until 10M+ videos

### Caching Strategy

**TanStack Query Cache**:
- Stale time: 30 minutes (videos don't change frequently)
- Cache key: `['videos', 'infinite', { cursor }]`
- Garbage collection: After 5 minutes of inactivity

**Expected Cache Hit Rate**: ~80% (users scrolling back/forth)

---

## Migration Plan

### Initial Setup (First Deployment)

1. **Create Collection**:
   ```javascript
   db.createCollection("videos");
   ```

2. **Create Indexes**:
   ```javascript
   db.videos.createIndex({ pexelsId: 1 }, { unique: true });
   db.videos.createIndex({ uploadedAt: -1, _id: -1 });
   ```

3. **Initial Sync**:
   ```typescript
   // Run via tRPC procedure or admin script
   for (let page = 1; page <= 10; page++) {
     await trpc.videos.syncFromPexels.mutate({ page, perPage: 20 });
   }
   // Result: 200 videos synced
   ```

### Future Schema Changes

If schema changes are needed (e.g., adding new fields):

1. **Add field to interface** (lib/db/models/video.ts)
2. **Update Zod schema** (for validation)
3. **Migration script** (backfill existing documents)
4. **Update indexes** (if querying new field)

**Example Migration** (adding `viewCount` field):
```javascript
db.videos.updateMany(
  { viewCount: { $exists: false } },
  { $set: { viewCount: 0 } }
);
```

---

## References

- [MongoDB Schema Design Best Practices](https://www.mongodb.com/docs/manual/core/data-model-design/)
- [Cursor-Based Pagination](https://www.mongodb.com/docs/manual/reference/method/cursor.skip/)
- [MongoDB Indexes](https://www.mongodb.com/docs/manual/indexes/)
- [Zod Validation](https://zod.dev/)

---

**Status**: ✅ Data Model Complete  
**Next Phase**: Contract Definition (Phase 1 continued)
