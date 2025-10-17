# Constitution & Prompts: Setup Complete

## What Was Created

This document explains all files created in `.specify/memory/` and `.github/prompts/` for your social media platform.

---

## Constitution (`.specify/memory/constitution.md`)

**What it is**: A living document of 10 core principles + governance rules for your project.

**Principles embedded**:
1. **Type Safety & DX**: Strict TypeScript, no `any` types
2. **Server Components**: Next.js App Router patterns, client only when needed
3. **tRPC-First Data**: All data access via tRPC procedures (never direct MongoDB)
4. **Nuqs for URL State**: Filters, pagination, search in URL parameters
5. **TanStack Query**: Client-side caching + optimistic updates
6. **React Hook Form + Zod**: Client + server validation
7. **Component Composition**: Shadcn/ui foundation + Kibo UI custom layers
8. **MongoDB Typed Schemas**: Explicit collection models, indexes
9. **Pexels as Content Source**: Sync service, no direct client access
10. **Auth in tRPC Context**: Every mutation checks `ctx.userId`

**Why it matters**:
- Establishes non-negotiable standards (type safety, security, performance)
- Guides code reviews (does this PR violate a principle?)
- Enables team consistency (everyone follows same patterns)
- Documents architectural decisions (why tRPC? why server components?)

**Current version**: 1.0.0 (Ratified 2025-10-17)

**How to use it**:
1. Read it to understand the project's rules
2. Reference it when uncertain ("should I use this pattern?")
3. Check it during code review ("does this violate a principle?")
4. Amend it when discovering new patterns (team consensus → version bump)

---

## Prompt Files (`.github/prompts/`)

### 1. `speckit.constitution.prompt.md`

**Purpose**: Maintain and amend the constitution

**When to use**:
- Project starts → Create initial constitution
- Discover a pattern → Add principle
- Clarify existing rule → Update principle
- Team review → Audit for consistency

**Usage**:
```bash
/speckit.constitution
Clarify: Where should we check authorization? Backend or component?
```

**What it does**:
1. Loads current constitution
2. Validates proposed amendment (no contradictions, no duplicates)
3. Updates with version bump (PATCH for clarity, MINOR for new principle, MAJOR for removal)
4. Checks dependent files (SPECIFICATION.md, other prompts, code)
5. Generates Sync Impact Report
6. Outputs updated constitution + version rationale

**Key point**: Constitution is the source of truth. All other documents must align.

---

### 2. `speckit.specify.prompt.md`

**Purpose**: Generate feature specifications (WHAT to build, not HOW)

**When to use**: Starting a new feature

**Usage**:
```bash
/speckit.specify
Users should be able to comment on videos.
Comments show creator name, timestamp, like count.
Users can reply to comments (nested).
Comments sorted newest first.
Users can edit/delete own comments.
```

**What it does**:
1. Parses natural language description
2. Creates feature branch (`feat/user-comments`)
3. Writes specification with:
   - User Scenarios (how users interact)
   - Functional Requirements (what system must do)
   - Success Criteria (measurable outcomes)
   - Assumptions (reasonable defaults)
4. Generates quality checklist
5. Validates against constitution
6. Asks clarification questions (max 3) if ambiguous

**Output**:
- `features/user-comments/spec.md`
- `features/user-comments/checklists/requirements.md`

**Key point**: Specification is TECHNOLOGY AGNOSTIC (no React, MongoDB, tRPC). It's what users need, not how to build it.

---

### 3. `speckit.plan.prompt.md` (Already Exists)

**Purpose**: Create technical architecture & task breakdown

**When to use**: After specification is approved

**What it does**:
1. Reads specification
2. Creates detailed technical plan:
   - Tech stack review
   - MongoDB collections + indexes
   - tRPC routers (input/output schemas)
   - Component hierarchy
   - File structure
3. Generates task breakdown (Setup, Tests, Core, Integration, Polish)
4. Creates data models + API contracts
5. Validates against constitution
6. Creates quality checklists (UX, Testing, Security)

