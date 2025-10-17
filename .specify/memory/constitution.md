# Social Media Platform Constitution

## Core Principles

### I. Type Safety & Developer Experience First

Every line of code is TypeScript with strict mode enabled. All types must be explicit, not inferred. API contracts (tRPC procedures) define the data shape before implementation. Every module exports clean types that serve as documentation. No `any` type allowed unless explicitly justified with a comment referencing spec constraints.

**Rationale:** TypeScript catches errors at compile time, not runtime. Type exports act as contracts between frontend, backend, and data layer. This reduces cognitive load and makes refactoring safe and fast.

### II. Server Components by Default, Client When Necessary

New pages use Next.js App Router server components for initial data fetching and rendering. Client interactivity (forms, mutations, real-time updates) isolates to minimal client components. `"use client"` boundaries are at the leaf level, never wrapping entire pages unless unavoidable.

**Rationale:** Server components reduce JavaScript payload and enable seamless tRPC integration without useQuery boilerplate. Client components stay minimal, focused, and testable. This reduces hydration mismatches and improves Core Web Vitals.

### III. tRPC-First Data Flow (Server Components Pattern)

All data fetching goes through tRPC routers. Client components call hooks; server components use `HydrateClient` + server helpers. No direct MongoDB queries in components; all data access routes through tRPC procedures with Zod validation. Backend responsibilities: query building, authorization checks, response shaping.

**Rationale:** tRPC provides end-to-end type safety from database to UI. Centralizing data access in procedures enforces permission checks, rate limiting, and auditing consistently. This is non-negotiable for a social platform.

### IV. URL State via Nuqs for Pagination, Filters, Search

Every filterable/searchable page uses Nuqs to sync filter state to URL search parameters. Pagination cursors, sort order, search queries belong in the URL, never in React state alone. This enables browser back/forward, shareable links, and bookmarkable states.

**Rationale:** Users expect back button to restore state. Shareable links enable collaboration. URL-as-state enables server-side prefetching with HydrateClient. Combined with TanStack Query, this is seamless and performant.

### V. TanStack Query for Synchronization & Caching

React Query handles all client-side data synchronization. Queries cache responses with configurable stale times based on data sensitivity. Mutations use optimistic updates + onMutate/onError rollback. Server-side prefetch uses server helpers; client-side infinite queries use useInfiniteQuery.

**Stale times guideline:**
- Trending/Popular videos: 30 minutes (stable)
- User interactions (likes, comments): 5 minutes (volatile)
- User profiles: 5 minutes
- Personal data (saved videos): 1 minute (most volatile)

**Rationale:** TanStack Query deduplicates requests, caches responses, and handles race conditions automatically. Optimistic updates provide instant UI feedback while mutations confirm server-side. Stale times prevent unnecessary refetches while catching updates quickly.

### VI. Forms: React Hook Form + Zod for Validation

All forms use React Hook Form with Zod schema validation. Client validation happens before server round-trip. Server-side validation in tRPC procedures repeats schema checks with context (e.g., "username already exists"). Errors flow back through `onError` callback.

**Rationale:** Client validation improves UX (instant feedback). Server-side validation is security gate (no trusting client). Zod schemas are single source of truth; RHF integrates seamlessly with shadcn/ui forms.

### VII. Component Hierarchies & Shadcn/UI + Kibo UI Composition

Shadcn/ui provides unstyled foundation components (Button, Card, Dialog, etc.). Kibo UI custom components layer on top with animations, brand patterns, and social-specific layouts. Custom components never duplicate shadcn logic; they compose with clear props interfaces.

**Example structure:**
```
shadcn/ui Button → Kibo UI LikeButton (adds icon + animation + tRPC integration)
shadcn/ui Card → Kibo UI VideoCard (composes Player, Stats, Actions)
```

**Rationale:** Composition over duplication. Shadcn provides accessibility baseline; Kibo adds domain-specific patterns. Clear boundaries make future styling changes easy.

### VIII. Database: MongoDB Collections with Strict Schemas

