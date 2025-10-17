# Tasks: Infinite Scroll Video Feed

**Input**: Design documents from `/specs/002-infinite-video-feed/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: This feature specification does NOT explicitly request TDD or test tasks. Implementation tasks only.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions
- **Repository root**: `c:\Users\prath\OneDrive\Desktop\study\temp\blockchain\social-media\`
- **App directory**: `app/`
- **Components**: `components/`
- **Library**: `lib/`
- **tRPC**: `trpc/`
- **Types**: `types/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Verify environment variables in `config/env.ts` include MONGODB_URI
- [ ] T002 [P] Add PEXELS_API_KEY to `config/env.ts` with Zod validation
- [ ] T003 [P] Create Pexels API types in `types/pexels.ts` (PexelsVideo, PexelsVideoFile, PexelsVideoPicture, PexelsPopularVideosResponse)
- [ ] T004 [P] Create Video domain types in `types/video.ts` (Video, VideoUrls, VideoCursor, PaginatedVideos)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Create VideoDocument interface with Zod schema in `lib/db/models/video.ts` (includes VideoCreatorSchema, VideoUrlsSchema, VideoSchema)
- [ ] T006 Create MongoDB indexes script for videos collection in `lib/db/models/video.ts` (unique pexelsId index + compound uploadedAt/id index)
- [ ] T007 Create cursor encoding/decoding utility functions in `lib/db/queries/videos.ts` (encodeCursor, decodeCursor with base64 + JSON)
- [ ] T008 Implement Pexels API client wrapper in `lib/pexels-client.ts` (createClient, fetchPopularVideos, error handling, rate limiting)
- [ ] T009 Create video transformation utilities in `lib/db/queries/videos.ts` (transformPexelsVideo, transformVideoDocument, extractVideoUrls, getQualityKey)
- [ ] T010 Create videos tRPC router file in `trpc/routers/videos.ts` with empty router export
- [ ] T011 Add videos router to app router in `trpc/routers/_app.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Browse Initial Video Feed (Priority: P1) 🎯 MVP

**Goal**: Users can open the application and immediately see a grid of video cards with thumbnails, titles, creator names, and durations. The grid is responsive and shows skeleton loaders during initial load.

**Independent Test**: Open the application homepage and verify that 10-20 videos are displayed in a responsive grid with all metadata visible. Skeleton loaders should appear briefly during load. No infinite scroll needed yet.

### Implementation for User Story 1

- [ ] T012 [P] [US1] Implement videos.getInfinite tRPC query procedure in `trpc/routers/videos.ts` (input: limit + cursor, output: items + nextCursor + hasMore, MongoDB cursor-based query with compound index)
- [ ] T013 [P] [US1] Create VideoCard component in `components/kibo-ui/video/video-card.tsx` (displays thumbnail with Next.js Image, title with truncation, creator name with link, formatted duration badge, hover effects)
- [ ] T014 [P] [US1] Create VideoGrid layout component in `components/kibo-ui/video/video-grid.tsx` (responsive CSS Grid with 1-4 columns based on viewport: 320px=1, 640px=2, 1024px=3, 1280px=4)
- [ ] T015 [P] [US1] Create VideoCardSkeleton component in `components/videos/video-card-skeleton.tsx` (uses shadcn/ui Skeleton, matches VideoCard dimensions for no layout shift)
- [ ] T016 [US1] Create InfiniteVideoList client component in `components/videos/infinite-video-list.tsx` (useInfiniteQuery with trpc.videos.getInfinite, renders VideoGrid + VideoCard array, shows 6-8 skeletons during initial load)
- [ ] T017 [US1] Create videos section layout in `app/(videos)/layout.tsx` (minimal layout wrapper for videos section)
- [ ] T018 [US1] Create videos homepage with server prefetch in `app/(videos)/page.tsx` (server component, prefetchInfinite first page with limit=15, HydrationBoundary, renders InfiniteVideoList)

**Checkpoint**: At this point, User Story 1 should be fully functional - opening the app shows a responsive grid of video cards with skeleton loaders during initial load.

---

## Phase 4: User Story 2 - Infinite Scroll Loading (Priority: P1) 🎯 MVP

**Goal**: Users can scroll down through the video feed and new videos automatically load as they approach the end of currently displayed content. Skeleton loaders appear while new videos are fetching. No duplicate content appears during rapid scrolling.

**Independent Test**: Scroll to the bottom 75% of the initial video set and verify that new videos load automatically without clicking anything. Skeleton loaders should appear during fetch. Continue scrolling through multiple batches to verify smooth loading and no duplicates.

### Implementation for User Story 2

- [ ] T019 [US2] Add Intersection Observer logic to InfiniteVideoList in `components/videos/infinite-video-list.tsx` (use react-intersection-observer, trigger fetchNextPage when sentinel visible, show skeleton loaders during isFetchingNextPage)
- [ ] T020 [US2] Add infinite scroll sentinel element to InfiniteVideoList in `components/videos/infinite-video-list.tsx` (div with ref from useInView hook, positioned after last video card, triggers at 75% scroll)
- [ ] T021 [US2] Configure TanStack Query infinite query parameters in `components/videos/infinite-video-list.tsx` (getNextPageParam extracts nextCursor, staleTime 30 minutes, enabled: true)
- [ ] T022 [US2] Add loading state UI to InfiniteVideoList in `components/videos/infinite-video-list.tsx` (show 6-8 skeleton cards when isFetchingNextPage, flatten pages into single array with flatMap)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - initial grid loads (US1), then scrolling triggers automatic loading of more videos (US2) with smooth UX.

---

## Phase 5: User Story 3 - Empty and Error States (Priority: P2)

**Goal**: When no videos are available or when there's an issue loading content, users see clear, helpful messages instead of broken layouts or endless loading indicators. Users can retry after errors.

**Independent Test**: Simulate empty database (no videos synced) and verify friendly empty state appears. Simulate network error and verify error message with retry button appears. Scroll to absolute end and verify "end of content" message appears.

### Implementation for User Story 3

- [ ] T023 [P] [US3] Create EmptyFeed component in `components/videos/empty-feed.tsx` (icon from lucide-react, friendly message "No videos available yet. Check back soon!", centered layout)
- [ ] T024 [P] [US3] Create ErrorState component in `components/videos/error-state.tsx` (alert icon, error message, retry button that calls refetch, uses shadcn/ui Alert component)
- [ ] T025 [P] [US3] Create EndOfFeed component in `components/videos/end-of-feed.tsx` (friendly message "You've reached the end!", subtle styling)
- [ ] T026 [US3] Add empty state handling to InfiniteVideoList in `components/videos/infinite-video-list.tsx` (check if status=success and data.pages[0].items.length === 0, render EmptyFeed)
- [ ] T027 [US3] Add error state handling to InfiniteVideoList in `components/videos/infinite-video-list.tsx` (check if status=error, render ErrorState with error.message and refetch callback)
- [ ] T028 [US3] Add end-of-feed handling to InfiniteVideoList in `components/videos/infinite-video-list.tsx` (check if hasNextPage === false after videos loaded, render EndOfFeed component)
- [ ] T029 [US3] Add offline/network error detection to InfiniteVideoList in `components/videos/infinite-video-list.tsx` (check error.data?.code, show appropriate message for network vs server errors)

**Checkpoint**: All edge cases should now be handled gracefully - empty database, network errors, end of content, and offline states all show helpful messages.

---

## Phase 6: User Story 4 - Video Information Display (Priority: P2)

**Goal**: Each video card displays comprehensive, well-formatted information to help users decide what to watch. Thumbnails are high-quality, titles are readable with ellipsis if long, creator names are prominent, durations are clearly formatted (MM:SS), and missing metadata shows placeholders instead of empty fields.

**Independent Test**: Examine any video card and verify all fields are present: high-quality thumbnail, truncated title with ellipsis if needed, creator name with attribution, formatted duration badge. Test with videos that have missing metadata to verify placeholders appear.

### Implementation for User Story 4

- [ ] T030 [P] [US4] Add duration formatting utility in `lib/utils.ts` (formatDuration function: converts seconds to MM:SS or HH:MM:SS format)
- [ ] T031 [P] [US4] Add thumbnail fallback handling to VideoCard in `components/kibo-ui/video/video-card.tsx` (Next.js Image onError handler, fallback placeholder image, blur data URL for loading state)
- [ ] T032 [US4] Add title truncation to VideoCard in `components/kibo-ui/video/video-card.tsx` (CSS line-clamp-2, title attribute for full text on hover, ellipsis for overflow)
- [ ] T033 [US4] Add creator attribution styling to VideoCard in `components/kibo-ui/video/video-card.tsx` (link to creator URL, subtle hover effect, "by [creator]" format, external link icon)
- [ ] T034 [US4] Add duration badge to VideoCard in `components/kibo-ui/video/video-card.tsx` (uses shadcn/ui Badge, positioned absolute top-right on thumbnail, uses formatDuration utility, semi-transparent background)
- [ ] T035 [US4] Add missing metadata placeholders to VideoCard in `components/kibo-ui/video/video-card.tsx` (default title "Untitled Video", default creator "Unknown Creator", default duration "0:00" if missing)
- [ ] T036 [US4] Optimize thumbnail images in VideoCard in `components/kibo-ui/video/video-card.tsx` (Next.js Image with width=400 height=300, priority=false for lazy loading, quality=85, sizes prop for responsive)

**Checkpoint**: All video cards should now display rich, well-formatted information with no broken layouts or missing data.

---

## Phase 7: Pexels Sync Service (Supporting Feature)

**Goal**: Admin can manually sync videos from Pexels API to MongoDB to populate the video feed. This is needed to have videos in the database for User Stories 1-4 to display.

**Independent Test**: Call trpc.videos.syncFromPexels.mutate({ page: 1, perPage: 20 }) and verify 20 videos are inserted into MongoDB. Call again with same parameters and verify videos are skipped (no duplicates). Check sync statistics in return value.

### Implementation for Sync Service

- [ ] T037 [P] Implement videos.syncFromPexels tRPC mutation procedure in `trpc/routers/videos.ts` (input: page + perPage with defaults, calls Pexels API, transforms videos, upserts to MongoDB with pexelsId unique constraint)
- [ ] T038 [P] Create video upsert query function in `lib/db/queries/videos.ts` (upsertVideos function using updateOne with upsert=true, returns syncedCount + skippedCount stats)
- [ ] T039 Create sync videos utility script in `scripts/seed-videos.ts` (calls syncFromPexels for pages 1-10, logs progress, implements 1 second delay between requests for rate limiting)

**Checkpoint**: Videos can now be synced from Pexels API to MongoDB, enabling all user stories to have content to display.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T040 [P] Add loading states to VideoCard hover effects in `components/kibo-ui/video/video-card.tsx` (smooth transitions, scale effect on hover, shadow elevation)
- [ ] T041 [P] Add accessibility attributes to VideoCard in `components/kibo-ui/video/video-card.tsx` (aria-label with video title, alt text for thumbnail, keyboard navigation support)
- [ ] T042 [P] Add error boundary to InfiniteVideoList in `components/videos/infinite-video-list.tsx` (catch rendering errors, show fallback UI with retry)
- [ ] T043 Optimize MongoDB query performance in `lib/db/queries/videos.ts` (verify compound index is used with explain(), add projection to exclude unused fields)
- [ ] T044 [P] Add video card interaction analytics in `components/kibo-ui/video/video-card.tsx` (track video card clicks, hover events for future recommendations)
- [ ] T045 Add stale-while-revalidate caching to videos.getInfinite in `trpc/routers/videos.ts` (configure cache headers for CDN caching if deployed)
- [ ] T046 [P] Add responsive breakpoint comments to VideoGrid in `components/kibo-ui/video/video-grid.tsx` (document grid-cols behavior at each breakpoint)
- [ ] T047 Document Pexels API rate limits in `lib/pexels-client.ts` (add comments about 200 req/hour free tier, rate limiting strategy)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion
- **User Story 2 (Phase 4)**: Depends on User Story 1 completion (builds on InfiniteVideoList)
- **User Story 3 (Phase 5)**: Depends on User Story 1 completion (adds states to InfiniteVideoList)
- **User Story 4 (Phase 6)**: Depends on User Story 1 completion (enhances VideoCard)
- **Pexels Sync (Phase 7)**: Can start after Foundational phase (parallel with user stories)
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1) - Browse Initial Feed**: Can start after Foundational (Phase 2) ✅ MVP Core
  - No dependencies on other user stories
  - Must complete before US2, US3, US4 (they all build on this)
  
- **User Story 2 (P1) - Infinite Scroll**: Can start after User Story 1 ✅ MVP Core
  - Depends on US1 (InfiniteVideoList component)
  - Adds infinite scroll to existing feed
  
- **User Story 3 (P2) - Empty/Error States**: Can start after User Story 1
  - Depends on US1 (InfiniteVideoList component)
  - Adds error handling to existing feed
  - Independent of US2 and US4
  
- **User Story 4 (P2) - Video Information Display**: Can start after User Story 1
  - Depends on US1 (VideoCard component)
  - Enhances existing video cards
  - Independent of US2 and US3

### Within Each User Story

- **US1**: T012-T015 can run in parallel [P], then T016-T018 sequentially
- **US2**: All tasks T019-T022 modify InfiniteVideoList sequentially
- **US3**: T023-T025 can run in parallel [P], then T026-T029 sequentially
- **US4**: T030-T031 can run in parallel [P], then T032-T037 modify VideoCard sequentially

### Parallel Opportunities

- **Phase 1 (Setup)**: T002, T003, T004 can all run in parallel [P]
- **Phase 3 (US1)**: T012, T013, T014, T015 can all run in parallel [P] (different files)
- **Phase 5 (US3)**: T023, T024, T025 can all run in parallel [P] (different files)
- **Phase 6 (US4)**: T030, T031 can run in parallel [P] (different files)
- **Phase 7 (Sync)**: T037, T038 can run in parallel [P] (different files)
- **Phase 8 (Polish)**: T040, T041, T042, T044, T046, T047 can all run in parallel [P] (different files or sections)

### Critical Path (Minimum Viable Product)

For fastest path to working MVP:

1. **Phase 1 (Setup)**: T001 → T002, T003, T004 in parallel → 4 tasks
2. **Phase 2 (Foundational)**: T005 → T006 → T007 → T008 → T009 → T010 → T011 → 7 tasks
3. **Phase 3 (US1)**: T012, T013, T014, T015 in parallel → T016 → T017 → T018 → 7 tasks
4. **Phase 4 (US2)**: T019 → T020 → T021 → T022 → 4 tasks
5. **Phase 7 (Sync)**: T037 → T038 → T039 → 3 tasks (needed to populate videos)

**Total MVP Tasks**: 25 tasks (US1 + US2 + Sync)  
**Optional Enhancement Tasks**: 22 tasks (US3 + US4 + Polish)  
**Grand Total**: 47 tasks

---

## Parallel Example: User Story 1

```bash
# Launch all independent US1 components together:
Task T012: "Implement videos.getInfinite tRPC query procedure in trpc/routers/videos.ts"
Task T013: "Create VideoCard component in components/kibo-ui/video/video-card.tsx"
Task T014: "Create VideoGrid layout component in components/kibo-ui/video/video-grid.tsx"
Task T015: "Create VideoCardSkeleton component in components/videos/video-card-skeleton.tsx"

