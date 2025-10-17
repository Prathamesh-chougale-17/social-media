# API Contract: videos.getInfinite

**Contract Type**: tRPC Query Procedure  
**Feature**: Infinite Scroll Video Feed  
**Router**: `videos`  
**Procedure**: `getInfinite`

---

## Overview

This procedure retrieves a paginated list of videos using cursor-based pagination for infinite scroll. It supports server-side prefetching in server components and client-side infinite queries with TanStack Query.

**Alignment with Principles**:
- **Principle III**: tRPC-first data fetching
- **Principle V**: TanStack Query integration
- **Principle II**: Server component compatible (returns serializable data)

---

## Procedure Definition

### Route

```typescript
// trpc/routers/videos.ts
export const videosRouter = router({
  getInfinite: publicProcedure
    .input(GetInfiniteVideosInputSchema)
    .output(GetInfiniteVideosOutputSchema)
    .query(async ({ input, ctx }) => {
      // Implementation in separate section
    }),
});
```

### Visibility

- **Public**: ✅ (No authentication required)
- **Protected**: ❌
- **Admin**: ❌

**Rationale**: Videos are public content from Pexels API. No user authentication needed for browsing.

---

## Input Schema

### TypeScript Interface

```typescript
interface GetInfiniteVideosInput {
  limit?: number;                   // Videos per page (default: 15)
  cursor?: string;                  // Base64-encoded cursor for pagination
}
```

### Zod Schema

```typescript
import { z } from 'zod';

export const GetInfiniteVideosInputSchema = z.object({
  limit: z.number().int().min(1).max(50).default(15),
  cursor: z.string().optional(),
});

export type GetInfiniteVideosInput = z.infer<typeof GetInfiniteVideosInputSchema>;
```

### Field Descriptions

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `limit` | number | No | 15 | 1-50 | Number of videos to return per page |
| `cursor` | string | No | undefined | Base64 string | Pagination cursor (from previous response) |

### Examples

**First Page Request** (no cursor):
```typescript
const input = {
  limit: 15,
};
```

**Second Page Request** (with cursor):
```typescript
const input = {
  limit: 15,
  cursor: "eyJ1cGxvYWRlZEF0IjoiMjAyNC0wMS0xNVQxMjozMDowMC4wMDBaIiwiaWQiOiI2NWE1ZjQ4ZTljNzJlYjAwMTIzNDU2NzgifQ==",
};
```

**Custom Page Size**:
```typescript
const input = {
  limit: 30, // Load more videos per page
};
```

### Validation Rules

1. **limit**: Must be between 1 and 50
   - Prevents excessive database queries
   - Ensures reasonable network payload size
   
2. **cursor**: Must be valid base64 string (if provided)
   - Decoded to extract uploadedAt and _id
   - Invalid cursor returns validation error

**Error Scenarios**:
- `limit: 0` → `ZodError: Number must be greater than or equal to 1`
- `limit: 100` → `ZodError: Number must be less than or equal to 50`
- `cursor: "invalid"` → `TRPCError: Invalid cursor format`

---

## Output Schema

### TypeScript Interface

```typescript
interface GetInfiniteVideosOutput {
  items: Video[];                   // Array of video entities
  nextCursor: string | null;        // Cursor for next page (null if no more)
  hasMore: boolean;                 // Whether more videos exist
}
```

### Zod Schema

```typescript
import { VideoSchema } from '@/lib/db/models/video';

export const GetInfiniteVideosOutputSchema = z.object({
  items: z.array(VideoSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export type GetInfiniteVideosOutput = z.infer<typeof GetInfiniteVideosOutputSchema>;
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `items` | Video[] | Array of video entities (max length = input.limit) |
| `nextCursor` | string \| null | Base64-encoded cursor for next page. `null` if last page. |
| `hasMore` | boolean | `true` if more videos exist, `false` if last page |

### Video Entity Structure

See `data-model.md` for full `Video` interface. Key fields:

```typescript
interface Video {
  id: string;                       // MongoDB _id
  pexelsId: number;
  title: string;
  creator: { name: string; url: string };
  duration: number;
  thumbnailUrl: string;
  videoUrls: {
    tiny: string;
    small: string;
    medium: string;
    large: string;
    hd: string | null;
    fullHd: string | null;
  };
  uploadedAt: Date;
  // ... other fields
}
```

### Examples

**First Page Response** (has more):
```typescript
{
  items: [
    {
      id: "65a5f48e9c72eb0012345678",
      pexelsId: 123456,
      title: "Beautiful Sunset",
      creator: { name: "John Doe", url: "https://pexels.com/@johndoe" },
      duration: 15,
      thumbnailUrl: "https://images.pexels.com/...",
      videoUrls: { tiny: "https://...", small: "https://...", /* ... */ },
      uploadedAt: new Date("2024-01-15T12:30:00Z"),
      // ...
    },
    // ... 14 more videos
  ],
  nextCursor: "eyJ1cGxvYWRlZEF0IjoiMjAyNC0wMS0xNFQxMDoxNTowMC4wMDBaIiwiaWQiOiI2NWE1ZTIzZDhjNzJlYjAwMTIzNDU2NzkifQ==",
  hasMore: true,
}
```

**Last Page Response** (no more):
```typescript
{
  items: [
    // ... 8 videos (less than limit)
  ],
  nextCursor: null,
  hasMore: false,
}
```

**Empty Response** (no videos in database):
```typescript
{
  items: [],
  nextCursor: null,
  hasMore: false,
}
```

---

## Implementation

### MongoDB Query Logic

```typescript
import { MongoClient, ObjectId } from 'mongodb';
import { TRPCError } from '@trpc/server';