**Output**:
- `features/user-comments/plan.md`
- `features/user-comments/data-model.md`
- `features/user-comments/tasks.md`
- `features/user-comments/checklists/ux.md`
- `features/user-comments/checklists/test.md`
- `features/user-comments/checklists/security.md`

**Key point**: Plan aligns with constitution patterns. Tasks are atomic and executable.

---

### 4. `speckit.implement.prompt.md` (Already Exists)

**Purpose**: Execute task list, write code following constitution

**When to use**: After plan is approved

**What it does**:
1. Verifies checklists are complete
2. Executes tasks phase-by-phase (Setup → Tests → Core → Integration → Polish)
3. For each task:
   - Creates/updates files
   - Writes code following constitution (type safety, tRPC patterns, server components)
   - Runs tests
   - Marks task [X] in tasks.md
4. Reports progress after each phase
5. Final summary with all completed work

**Output**:
- All files created (routers, components, tests)
- Code follows constitution
- Tests passing
- tasks.md marked complete

**Key point**: Code is generated to specification + plan. Follows constitution patterns automatically.

---

### 5. `speckit.social-media-implementation.prompt.md` (NEW - ARCHITECTURE GUIDE)

**Purpose**: Implementation patterns specific to social media platform

**When to use**: Reference during code review or implementation

**Key patterns documented**:
1. **Infinite Scroll Page** (server prefetch + client useInfiniteQuery)
2. **Detail Page** (server fetch + 404 check + prefetch related)
3. **Mutation with Optimistic Update** (like, comment, save)
4. **Form with Validation** (React Hook Form + Zod + tRPC)

**Implementation rules**:
- No `any` types (Type Safety)
- All data via tRPC (tRPC-First)
- Authorization in tRPC context (Auth in Context)
- URL state via Nuqs (Nuqs for State)
- Component composition (Shadcn + Kibo)
- Server components by default (Server Components)

**File naming**:
- Components: PascalCase (`VideoCard.tsx`)
- Hooks: camelCase `use` prefix (`useVideos.ts`)
- Utils: camelCase (`pexels-client.ts`)
- Routers: camelCase plural (`videos.ts`)
- Types: PascalCase (`Video`, `User`)

**Testing expectations**:
- Type coverage (TypeScript compiles, no `any`)
- Happy path (feature works as specified)
- Error case (proper error handling)
- Authorization (auth checks work)

**Key point**: Reference this when writing code or reviewing PRs. Shows exactly how to implement each pattern.

---

## Supporting Guides (`.github/prompts/`)

### `WORKFLOW_GUIDE.md` (NEW)

**Purpose**: Explains the complete workflow (Constitution → Specify → Plan → Implement)

**Sections**:
- Quick start for each phase
- Workflow diagram (Constitution → Specify → Plan → Implement)
- File structure reference
- Tips by role (PM, Architect, Developer, Constitution Maintainer)
- Troubleshooting guide
- Key takeaways

**Use this** when onboarding team members or explaining the process.

---

### `QUICK_REFERENCE.md` (NEW)

**Purpose**: One-page cheat sheet for principles, patterns, and rules

**Includes**:
- Constitution summary (10 principles in table format)
- Phase quick start (specify, plan, implement commands)
- Architecture patterns (code examples)
- Implementation rules (good vs bad)
- File checklist for new features
- Common pitfalls + fixes
- Links to all documentation

**Use this** during development when you need quick answers.

---

## How These Files Work Together