# Then sequentially:
Task T016: "Create InfiniteVideoList client component" (needs T013, T014, T015)
Task T017: "Create videos section layout" (needs T016)
Task T018: "Create videos homepage with server prefetch" (needs T012, T016, T017)
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only) ✅ RECOMMENDED

1. Complete Phase 1: Setup (4 tasks)
2. Complete Phase 2: Foundational (7 tasks) → Foundation ready
3. Complete Phase 7: Pexels Sync (3 tasks) → Can populate videos
4. Complete Phase 3: User Story 1 (7 tasks) → Test initial grid loads ✅
5. Complete Phase 4: User Story 2 (4 tasks) → Test infinite scroll works ✅
6. **STOP and VALIDATE**: Test US1+US2 independently, sync videos from Pexels
7. **Deploy/demo MVP** (25 tasks total)

**Why this is the MVP**: US1 + US2 deliver the core value proposition (infinite scroll video feed). US3 and US4 are nice-to-have enhancements but not essential for initial launch.

### Incremental Delivery (Add Optional Features)

8. Add Phase 5: User Story 3 (7 tasks) → Test empty/error states ✅
9. Add Phase 6: User Story 4 (7 tasks) → Test enhanced video info display ✅
10. Add Phase 8: Polish (8 tasks) → Performance + accessibility improvements
11. **Full Feature Complete** (47 tasks total)