export async function getInfiniteVideos(input: GetInfiniteVideosInput) {
  const { limit, cursor } = input;
  
  // Build query filter
  let query = {};
  if (cursor) {
    try {
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
    } catch (error) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid cursor format',
      });
    }
  }

  // Fetch limit + 1 to check for more pages
  const videoDocs = await db
    .collection('videos')
    .find(query)
    .sort({ uploadedAt: -1, _id: -1 })
    .limit(limit + 1)
    .toArray();

  // Determine if there are more pages
  const hasMore = videoDocs.length > limit;
  const items = hasMore ? videoDocs.slice(0, limit) : videoDocs;

  // Generate next cursor from last item
  const nextCursor = hasMore ? encodeCursor(items[items.length - 1]) : null;

  // Transform MongoDB documents to Video entities
  return {
    items: items.map(transformVideoDocument),
    nextCursor,
    hasMore,
  };
}
```

### Cursor Encoding/Decoding

```typescript
interface CursorData {
  uploadedAt: string;               // ISO date string
  id: string;                       // MongoDB _id as string
}

function encodeCursor(doc: VideoDocument): string {
  const data: CursorData = {
    uploadedAt: doc.uploadedAt.toISOString(),
    id: doc._id.toString(),
  };
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

function decodeCursor(cursor: string): CursorData {
  const json = Buffer.from(cursor, 'base64').toString('utf-8');
  return JSON.parse(json);
}
```

### Document Transformation

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

## Error Handling

### Error Codes

| Code | Scenario | HTTP Status | Message |
|------|----------|-------------|---------|
| `BAD_REQUEST` | Invalid cursor format | 400 | "Invalid cursor format" |
| `INTERNAL_SERVER_ERROR` | Database connection error | 500 | "Failed to fetch videos" |
| `INTERNAL_SERVER_ERROR` | Cursor decode error | 500 | "Failed to decode cursor" |

### Error Response Format

```typescript
{
  error: {
    message: "Invalid cursor format",
    code: "BAD_REQUEST",
    data: {
      code: "BAD_REQUEST",
      httpStatus: 400,
      path: "videos.getInfinite",
    },
  },
}
```

### Client Error Handling

```typescript
// In React component
const { data, error, fetchNextPage, hasNextPage } = trpc.videos.getInfinite.useInfiniteQuery(
  { limit: 15 },
  {
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  }
);

if (error) {
  if (error.data?.code === 'BAD_REQUEST') {
    return <div>Invalid request. Please refresh the page.</div>;
  }
  return <div>Failed to load videos. Please try again.</div>;
}
```

---

## Usage Examples

### Server Component (Prefetch)

```typescript
// app/page.tsx (Server Component)
import { createCaller } from '@/trpc/server';

export default async function HomePage() {
  const trpc = await createCaller();
  
  // Prefetch first page
  const initialData = await trpc.videos.getInfinite({
    limit: 15,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <InfiniteVideoList initialData={initialData} />
    </HydrationBoundary>
  );
}
```

### Client Component (Infinite Query)

```typescript
// components/infinite-video-list.tsx (Client Component)
'use client';

import { trpc } from '@/trpc/client';

export function InfiniteVideoList() {
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = trpc.videos.getInfinite.useInfiniteQuery(
    { limit: 15 },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      staleTime: 1000 * 60 * 30, // 30 minutes
    }
  );

  // Flatten pages into single array
  const allVideos = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div>
      {allVideos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
      
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

### Intersection Observer (Auto-load)

```typescript
// Auto-load more videos when scrolling near bottom
const { ref, inView } = useInView();

React.useEffect(() => {
  if (inView && hasNextPage && !isFetchingNextPage) {
    fetchNextPage();
  }
}, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

return (
  <div>
    {allVideos.map((video) => (
      <VideoCard key={video.id} video={video} />
    ))}
    
    {/* Trigger when this div enters viewport */}
    <div ref={ref} className="h-20" />
    
    {isFetchingNextPage && <LoadingSpinner />}
  </div>
);
```

---

## Performance Considerations

### Query Performance

**Expected Latency**:
- First page (no cursor): ~10-20ms
- Subsequent pages (with cursor): ~10-20ms
- Total round-trip (client → server → MongoDB → client): ~50-100ms

**Optimizations**:
1. **Compound Index**: `{ uploadedAt: -1, _id: -1 }` allows efficient cursor queries
2. **Limit + 1**: Fetch one extra document to check `hasMore` without separate count query
3. **Projection**: Could add projection to exclude unused fields (future optimization)

### Caching Strategy

**TanStack Query**:
- **Stale Time**: 30 minutes (videos don't change frequently)
- **Cache Key**: `['videos', 'getInfinite', { limit }]`
- **GC Time**: 5 minutes after inactivity

**Expected Cache Hit Rate**: ~80% (users scroll back/forth)

### Pagination Limits

| Scenario | Limit | Rationale |
|----------|-------|-----------|
| Mobile | 10-15 | Smaller viewport, slower networks |
| Desktop | 15-20 | Larger viewport, faster networks |
| Maximum | 50 | Prevent excessive database load |

**Recommended**: Start with `limit: 15` for all devices, adjust based on metrics.

---

## Testing

### Unit Tests

```typescript
describe('videos.getInfinite', () => {
  it('should return first page without cursor', async () => {
    const result = await caller.videos.getInfinite({ limit: 15 });
    expect(result.items).toHaveLength(15);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBeDefined();
  });

  it('should return next page with cursor', async () => {
    const page1 = await caller.videos.getInfinite({ limit: 15 });
    const page2 = await caller.videos.getInfinite({
      limit: 15,
      cursor: page1.nextCursor!,
    });
    expect(page2.items).toHaveLength(15);
    expect(page2.items[0].id).not.toBe(page1.items[0].id);
  });

  it('should return empty array if no videos', async () => {
    await db.collection('videos').deleteMany({});
    const result = await caller.videos.getInfinite({ limit: 15 });
    expect(result.items).toHaveLength(0);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it('should throw error for invalid cursor', async () => {
    await expect(
      caller.videos.getInfinite({ cursor: 'invalid-cursor' })
    ).rejects.toThrow('Invalid cursor format');
  });
});
```

### Integration Tests

```typescript
describe('videos.getInfinite (integration)', () => {
  it('should paginate through all videos', async () => {
    // Seed 50 videos
    await seedVideos(50);

    const allVideos: Video[] = [];
    let cursor: string | undefined;

    // Fetch all pages
    for (let i = 0; i < 5; i++) {
      const result = await caller.videos.getInfinite({ limit: 10, cursor });
      allVideos.push(...result.items);
      if (!result.hasMore) break;
      cursor = result.nextCursor!;
    }

    expect(allVideos).toHaveLength(50);
    expect(new Set(allVideos.map((v) => v.id)).size).toBe(50); // No duplicates
  });
});
```

---

## Security Considerations

1. **Rate Limiting**: Implement rate limiting to prevent abuse
   - Max 100 requests per minute per IP
   - Use middleware or API gateway

2. **Input Validation**: Zod schema prevents malicious input
   - Cursor must be valid base64
   - Limit is capped at 50

3. **SQL Injection**: Not applicable (using MongoDB native driver)
   - No raw queries or string interpolation

4. **Data Exposure**: Videos are public content
   - No sensitive data in response
   - No user-specific information

---

## Future Enhancements

1. **Filtering**: Add filter parameters (e.g., `minDuration`, `maxDuration`)
2. **Sorting**: Support multiple sort orders (e.g., `newest`, `longest`, `shortest`)
3. **Search**: Add text search on title and creator name
4. **Projection**: Return minimal fields for better performance
5. **ETags**: Implement caching headers for CDN

---

## References

- [tRPC Infinite Queries](https://trpc.io/docs/client/react/useInfiniteQuery)
- [TanStack Query Infinite Queries](https://tanstack.com/query/latest/docs/react/guides/infinite-queries)
- [MongoDB Cursor-Based Pagination](https://www.mongodb.com/blog/post/paging-with-the-bucket-pattern--part-1)

---

**Status**: ✅ Contract Complete  
**Next**: Create `syncFromPexels.md` contract
