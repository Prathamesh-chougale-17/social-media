# Research & Technical Decisions

**Feature**: Infinite Scroll Video Feed  
**Date**: 2025-10-17  
**Phase**: 0 (Research)

## Purpose

This document captures all technical research and decisions made during the planning phase. It resolves any "NEEDS CLARIFICATION" items from the initial technical context and documents alternatives considered.

## Research Items

### 1. Infinite Scroll Implementation Strategy

**Question**: What's the best approach for implementing infinite scroll with Next.js 15 and tRPC?

**Research Conducted**:
- Reviewed TanStack Query v5 infinite query documentation
- Analyzed Next.js 15 server components patterns
- Studied Intersection Observer API browser support
- Compared virtual scrolling libraries (react-window, react-virtualized)

**Decision**: TanStack Query `useInfiniteQuery` + Intersection Observer API

**Justification**:
- **TanStack Query** provides built-in pagination state management, automatic request deduplication, and cache management
- **Intersection Observer** is native browser API (no external dependencies), well-supported (95%+ browsers), and performant (no scroll event listeners)
- **No virtual scrolling needed** for MVP - overhead not justified until 10,000+ items
- Pattern aligns with Principle V (TanStack Query for caching)

**Implementation Notes**:
- Use `getNextPageParam` to extract cursor from last page
- Trigger `fetchNextPage` when sentinel element intersects viewport
- Server-side prefetch first page for instant initial load

---

### 2. Pagination Strategy

**Question**: Should we use offset-based or cursor-based pagination?

**Research Conducted**:
- Analyzed MongoDB pagination patterns and performance
- Studied consistency issues with offset pagination
- Reviewed cursor pagination best practices (Relay spec, GraphQL patterns)

**Decision**: Cursor-based pagination using `uploadedAt` timestamp + `_id` tie-breaker

**Justification**:
- **Consistency**: Prevents duplicate/skipped items when new videos are added
- **Performance**: Compound index `{ uploadedAt: -1, _id: -1 }` supports efficient range queries
- **Scalability**: O(log n) lookup with index, independent of result set size
- **URL-friendly**: Base64-encoded cursor can be stored in URL query param (Principle IV)

**Cursor Format**:
```
base64(`${uploadedAt.toISOString()}|${_id}`)
```

**MongoDB Query Pattern**:
```javascript
{
  $or: [
    { uploadedAt: { $lt: cursor.uploadedAt } },
    { 
      uploadedAt: cursor.uploadedAt, 
      _id: { $lt: cursor.id } 
    }
  ]
}
```

---

### 3. Pexels API Integration Architecture

**Question**: Should we proxy Pexels API requests or sync videos to MongoDB?

**Research Conducted**:
- Reviewed Pexels API rate limits (200 requests/hour free tier)
- Analyzed latency implications of direct API calls
- Studied caching strategies for external APIs
- Considered data consistency requirements

**Decision**: Sync videos to MongoDB with scheduled background job

**Justification**:
- **Rate Limit Compliance**: Syncing decouples user traffic from API limits (200 req/hour is 1 user every 18 seconds)
- **Latency**: MongoDB query (<50ms) vs Pexels API (200-500ms)
- **Reliability**: Platform works even if Pexels is down
- **Future Features**: Enables likes, comments, bookmarks without Pexels dependency
- **Principle IX**: Mandates no direct client access to Pexels API

**Sync Strategy**:
- Initial sync: Run `syncFromPexels` manually to populate database (pages 1-10 = 200 videos)
- Scheduled sync: Cron job every 24 hours to fetch new videos
- On-demand sync: Admin can trigger via tRPC procedure

---

### 4. Video Thumbnail Optimization

**Question**: How should we handle video thumbnail images for performance?

**Research Conducted**:
- Benchmarked Next.js Image component optimizations
- Tested Pexels CDN response times
- Analyzed image format options (JPEG, WebP, AVIF)
- Measured lazy loading impact on perceived performance

**Decision**: Next.js `<Image>` component with Pexels CDN URLs + fallback placeholder

**Justification**:
- **Next.js Image**: Automatic format conversion (WebP/AVIF), lazy loading, blur placeholder, responsive srcset
- **Pexels CDN**: Already globally distributed, no re-hosting needed
- **Fallback**: Broken image URLs display placeholder (prevents layout shift)
- **Performance**: Lazy loading defers off-screen images, blur placeholder improves perceived load time

**Configuration**:
```typescript
<Image
  src={video.thumbnailUrl}
  alt={video.title}
  width={400}
  height={300}
  className="object-cover"
  placeholder="blur"
  blurDataURL={generateBlurDataURL()}
  loading="lazy"
  onError={handleImageError}
/>
```

---

### 5. Skeleton Loading Strategy

**Question**: What's the best skeleton loader UX for infinite scroll?

**Research Conducted**:
- Analyzed skeleton loader patterns (Facebook, Twitter, YouTube)
- Tested user perception of different skeleton counts
- Measured impact on layout shift (CLS)

