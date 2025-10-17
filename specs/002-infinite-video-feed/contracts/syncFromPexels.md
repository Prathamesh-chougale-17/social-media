# API Contract: videos.syncFromPexels

**Contract Type**: tRPC Mutation Procedure  
**Feature**: Infinite Scroll Video Feed  
**Router**: `videos`  
**Procedure**: `syncFromPexels`

---

## Overview

This procedure synchronizes videos from the Pexels API to the local MongoDB database. It fetches popular videos from Pexels and upserts them into the `videos` collection, ensuring no duplicates.

**Alignment with Principles**:
- **Principle III**: tRPC-first data operations
- **Principle VIII**: MongoDB with typed schemas
- **Principle IX**: Pexels content integration

**Use Cases**:
1. **Initial Database Seeding**: Admin runs this to populate database with videos
2. **Periodic Sync**: Scheduled job to refresh video catalog (e.g., daily)
3. **Manual Refresh**: Admin trigger to update videos on-demand

---

## Procedure Definition

### Route

```typescript
// trpc/routers/videos.ts
export const videosRouter = router({
  syncFromPexels: publicProcedure  // TODO: Change to protectedProcedure with admin check
    .input(SyncFromPexelsInputSchema)
    .output(SyncFromPexelsOutputSchema)
    .mutation(async ({ input, ctx }) => {
      // Implementation in separate section
    }),
});
```

### Visibility

- **Public**: ❌ (Temporary for development)
- **Protected**: ⏳ (Should require admin authentication)
- **Admin**: ✅ (Final implementation)

**Security Note**: This procedure should be restricted to admin users only. In MVP, it's temporarily public for easier testing, but MUST be protected before production deployment.

---

## Input Schema

### TypeScript Interface

```typescript
interface SyncFromPexelsInput {
  page?: number;                    // Pexels API page number (default: 1)
  perPage?: number;                 // Videos per page (default: 20)
}
```

### Zod Schema

```typescript
import { z } from 'zod';

export const SyncFromPexelsInputSchema = z.object({
  page: z.number().int().min(1).max(100).default(1),
  perPage: z.number().int().min(1).max(80).default(20),
});

export type SyncFromPexelsInput = z.infer<typeof SyncFromPexelsInputSchema>;
```

### Field Descriptions

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `page` | number | No | 1 | 1-100 | Pexels API page number to fetch |
| `perPage` | number | No | 20 | 1-80 | Number of videos per page (Pexels API limit: 80) |

### Examples

**Default Sync** (first page, 20 videos):
```typescript
const input = {};
// Equivalent to: { page: 1, perPage: 20 }
```

**Custom Page**:
```typescript
const input = {
  page: 2,
  perPage: 20,
};
```

**Large Batch** (max allowed):
```typescript
const input = {
  page: 1,
  perPage: 80, // Pexels API maximum
};
```

**Initial Seeding** (multiple pages):
```typescript
// Sync first 200 videos
for (let page = 1; page <= 10; page++) {
  await trpc.videos.syncFromPexels.mutate({ page, perPage: 20 });
}
```

### Validation Rules

1. **page**: Must be between 1 and 100
   - Pexels API has pagination limits
   - Prevents excessive API calls

2. **perPage**: Must be between 1 and 80
   - Pexels API maximum is 80 per page
   - Prevents rate limiting issues

**Error Scenarios**:
- `page: 0` → `ZodError: Number must be greater than or equal to 1`
- `page: 150` → `ZodError: Number must be less than or equal to 100`
- `perPage: 100` → `ZodError: Number must be less than or equal to 80`

---

## Output Schema

### TypeScript Interface

```typescript
interface SyncFromPexelsOutput {
  success: boolean;                 // Whether sync completed successfully
  syncedCount: number;              // Number of videos synced
  skippedCount: number;             // Number of videos already in database
  totalFetched: number;             // Total videos fetched from Pexels API
  page: number;                     // Page number that was synced
  errors: string[];                 // Any errors encountered (non-fatal)
}
```

### Zod Schema

