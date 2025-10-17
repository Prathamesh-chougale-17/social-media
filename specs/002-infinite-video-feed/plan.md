# Implementation Plan: Infinite Scroll Video Feed

**Branch**: `002-infinite-video-feed` | **Date**: 2025-10-17 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/002-infinite-video-feed/spec.md`

## Summary

Create an infinite scroll video feed displaying videos from Pexels API with automatic loading as users scroll. Videos are synced from Pexels to MongoDB for fast retrieval and consistent UX. The implementation uses Next.js 15 server components for initial load with tRPC infinite queries for client-side pagination, following cursor-based pagination for optimal performance.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)  
**Primary Dependencies**: Next.js 15.5.6, tRPC 11.6.0, TanStack Query 5.90.5, Zod  
**Storage**: MongoDB (videos collection with indexes on pexelsId and uploadedAt)  
**Testing**: Vitest (unit), Playwright (E2E)  
**Target Platform**: Web (Chrome, Firefox, Safari, Edge)  
**Project Type**: Web application (Next.js App Router)  
**Performance Goals**: <3s initial load, <2s scroll-triggered load, smooth 60fps scrolling  
**Constraints**: <200ms tRPC procedure latency, Pexels API rate limits (200 req/hour free tier)  
**Scale/Scope**: Handle 1000+ videos in feed, 10-20 videos per batch, responsive 320px-1920px+

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ Principle I: Type Safety & DX
- All functions have explicit return types
- No `any` types allowed
- tRPC procedures define Zod schemas for input/output
- MongoDB documents have TypeScript interfaces

### ✅ Principle II: Server Components
- `app/(videos)/page.tsx` is server component with prefetch
- Client boundary only for `InfiniteVideoList` component (requires `useInfiniteQuery` hook)
- No unnecessary client components

### ✅ Principle III: tRPC-First Data
- All video fetching through `trpc.videos.getInfinite` procedure
- No direct MongoDB queries from components
- Pexels sync through `trpc.videos.syncFromPexels` procedure

### ✅ Principle IV: URL State (Nuqs)
- Feed cursor stored in URL query param for shareable links
- Browser back/forward support for pagination state
- **Note**: For this MVP, cursor is optional (can be added in v2)

### ✅ Principle V: TanStack Query
- `useInfiniteQuery` for client-side infinite scroll
- Server-side prefetch with `prefetchInfinite` in page.tsx
- Stale time: 30 minutes (trending videos, stable content)
- Proper cache invalidation on sync

### ✅ Principle VI: Forms
- No forms in this feature (N/A)

### ✅ Principle VII: Component Composition
- Use shadcn/ui `Card`, `Skeleton`, `Badge` as foundation
- Create Kibo UI `VideoCard` component composing shadcn components
- Create `VideoGrid` layout component with responsive grid

### ✅ Principle VIII: MongoDB Schemas
- `videos` collection with strict TypeScript interface
- Indexes: `pexelsId` (unique), `uploadedAt` (sort for cursor pagination)
- Validation in `lib/db/models/video.ts`

### ✅ Principle IX: Pexels Content
- Pexels API accessed only from sync service (tRPC procedure)
- No direct client access to Pexels
- Videos stored in MongoDB after sync

### ✅ Principle X: Auth
- No auth required for this feature (public video feed)
- Future: Mutations will check `ctx.userId`

**Gate Status**: ✅ **PASSED** - All principles satisfied

## Project Structure

### Documentation (this feature)

```
specs/002-infinite-video-feed/
├── spec.md              # Feature specification
├── plan.md              # This file (implementation plan)
├── research.md          # Phase 0: Technical decisions
├── data-model.md        # Phase 1: MongoDB schema
├── contracts/           # Phase 1: tRPC procedure contracts
│   ├── getInfinite.md   # Infinite query contract
│   └── syncFromPexels.md # Sync procedure contract
└── tasks.md             # Phase 2: Task breakdown (via /speckit.tasks)
```

### Source Code (repository root)

```
social-media/
├── app/
│   └── (videos)/
│       ├── layout.tsx              # NEW: Videos section layout
│       └── page.tsx                # NEW: Server component with prefetch
│
├── components/
│   ├── ui/                         # EXISTS: shadcn/ui components
│   ├── kibo-ui/
│   │   └── video/
│   │       ├── video-card.tsx      # NEW: Kibo UI VideoCard component
│   │       └── video-grid.tsx      # NEW: Responsive grid layout
│   └── videos/
│       ├── infinite-video-list.tsx # NEW: Client component with useInfiniteQuery
│       ├── video-card-skeleton.tsx # NEW: Skeleton loader
│       └── empty-feed.tsx          # NEW: Empty state component
│
├── lib/
│   ├── db/
│   │   ├── models/
│   │   │   └── video.ts            # NEW: Video TypeScript interface & schema
│   │   └── queries/
│   │       └── videos.ts           # NEW: MongoDB video queries
│   ├── pexels-client.ts            # NEW: Pexels API wrapper
│   └── utils.ts                    # EXISTS: Utility functions
│
├── trpc/
│   └── routers/
│       ├── _app.ts                 # UPDATE: Add videos router
│       └── videos.ts               # NEW: Videos tRPC router
│
├── types/
│   ├── pexels.ts                   # NEW: Pexels API types
│   └── video.ts                    # NEW: Video domain types
│
└── config/
    └── env.ts                      # UPDATE: Add PEXELS_API_KEY