**Decision**: Show 6-8 skeleton cards matching final VideoCard dimensions

**Justification**:
- **User Expectation**: Users expect to see loading state, empty screen causes confusion
- **Layout Stability**: Skeletons prevent Cumulative Layout Shift (CLS) when content loads
- **Count**: 6-8 cards (2 rows on desktop) provides good balance (not too much/too little)
- **Matching Dimensions**: Prevents layout shift when real content replaces skeleton

**Implementation**:
- Use shadcn/ui `Skeleton` component
- Render in same grid layout as VideoCard
- Show during initial load AND scroll-triggered loads

---

### 6. Empty State & Error Handling

**Question**: What should users see when no videos exist or errors occur?

**Research Conducted**:
- Reviewed UX best practices for empty states (Material Design, Apple HIG)
- Analyzed error recovery patterns in production apps

**Decision**: Friendly empty state with icon + helpful message, error state with retry button

**Empty State**:
```
[Icon: Video Camera]
No videos available yet
Check back soon for new content!
```

**Error State**:
```
[Icon: Alert Triangle]
Failed to load videos
[Retry Button]
```

**Justification**:
- **Clear Communication**: Users understand system state immediately
- **Actionable**: Error state provides retry mechanism
- **Brand Tone**: Friendly language aligns with social media platform
- **Accessibility**: Icons + text support screen readers

---

### 7. Responsive Grid Layout

**Question**: How should the video grid adapt to different screen sizes?

**Research Conducted**:
- Analyzed grid patterns on YouTube, Instagram, Pinterest
- Tested breakpoints with real devices
- Measured impact on perceived performance

**Decision**: CSS Grid with responsive column count

**Breakpoints**:
- Mobile (320px-640px): 1 column
- Tablet (640px-1024px): 2 columns
- Desktop (1024px-1440px): 3 columns
- Large Desktop (1440px+): 4 columns

**Justification**:
- **CSS Grid**: Native, performant, no JavaScript layout calculations
- **Breakpoints**: Align with Tailwind CSS defaults (consistent with project)
- **Column Count**: Balances content visibility with individual video detail
- **Performance**: Pure CSS (no re-renders on resize)

**Implementation**:
```css
.video-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}
```

---

### 8. MongoDB Index Strategy

**Question**: What indexes are needed for optimal query performance?

**Research Conducted**:
- Profiled MongoDB cursor pagination queries
- Analyzed index size vs query performance tradeoffs
- Reviewed MongoDB compound index best practices

**Decision**: Two indexes on `videos` collection

**Indexes**:
1. `{ pexelsId: 1 }` - Unique index for upsert operations
2. `{ uploadedAt: -1, _id: -1 }` - Compound index for cursor pagination

**Justification**:
- **Unique Index**: Prevents duplicate videos from Pexels API, fast upsert (O(log n))
- **Compound Index**: Supports cursor queries with sorting, enables covered queries
- **Index Order**: Leading field (`uploadedAt`) is range query, trailing field (`_id`) is tie-breaker
- **Size**: ~5KB per 1000 documents (negligible overhead)

**Query Performance**:
- Without index: O(n) table scan
- With index: O(log n) + O(limit) = ~10ms for 1M documents

---

## Technology Stack Summary

| Layer | Technology | Justification |
|-------|------------|---------------|
| **Frontend Framework** | Next.js 15.5.6 | Constitution Principle II (Server Components) |
| **Language** | TypeScript 5 (strict) | Constitution Principle I (Type Safety) |
| **UI Components** | shadcn/ui + Kibo UI | Constitution Principle VII (Composition) |
| **Data Fetching** | tRPC 11.6.0 | Constitution Principle III (tRPC-First) |
| **State Management** | TanStack Query 5.90.5 | Constitution Principle V (Caching) |
| **Database** | MongoDB | Constitution Principle VIII (Schemas) |
| **External API** | Pexels API | Constitution Principle IX (Content Source) |
| **Styling** | Tailwind CSS 4 | Project standard |
| **Animation** | Motion 12.23.24 | Project standard (for future enhancements) |

---

## Open Questions & Future Research

### Deferred to Future Iterations

1. **Video Playback**: How should videos play? (Modal, inline, dedicated page?) → Separate feature
2. **Personalization**: How to recommend videos based on user preferences? → Requires ML model
3. **Search & Filters**: What metadata should be searchable/filterable? → Separate feature
4. **Analytics**: What metrics to track? (views, engagement, retention) → Separate feature

### Requires User Input

- None - all specifications clear from feature spec

---

## References

- [TanStack Query Infinite Queries](https://tanstack.com/query/latest/docs/react/guides/infinite-queries)
- [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [MongoDB Cursor-Based Pagination](https://www.mongodb.com/docs/manual/reference/method/cursor.skip/)
- [Pexels API Documentation](https://www.pexels.com/api/documentation/)
- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)

---

**Status**: ✅ Research Complete  
**Next Phase**: Data Model Design (Phase 1)