MongoDB stores documents in 5 main collections: `videos`, `users`, `interactions`, `bookmarks`, `analytics`. Each document has an implicit schema validated in lib/db/models/*.ts. No schemaless documents; all shapes are TypeScript interfaces exported as types. Database queries encapsulated in lib/db/queries/*.ts.

**Indexes required:**
- `videos`: `pexelsId` (unique), `uploadedAt` (sort)
- `users`: `email` (unique), `username` (unique)
- `interactions`: `videoId + userId` (unique for likes), `createdAt` (sort)
- `bookmarks`: `userId + videoId` (unique)
- `analytics`: `videoId + timestamp` (compound)

**Rationale:** MongoDB flexibility with type safety boundary. Indexes prevent N+1 queries. Separate queries layer provides central place to add caching, rate limiting, or query optimization.

### IX. Pexels API as Content Source

Videos come from Pexels API only. Sync service (`trpc/routers/videos.ts::syncFromPexels`) runs on schedule or manually. Synced videos stored in MongoDB with metadata (pexelsId, creator, thumbnail, quality options). All user interactions (likes, comments) reference MongoDB copy, not Pexels directly.

**Rationale:** Decouples our platform from Pexels API latency/availability. Enables analytics, user interactions, and platform independence. Sync runs background/scheduled, not on user request.

### X. Authentication & Authorization Baked Into tRPC Context

Every tRPC procedure receives context including `userId` (null if unauthenticated). Mutations requiring auth throw `TRPCError('UNAUTHORIZED')` early. Procedures can query own data without explicit userId parameter; server gets it from context.

**Rationale:** One gate (context) prevents auth bypass. Procedures stay clean; no passing userId as parameter. Testable: mock context to test auth logic.

## Architecture & Data Flow Standards

### tRPC Routers Organization

- **videos.ts**: CRUD + trending + search + Pexels sync
- **interactions.ts**: Like, comment, share, bookmark management
- **users.ts**: Profile, follow/unfollow, user discovery
- **analytics.ts**: View tracking, engagement stats (read-heavy, no mutations expected)

Each router procedure returns Zod-validated output. Input always validated. No side effects in queries (except analytics tracking).

### Component Directory Structure

- **components/ui/**: Shadcn/ui auto-generated components (do not edit directly)
- **components/kibo-ui/**: Custom components (VideoCard, VideoGrid, animations)
- **components/videos/**: Video-specific (VideoFeed, VideoPlayer, VideoActions, Comments)
- **components/user/**: User profile, follow button, user avatar
- **components/interactions/**: Like, share, save buttons; comment item
- **components/forms/**: Search form, comment form, profile edit
- **components/layouts/**: Navbar, sidebar, footer (shared across routes)
- **components/providers/**: TRPCProvider wrapping app

### Page Organization

- **app/(videos)/page.tsx**: Infinite feed with server prefetch + HydrateClient
- **app/(videos)/[videoId]/page.tsx**: Video detail, server-side data + comments prefetch
- **app/(user)/profile/[userId]/page.tsx**: User profile with tabs (videos, followers, following)
- **app/(user)/saved/page.tsx**: User's bookmarked videos

## Quality & Testing Standards

### Code Quality Non-Negotiable

1. **Type Safety**: No `any`. No `@ts-ignore` without documented reason.
2. **Biome Linting**: Must pass `npm run lint`. Auto-fix with `npm run format`.
3. **Naming**: Components PascalCase, functions/hooks camelCase, constants UPPER_SNAKE_CASE.
4. **Imports**: Absolute imports using `@/` alias. No relative `../../../` chains.
5. **Comments**: Only when WHY is non-obvious. No comments on obvious code.

### Testing Layers

- **Unit**: Individual functions, hooks (vitest, react-testing-library)
- **Integration**: API routes, tRPC procedures (test with caller factory)
- **E2E**: Critical user flows (Playwright: view video, like, comment, share)
- **Accessibility**: Components render with proper ARIA attributes, keyboard navigable

### Minimal Viable Tests

Every new feature ships with at least:
1. Happy path E2E test (user completes primary action)
2. Error case test (permission denied, validation error, network error)
3. Type coverage (TypeScript compiles, no implicit `any`)

## Development Workflow

### Branch Naming

Use format: `<type>/<short-name>`

- `feat/video-feed-infinite-scroll`
- `fix/like-button-race-condition`
- `docs/api-endpoint-documentation`
- `perf/query-optimization-video-feed`

### Commit Messages

Atomic commits with clear scope:

```
feat(videos): implement infinite scroll with cursor pagination

- Add getInfinite procedure to videos router
- Implement useInfiniteQuery hook with Nuqs integration
- Add virtual scrolling for performance
```

### PR Process

1. Create feature branch from `main`
2. Implement feature following constitution
3. Add tests (unit + E2E for user-facing features)
4. Ensure Biome lint passes: `npm run lint`
5. Create PR with checklist: spec coverage, tests passing, no breaking changes
6. Code review: verify types, tRPC contracts, component composition
7. Merge squash to `main`

## Environment & Configuration

### t3-env Configuration (config/env.ts)

**Server-only (backend only, never leaked to client):**
- `MONGODB_URI` - Database connection
- `PEXELS_API_KEY` - Pexels API secret key
- Authentication secrets (BETTER_AUTH_SECRET, Google OAuth secrets)

**Public (available on client via NEXT_PUBLIC_ prefix):**
- `NEXT_PUBLIC_APP_URL` - Application domain (for links, SSR context)
- `NEXT_PUBLIC_PEXELS_API_KEY` - For direct Pexels API calls (rate limited per client)

**Validation:** All env vars validated with Zod. Missing or invalid vars fail at build time, never runtime.

### Logging & Error Handling

- **Info logs**: User actions, state changes (use `console.log` in development, structured logging in production)
- **Error logs**: Failed mutations, API errors, auth failures (use `console.error` + Sentry in production)
- **Never log**: API keys, user passwords, PII
- **Error boundaries**: Wrap route segments, fallback to user-friendly message

## Security & Privacy

### Mutation Authorization

Every mutation procedure checks `ctx.userId`. Example:

```typescript
addLike: procedure.input(z.object({ videoId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    if (!ctx.userId) throw new TRPCError({ code: 'UNAUTHORIZED' });
    // Proceed with mutation
  }),
```

### Data Access Control

- Users can read public videos, user profiles, comments
- Users can only modify own likes, comments, bookmarks
- Users can only edit own profile
- Admin-only procedures (video sync, moderation) protected with role check

### No Direct MongoDB Exposure

Client NEVER accesses MongoDB directly. All queries filtered through tRPC procedures. This is the only auth/permission gate.

## Governance

### Constitution Supersedes All Practices

This document is the source of truth for development standards. Questions about "how should we do X?" are resolved by checking constitution first. If constitution is silent, team decides and documents in this file.

### Amendment Process

1. **Issue**: Raise as GitHub issue with `[constitution]` label
2. **Discussion**: Team consensus required (no unilateral changes)
3. **Version Bump**: 
   - MAJOR: Principle removed or fundamentally redefined (breaking change for workflow)
   - MINOR: New principle added or existing principle materially expanded
   - PATCH: Clarification, wording, non-semantic refinement
4. **Update Propagation**: Amend `SPECIFICATION.md`, update prompt templates if needed
5. **Commit**: `docs: amend constitution to vX.Y.Z (reason)`

### Compliance Review

Every PR is checked against constitution:
- [ ] Types are explicit (no `any`)
- [ ] tRPC contracts clear and Zod-validated
- [ ] Component hierarchy follows composition pattern
- [ ] Server components used where possible
- [ ] Nuqs for URL state (if applicable)
- [ ] TanStack Query for data (if applicable)
- [ ] Authorization checks in mutations

### Reference Documentation

- Runtime guidance: See `SPECIFICATION.md` for detailed feature specs, API contracts, component examples
- Prompt-based workflow: Use `.github/prompts/speckit.*.prompt.md` for `(constitution → specify → clarify → plan → implement)` flow

---

**Version**: 1.0.0 | **Ratified**: 2025-10-17 | **Last Amended**: 2025-10-17