### Parallel Team Strategy

With multiple developers:

1. **Team completes Setup + Foundational together** (11 tasks)
2. Once Foundational is done:
   - **Developer A**: User Story 1 (7 tasks) - Core grid display
   - **Developer B**: Pexels Sync Service (3 tasks) - Data population
   - **Developer C**: User Story 3 (7 tasks) - Empty/error states (can start after US1 T016 complete)
3. After US1 complete:
   - **Developer A**: User Story 2 (4 tasks) - Infinite scroll
   - **Developer C**: User Story 4 (7 tasks) - Enhanced video info
4. Polish phase: All developers can pick parallel tasks

---

## Task Statistics

- **Total Tasks**: 47
- **Phases**: 8
- **User Stories**: 4
  - US1 (P1): 7 tasks - Browse Initial Feed ✅ MVP
  - US2 (P1): 4 tasks - Infinite Scroll ✅ MVP
  - US3 (P2): 7 tasks - Empty/Error States
  - US4 (P2): 7 tasks - Video Information Display
- **Supporting**: 3 tasks (Pexels Sync)
- **Infrastructure**: 11 tasks (Setup + Foundational)
- **Polish**: 8 tasks

### Parallel Opportunities Identified

- **Phase 1**: 3 tasks can run in parallel
- **Phase 3 (US1)**: 4 tasks can run in parallel
- **Phase 5 (US3)**: 3 tasks can run in parallel
- **Phase 6 (US4)**: 2 tasks can run in parallel
- **Phase 7 (Sync)**: 2 tasks can run in parallel
- **Phase 8 (Polish)**: 6 tasks can run in parallel