```
┌─────────────────────────────────────────────────────────┐
│  Constitution                                           │
│  (.specify/memory/constitution.md)                      │
│  ├─ 10 Core Principles (Type Safety, tRPC, etc.)       │
│  └─ Governance (Amendment process, compliance)         │
└────────────────────┬────────────────────────────────────┘
                     │
        ╔════════════════════════════╗
        ║ Reference in Code Review   ║
        ║ & Architecture Decisions   ║
        ╚════════════════════════════╝
                     │
┌─────────────────────▼────────────────────────────────────┐
│  Prompt: speckit.constitution                           │
│  (.github/prompts/speckit.constitution.prompt.md)       │
│  ├─ Amend constitution                                   │
│  ├─ Validate alignment                                   │
│  └─ Version bump with rationale                         │
└─────────────────────────────────────────────────────────┘
                     │
        ╔════════════════════════════╗
        ║ Team uses prompts to       ║
        ║ build features systematically
        ╚════════════════════════════╝
                     │
    ┌────────────────┼────────────────┐
    │                │                │
    ▼                ▼                ▼
Phase 1          Phase 2           Phase 3
Specify          Plan              Implement
(.specify)       (.plan)           (.implement)

Writes           Creates           Executes
WHAT to build    HOW to build it   Builds it

Output:          Output:           Output:
spec.md          plan.md           Source code
+ checklist      + tasks.md        + tests
                 + data-model.md
                 
    │                │                │
    └────────────────┼────────────────┘
                     │
        ┌────────────────────────┐
        │ Reference Architecture │
        │ Guide for patterns     │
        │ (.social-media-impl..) │
        └────────────────────────┘
                     │
        ╔════════════════════════════╗
        ║ Code follows constitution  ║
        ║ patterns automatically     ║
        ╚════════════════════════════╝
```

---

## Getting Started: First Steps

### Step 1: Review Constitution
```
Read .specify/memory/constitution.md
Understand 10 principles
Map to your project's tech stack (tRPC, MongoDB, Next.js, TypeScript)
```

### Step 2: Onboard Team
```
Share WORKFLOW_GUIDE.md with team
Share QUICK_REFERENCE.md as bookmark
Explain Constitution principles in standup
```

### Step 3: Start First Feature
```bash
# Specify what to build
/speckit.specify
Create infinite scroll video feed with Pexels videos.
Users can like, comment, share. Videos autoplay when visible.

# Plan how to build it
/speckit.plan

# Implement it
/speckit.implement
```

### Step 4: Code Review
```
Reference speckit.social-media-implementation.prompt.md
Check each PR against constitution principles
Enforce type safety, tRPC patterns, component composition
```

---

## Key Files Summary

| File | Purpose | When to Use |
|------|---------|------------|
| `.specify/memory/constitution.md` | Development standards | Reference before coding, during review |
| `speckit.constitution.prompt.md` | Amend constitution | Add/clarify principle or governance rule |
| `speckit.specify.prompt.md` | Write specifications | Start new feature |
| `speckit.plan.prompt.md` | Technical planning | After spec approved |
| `speckit.implement.prompt.md` | Code generation | After plan approved |
| `speckit.social-media-implementation.prompt.md` | Implementation patterns | During code implementation/review |
| `WORKFLOW_GUIDE.md` | Process explanation | Onboarding, process questions |
| `QUICK_REFERENCE.md` | Cheat sheet | Quick lookup during development |

---

## Success Metrics

After using these files for a few features, you should see:

- ✓ **Consistency**: All features follow same patterns (tRPC routers, component hierarchy, type safety)
- ✓ **Speed**: Team ships features faster (clear spec → clear plan → execute tasks)
- ✓ **Quality**: Code reviews simpler (check against constitution principles)
- ✓ **Onboarding**: New team members learn through specification + implementation patterns
- ✓ **Documentation**: Every feature self-documenting (spec.md explains what, plan.md explains how)

---

## Next Actions

1. **Commit**: 
```bash
git add .specify/memory/constitution.md .github/prompts/
git commit -m "feat: add constitution & workflow prompts for social media platform"
```

2. **Share**: Send team:
   - `.specify/memory/constitution.md`
   - `.github/prompts/WORKFLOW_GUIDE.md`
   - `.github/prompts/QUICK_REFERENCE.md`

3. **Start**: Use `/speckit.specify` for your first feature!

4. **Monitor**: After 3-4 features, review constitution for patterns to add

---

**Created**: 2025-10-17 | **Version**: 1.0.0