```typescript
export const SyncFromPexelsOutputSchema = z.object({
  success: z.boolean(),
  syncedCount: z.number().int().min(0),
  skippedCount: z.number().int().min(0),
  totalFetched: z.number().int().min(0),
  page: z.number().int(),
  errors: z.array(z.string()),
});

export type SyncFromPexelsOutput = z.infer<typeof SyncFromPexelsOutputSchema>;
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | `true` if sync completed, `false` if fatal error |
| `syncedCount` | number | Number of new videos added to database |
| `skippedCount` | number | Number of videos already in database (duplicates) |
| `totalFetched` | number | Total videos fetched from Pexels API |
| `page` | number | The page number that was synced |
| `errors` | string[] | Array of non-fatal error messages (e.g., transformation failures) |

**Calculation**:
```
totalFetched = syncedCount + skippedCount + errors.length
```

### Examples

**Successful Sync** (new videos):
```typescript
{
  success: true,
  syncedCount: 18,
  skippedCount: 2,
  totalFetched: 20,
  page: 1,
  errors: [],
}
```

**Partial Sync** (some duplicates):
```typescript
{
  success: true,
  syncedCount: 5,
  skippedCount: 15,
  totalFetched: 20,
  page: 3,
  errors: [],
}
```

**Full Duplicates** (all videos already synced):
```typescript
{
  success: true,
  syncedCount: 0,
  skippedCount: 20,
  totalFetched: 20,
  page: 1,
  errors: [],
}
```

**Sync with Errors** (some videos failed):
```typescript
{
  success: true,
  syncedCount: 17,
  skippedCount: 0,
  totalFetched: 20,
  page: 1,
  errors: [
    "Failed to transform video 123456: Missing video files",
    "Failed to transform video 789012: Invalid thumbnail URL",
    "Failed to upsert video 345678: Validation error",
  ],
}
```

**Fatal Error** (API failure):
```typescript
{
  success: false,
  syncedCount: 0,
  skippedCount: 0,
  totalFetched: 0,
  page: 1,
  errors: [
    "Pexels API error: 429 Too Many Requests",
  ],
}
```

---

## Implementation

### High-Level Flow

```
1. Validate input (Zod)
2. Fetch videos from Pexels API
3. Transform Pexels videos to MongoDB schema
4. Upsert videos to database (using pexelsId as unique key)
5. Return sync statistics
```

### Pexels API Integration

```typescript
import { createClient } from 'pexels';

const pexelsClient = createClient(process.env.PEXELS_API_KEY!);