**Total Parallelizable Tasks**: 20 tasks (43% of total)

### MVP Scope (Recommended)

**Tasks**: 25 (53% of total)  
**User Stories**: US1 + US2 (both P1)  
**Deliverable**: Infinite scroll video feed with initial load + auto-loading on scroll  
**Independent Test**: Open app → see video grid → scroll down → more videos load automatically

### Full Feature Scope

**Tasks**: 47 (100%)  
**User Stories**: US1 + US2 + US3 + US4  
**Deliverable**: Full infinite scroll video feed with comprehensive error handling, empty states, and rich video metadata display  
**Independent Test**: All scenarios from spec.md acceptance criteria

---

## Notes

- [P] tasks indicate different files with no dependencies - can run in parallel
- [Story] label (US1, US2, US3, US4) maps task to specific user story for traceability
- Each user story should be independently testable after its phase completes
- MVP is US1 + US2 (25 tasks) - delivers core infinite scroll functionality
- US3 + US4 (14 tasks) are enhancements - add after MVP validated
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **Tests are NOT included** - specification did not request TDD approach

---

**Status**: ✅ Tasks Ready for Implementation  
**Next Step**: Run `/speckit.implement` to begin executing tasks  
**Format Validation**: ✅ All 47 tasks follow required checklist format (checkbox, ID, labels, file paths)