```

**Structure Decision**: Web application structure (Option 2 from template). Next.js App Router with separate concerns: app/ for pages, components/ for UI, lib/ for business logic, trpc/ for API layer.

## Phase 0: Research & Technical Decisions

### Decision 1: Infinite Scroll Implementation

**Chosen**: TanStack Query `useInfiniteQuery` with Intersection Observer

**Rationale**:
- Native browser API (Intersection Observer) for scroll detection
- TanStack Query handles pagination state, caching, and deduplication automatically
- Cursor-based pagination prevents skipped/duplicate items
- Server-side prefetch improves initial load performance

**Alternatives Considered**:
- Manual scroll event listener: More complex, requires debouncing, hard to test
- React Virtualization: Overkill for initial MVP, adds complexity
- Load more button: Poor UX, requires manual interaction

### Decision 2: Pexels API Integration Pattern

**Chosen**: Background sync service (tRPC procedure) + MongoDB cache

**Rationale**:
- Decouples platform from Pexels availability/latency
- Enables future features (likes, comments) without Pexels dependency
- Respects Pexels rate limits (sync on schedule, not per-user request)
- Faster response times (query MongoDB vs external API)

**Alternatives Considered**:
- Direct Pexels API calls from client: Exposes API key, violates Principle IX
- Server-side proxy: Still couples to Pexels latency, no caching benefit
- CDN caching: Doesn't help with metadata, only images

### Decision 3: Cursor-Based Pagination Strategy

**Chosen**: MongoDB cursor using `uploadedAt` timestamp + `_id` tie-breaker

**Rationale**:
- Prevents duplicate/skipped videos when new content is added
- Efficient MongoDB query with compound index
- URL-friendly cursor (base64 encoded timestamp + ID)
- Supports bidirectional pagination (future feature)

**Alternatives Considered**:
- Offset/limit pagination: Vulnerable to duplicates when data changes
- Page numbers: Poor UX for infinite scroll, same duplicate issue
- Keyset pagination on ID only: Doesn't support time-based sorting

### Decision 4: Video Thumbnail Optimization

**Chosen**: Next.js `<Image>` component with Pexels CDN URLs

**Rationale**:
- Next.js Image provides automatic optimization (WebP, lazy loading, blur placeholder)
- Pexels serves images via CDN (fast, globally distributed)
- No need to re-host images (reduces storage costs)
- Fallback placeholder for broken image URLs

**Alternatives Considered**:
- Re-host all thumbnails: Expensive, redundant (Pexels already has CDN)
- Raw `<img>` tags: Miss out on Next.js optimizations, slower loads
- Base64 inline images: Bloats HTML, poor performance

## Phase 1: Design & Contracts

### Data Model

See [data-model.md](./data-model.md) for complete MongoDB schema.

**Summary**:
- `videos` collection with strict TypeScript interface
- Fields: `_id`, `pexelsId`, `title`, `creator`, `duration`, `thumbnailUrl`, `videoUrls`, `uploadedAt`, `syncedAt`
- Indexes: `{ pexelsId: 1 }` (unique), `{ uploadedAt: -1, _id: -1 }` (cursor pagination)

### tRPC Contracts

#### 1. `videos.getInfinite`

**Purpose**: Fetch paginated videos for infinite scroll

**Input Schema**:
```typescript
z.object({
  limit: z.number().min(1).max(50).default(15),
  cursor: z.string().optional(), // base64(uploadedAt|_id)
})
```

**Output Schema**:
```typescript
z.object({
  items: z.array(VideoSchema),
  nextCursor: z.string().nullable(),
})
```

**Logic**:
1. Decode cursor to `{ uploadedAt, id }`
2. Query MongoDB: `videos.find({ $or: [{ uploadedAt: { $lt: cursor.uploadedAt } }, { uploadedAt: cursor.uploadedAt, _id: { $lt: cursor.id } }] }).sort({ uploadedAt: -1, _id: -1 }).limit(limit + 1)`
3. If `results.length > limit`, encode last item as `nextCursor`
4. Return `{ items: results.slice(0, limit), nextCursor }`

See [contracts/getInfinite.md](./contracts/getInfinite.md) for full contract.

#### 2. `videos.syncFromPexels`

**Purpose**: Fetch videos from Pexels API and store in MongoDB

**Input Schema**:
```typescript
z.object({
  page: z.number().min(1).default(1),
  perPage: z.number().min(1).max(80).default(20),
})
```

**Output Schema**:
```typescript
z.object({
  synced: z.number(),
  total: z.number(),
  skipped: z.number(), // already exist
})
```

**Logic**:
1. Call Pexels API `/videos/popular?page={page}&per_page={perPage}`
2. Transform response to Video schema
3. Upsert to MongoDB (skip if `pexelsId` exists)
4. Return sync statistics

See [contracts/syncFromPexels.md](./contracts/syncFromPexels.md) for full contract.

### Component Architecture

```
Page (Server)
└── InfiniteVideoList (Client)
    ├── VideoGrid (Kibo UI)
    │   └── VideoCard (Kibo UI) × N
    │       ├── Card (shadcn)
    │       ├── Image (Next.js)
    │       ├── Badge (shadcn)
    │       └── [metadata text]
    ├── VideoCardSkeleton × N (shadcn Skeleton)
    ├── EmptyFeed (custom)
    └── ErrorMessage (custom)