async function fetchPexelsVideos(page: number, perPage: number) {
  try {
    const response = await pexelsClient.videos.popular({ page, per_page: perPage });
    
    if (!response || typeof response === 'string') {
      throw new Error('Invalid Pexels API response');
    }
    
    return response.videos;
  } catch (error) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Pexels API error: ${error.message}`,
      cause: error,
    });
  }
}
```

### Video Transformation

```typescript
function transformPexelsVideo(pexelsVideo: PexelsVideo): Omit<VideoDocument, '_id'> | null {
  try {
    // Group video files by quality
    const videoUrls = extractVideoUrls(pexelsVideo.video_files);
    
    if (!videoUrls) {
      return null; // Skip videos with no valid URLs
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
      tags: [], // Pexels API doesn't provide tags for popular videos
      uploadedAt: new Date(), // Pexels doesn't provide upload date
      syncedAt: new Date(),
    };
  } catch (error) {
    console.error(`Failed to transform video ${pexelsVideo.id}:`, error);
    return null;
  }
}

function extractVideoUrls(videoFiles: PexelsVideoFile[]): VideoUrls | null {
  const urlMap: Partial<VideoUrls> = {};
  
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

function getQualityKey(width: number, height: number): keyof VideoUrls | null {
  const maxDim = Math.max(width, height);
  
  if (maxDim <= 640) return 'tiny';
  if (maxDim <= 960) return 'small';
  if (maxDim <= 1280) return 'medium';
  if (maxDim <= 1920) return 'large';
  if (maxDim <= 2560) return 'hd';
  if (maxDim <= 3840) return 'fullHd';
  
  return null; // Skip extremely high resolution videos
}
```

### Database Upsert

```typescript
async function syncVideos(videos: Omit<VideoDocument, '_id'>[]): Promise<{
  syncedCount: number;
  skippedCount: number;
}> {
  const db = await getDatabase();
  const collection = db.collection<VideoDocument>('videos');
  
  let syncedCount = 0;
  let skippedCount = 0;
  
  for (const video of videos) {
    try {
      const result = await collection.updateOne(
        { pexelsId: video.pexelsId },
        { $setOnInsert: video }, // Only insert if doesn't exist
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
```

### Full Procedure Implementation

```typescript
export const videosRouter = router({
  syncFromPexels: publicProcedure
    .input(SyncFromPexelsInputSchema)
    .output(SyncFromPexelsOutputSchema)
    .mutation(async ({ input }) => {
      const { page, perPage } = input;
      const errors: string[] = [];
      
      try {
        // 1. Fetch videos from Pexels
        const pexelsVideos = await fetchPexelsVideos(page, perPage);
        const totalFetched = pexelsVideos.length;
        
        // 2. Transform videos
        const transformedVideos: Omit<VideoDocument, '_id'>[] = [];
        for (const pexelsVideo of pexelsVideos) {
          const transformed = transformPexelsVideo(pexelsVideo);
          if (transformed) {
            transformedVideos.push(transformed);
          } else {
            errors.push(`Failed to transform video ${pexelsVideo.id}: Missing required data`);
          }
        }
        
        // 3. Upsert to database
        const { syncedCount, skippedCount } = await syncVideos(transformedVideos);
        
        return {
          success: true,
          syncedCount,
          skippedCount,
          totalFetched,
          page,
          errors,
        };
      } catch (error) {
        return {
          success: false,
          syncedCount: 0,
          skippedCount: 0,
          totalFetched: 0,
          page,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
        };
      }
    }),
});
```

---

## Error Handling

### Error Types

| Error Type | Code | HTTP Status | Description |
|------------|------|-------------|-------------|
| Pexels API Error | `INTERNAL_SERVER_ERROR` | 500 | Pexels API request failed |
| Database Error | `INTERNAL_SERVER_ERROR` | 500 | MongoDB connection/query failed |
| Transformation Error | N/A | 200 | Non-fatal, returned in `errors[]` |
| Validation Error | `BAD_REQUEST` | 400 | Input validation failed |

### Pexels API Error Scenarios

```typescript
// Rate limiting
{
  success: false,
  errors: ["Pexels API error: 429 Too Many Requests"],
}

// Invalid API key
{
  success: false,
  errors: ["Pexels API error: 401 Unauthorized"],
}

// Network error
{
  success: false,
  errors: ["Pexels API error: ECONNREFUSED"],
}
```

### Partial Success Handling

The procedure uses **non-fatal error handling** for individual video transformations:

```typescript
// If 3 out of 20 videos fail transformation:
{
  success: true,              // Overall sync succeeded
  syncedCount: 17,
  skippedCount: 0,
  totalFetched: 20,
  page: 1,
  errors: [
    "Failed to transform video 123456: Missing video files",
    "Failed to transform video 789012: Invalid thumbnail URL",
    "Failed to upsert video 345678: Validation error",
  ],
}
```

**Rationale**: Don't fail entire sync if a few videos are invalid. This allows maximum data ingestion.

---

## Usage Examples

### Admin Panel Trigger

```typescript
// components/admin/sync-videos-button.tsx
'use client';

import { trpc } from '@/trpc/client';
import { Button } from '@/components/ui/button';

export function SyncVideosButton() {
  const syncMutation = trpc.videos.syncFromPexels.useMutation();
  
  const handleSync = async () => {
    const result = await syncMutation.mutateAsync({ page: 1, perPage: 20 });
    
    if (result.success) {
      console.log(`Synced ${result.syncedCount} videos, skipped ${result.skippedCount}`);
    } else {
      console.error('Sync failed:', result.errors);
    }
  };
  
  return (
    <Button onClick={handleSync} disabled={syncMutation.isPending}>
      {syncMutation.isPending ? 'Syncing...' : 'Sync Videos from Pexels'}
    </Button>
  );
}
```

### Initial Database Seeding Script

```typescript
// scripts/seed-videos.ts
import { createCaller } from '@/trpc/server';

async function seedVideos() {
  const trpc = await createCaller();
  
  console.log('Starting video sync...');
  
  for (let page = 1; page <= 10; page++) {
    console.log(`Syncing page ${page}...`);
    
    const result = await trpc.videos.syncFromPexels({ page, perPage: 20 });
    
    console.log(`  Synced: ${result.syncedCount}, Skipped: ${result.skippedCount}`);
    
    if (result.errors.length > 0) {
      console.warn(`  Errors: ${result.errors.join(', ')}`);
    }
    
    // Rate limiting: wait 1 second between pages
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  
  console.log('Video sync complete!');
}

seedVideos().catch(console.error);
```

Run with:
```bash
npx tsx scripts/seed-videos.ts
```

### Scheduled Sync Job (Cron)

```typescript
// app/api/cron/sync-videos/route.ts
import { createCaller } from '@/trpc/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Verify cron secret (Vercel Cron Jobs)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const trpc = await createCaller();
  
  // Sync first 3 pages (60 videos) daily
  const results = [];
  for (let page = 1; page <= 3; page++) {
    const result = await trpc.videos.syncFromPexels({ page, perPage: 20 });
    results.push(result);
    
    // Wait 1 second between requests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  
  const totalSynced = results.reduce((sum, r) => sum + r.syncedCount, 0);
  const totalSkipped = results.reduce((sum, r) => sum + r.skippedCount, 0);
  
  return NextResponse.json({
    success: true,
    totalSynced,
    totalSkipped,
    results,
  });
}
```

**Vercel Cron Configuration** (vercel.json):
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-videos",
      "schedule": "0 2 * * *"  // Daily at 2 AM UTC
    }
  ]
}
```

---

## Rate Limiting

### Pexels API Limits

- **Free Tier**: 200 requests per hour
- **Recommended**: 1 request per second (to stay within limits)

### Implementation

```typescript
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

async function fetchPexelsVideos(page: number, perPage: number) {
  await pexelsRateLimiter.throttle();
  return pexelsClient.videos.popular({ page, per_page: perPage });
}
```

---

## Testing

### Unit Tests

```typescript
describe('videos.syncFromPexels', () => {
  it('should sync videos successfully', async () => {
    const result = await caller.videos.syncFromPexels({ page: 1, perPage: 20 });
    
    expect(result.success).toBe(true);
    expect(result.syncedCount).toBeGreaterThan(0);
    expect(result.totalFetched).toBe(20);
    expect(result.errors).toHaveLength(0);
  });
  
  it('should skip duplicate videos', async () => {
    // First sync
    await caller.videos.syncFromPexels({ page: 1, perPage: 20 });
    
    // Second sync (same page)
    const result = await caller.videos.syncFromPexels({ page: 1, perPage: 20 });
    
    expect(result.success).toBe(true);
    expect(result.syncedCount).toBe(0);
    expect(result.skippedCount).toBe(20);
  });
  
  it('should handle Pexels API errors gracefully', async () => {
    // Mock Pexels API to throw error
    vi.spyOn(pexelsClient.videos, 'popular').mockRejectedValue(
      new Error('429 Too Many Requests')
    );
    
    const result = await caller.videos.syncFromPexels({ page: 1, perPage: 20 });
    
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('429 Too Many Requests');
  });
});
```

### Integration Tests

```typescript
describe('videos.syncFromPexels (integration)', () => {
  it('should sync multiple pages without duplicates', async () => {
    const results = [];
    
    for (let page = 1; page <= 3; page++) {
      const result = await caller.videos.syncFromPexels({ page, perPage: 20 });
      results.push(result);
    }
    
    const totalSynced = results.reduce((sum, r) => sum + r.syncedCount, 0);
    expect(totalSynced).toBeGreaterThanOrEqual(40); // At least 40 unique videos
    
    // Verify no duplicates in database
    const allVideos = await db.collection('videos').find({}).toArray();
    const uniquePexelsIds = new Set(allVideos.map((v) => v.pexelsId));
    expect(uniquePexelsIds.size).toBe(allVideos.length);
  });
});
```

---

## Security Considerations

1. **Authentication**: MUST be protected with admin authentication before production
   ```typescript
   // TODO: Add admin check
   syncFromPexels: protectedProcedure
     .input(...)
     .use(async ({ ctx, next }) => {
       if (!ctx.user?.isAdmin) {
         throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
       }
       return next();
     })
     .mutation(...)
   ```

2. **API Key Protection**: Pexels API key must be in environment variables
   ```bash
   PEXELS_API_KEY=your_secret_key
   ```

3. **Rate Limiting**: Implement application-level rate limiting
   - Prevent users from spamming sync requests
   - Use Redis or in-memory cache for rate limiting

4. **Input Validation**: Zod schema prevents malicious input
   - Page and perPage are bounded integers
   - No user-provided URLs or SQL injection risks

---

## Monitoring

### Metrics to Track

1. **Sync Success Rate**: `syncedCount / totalFetched`
2. **Duplicate Rate**: `skippedCount / totalFetched`
3. **Error Rate**: `errors.length / totalFetched`
4. **API Latency**: Time to fetch from Pexels API
5. **Database Latency**: Time to upsert videos

### Logging

```typescript
console.log({
  event: 'video_sync',
  page,
  syncedCount,
  skippedCount,
  totalFetched,
  errors: errors.length,
  duration: Date.now() - startTime,
});
```

---

## Future Enhancements

1. **Webhook Integration**: Listen for Pexels webhooks for real-time updates
2. **Selective Sync**: Add filters (e.g., only sync videos > 10 seconds)
3. **Batch Processing**: Use bulk write operations for faster database inserts
4. **Retry Logic**: Retry failed transformations with exponential backoff
5. **Pagination Cursor**: Use Pexels pagination cursor instead of page numbers

---

## References

- [Pexels API Documentation](https://www.pexels.com/api/documentation/)
- [Pexels Videos Endpoint](https://www.pexels.com/api/documentation/#videos-popular)
- [MongoDB Upsert Operations](https://www.mongodb.com/docs/manual/reference/method/db.collection.updateOne/)

---

**Status**: ✅ Contract Complete  
**Next Phase**: Task Generation via `/speckit.tasks`