```

**Responsibilities**:
- **Page (Server)**: Prefetch initial videos, render HydrateClient
- **InfiniteVideoList (Client)**: useInfiniteQuery, Intersection Observer, loading states
- **VideoGrid**: Responsive CSS Grid (1-4 columns based on viewport)
- **VideoCard**: Display thumbnail, title, creator, duration with hover effects
- **Skeletons**: Placeholder cards matching VideoCard dimensions

### File-by-File Implementation Plan

#### 1. Environment & Types

**Files**:
- `config/env.ts` - Add `PEXELS_API_KEY`
- `types/pexels.ts` - Pexels API response types
- `types/video.ts` - Domain Video type

**Order**: Do first (required by all other files)

#### 2. Database Layer

**Files**:
- `lib/db/models/video.ts` - Video interface, Zod schema, MongoDB indexes
- `lib/db/queries/videos.ts` - Query functions (getVideos, upsertVideo)

**Order**: Do second (required by tRPC routers)

#### 3. Pexels Integration

**Files**:
- `lib/pexels-client.ts` - Pexels API wrapper with error handling

**Order**: Do third (required by sync procedure)

#### 4. tRPC Routers

**Files**:
- `trpc/routers/videos.ts` - `getInfinite`, `syncFromPexels` procedures
- `trpc/routers/_app.ts` - Add videos router to app router

**Order**: Do fourth (required by components)

#### 5. UI Components

**Files**:
- `components/kibo-ui/video/video-card.tsx` - VideoCard component
- `components/kibo-ui/video/video-grid.tsx` - VideoGrid layout
- `components/videos/video-card-skeleton.tsx` - Skeleton loader
- `components/videos/empty-feed.tsx` - Empty state
- `components/videos/infinite-video-list.tsx` - Infinite scroll logic

**Order**: Do fifth (leaf components first, then container)

#### 6. Pages

**Files**:
- `app/(videos)/layout.tsx` - Videos section layout (optional, can be minimal)
- `app/(videos)/page.tsx` - Server component with prefetch

**Order**: Do last (depends on all components and tRPC)

## Testing Strategy

### Unit Tests

**Coverage**:
- `lib/pexels-client.ts` - Mock Pexels API responses
- `lib/db/queries/videos.ts` - Mock MongoDB operations
- `trpc/routers/videos.ts` - Test procedures with caller factory
- Video cursor encoding/decoding logic

**Tools**: Vitest, Mock Service Worker (MSW)

### Integration Tests

**Coverage**:
- tRPC procedures with real MongoDB (test database)
- Pexels sync flow (mock Pexels API, real MongoDB)
- Cursor pagination (verify no duplicates, correct ordering)

**Tools**: Vitest, MongoDB Memory Server

### E2E Tests

**Coverage**:
- Initial page load shows videos
- Scrolling triggers new batch load
- Skeleton loaders appear and disappear
- Empty state displays when no videos
- Error state displays on failure
- Responsive grid adapts to viewport changes

**Tools**: Playwright

## Performance Optimizations

1. **MongoDB Indexes**: Compound index on `{ uploadedAt: -1, _id: -1 }` for cursor queries
2. **Next.js Image**: Automatic WebP conversion, lazy loading, blur placeholders
3. **TanStack Query**: Caching with 30min stale time, deduplication, prefetching
4. **Server Prefetch**: Initial batch loaded server-side (no loading spinner on first visit)
5. **Intersection Observer**: Efficient scroll detection (no event listener overhead)
6. **Batch Size**: 15 videos per batch (balance between fewer requests vs scroll jank)

## Deployment Considerations

1. **Environment Variables**: Add `PEXELS_API_KEY` to production env
2. **MongoDB Indexes**: Run index creation script before deploy
3. **Initial Sync**: Run `syncFromPexels` manually to populate database
4. **Scheduled Sync**: Set up cron job to sync new videos daily (e.g., every 24 hours)
5. **Error Monitoring**: Add Sentry/DataDog to track Pexels API failures
6. **Rate Limiting**: Monitor Pexels API usage, upgrade plan if needed

## Future Enhancements (Out of Scope for MVP)

- Video playback modal/page (separate feature)
- User authentication for personalized feeds
- Video filters (category, duration, popularity)
- Search functionality
- User interactions (likes, comments, shares)
- Bookmarking/saved videos
- Infinite scroll upwards (bidirectional pagination)
- Video recommendations (ML-based)

## Next Steps

1. ✅ Specification complete (`spec.md`)
2. ✅ Implementation plan complete (`plan.md`)
3. ⏳ **NEXT**: Run `/speckit.tasks` to generate task breakdown
4. ⏳ After tasks: Run `/speckit.implement` to execute implementation

---

**Status**: Ready for task generation
**Gate Check**: ✅ All constitution principles satisfied
**Blockers**: None - proceed to `/speckit.tasks`
