---
description: Execute the implementation planning workflow using the plan template to generate design artifacts.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Social Media Platform Context

This project follows a strict architecture defined in the constitution's 10 Core Principles:

1. **Type Safety & DX** - Strict TypeScript, no `any` types
2. **Server Components** - Next.js App Router + server components by default
3. **tRPC-First Data** - All data via tRPC procedures, never direct MongoDB
4. **URL State (Nuqs)** - Filters, pagination, search in URL parameters
5. **TanStack Query** - Client-side caching + optimistic updates
6. **Forms (RHF + Zod)** - Client validation + server-side schema check
7. **Component Composition** - Shadcn/ui + Kibo UI, compose don't duplicate
8. **MongoDB Schemas** - Typed collections, explicit indexes
9. **Pexels Content** - API sync service, no direct client access
10. **Auth in tRPC Context** - Every mutation checks `ctx.userId` first

## Tech Stack Reference

**Frontend**: Next.js 15.5.6 (App Router), TypeScript 5, Tailwind CSS 4
**UI Components**: shadcn/ui + Kibo UI custom components
**State Management**: TanStack Query 5.90.5, Nuqs (URL state)
**Forms**: React Hook Form + Zod validation
**RPC**: tRPC 11.6.0 with server components support
**Database**: MongoDB with typed schemas
**Animation**: Motion 12.23.24, Embla Carousel
**Content**: Pexels API (videos)

When creating technical plans, ensure all architecture decisions align with these principles. Reference:
- `.specify/memory/constitution.md` for complete principles
- `.github/prompts/speckit.social-media-implementation.prompt.md` for implementation patterns
- `SPECIFICATION.md` for project architecture details
- `QUICK_REFERENCE.md` for common patterns

## Outline

1. **Setup**: Run `.specify/scripts/powershell/setup-plan.ps1 -Json` from repo root and parse JSON for FEATURE_SPEC, IMPL_PLAN, SPECS_DIR, BRANCH. For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").

2. **Load context**: Read FEATURE_SPEC and `.specify/memory/constitution.md`. Load IMPL_PLAN template (already copied).

3. **Execute plan workflow**: Follow the structure in IMPL_PLAN template to:
   - Fill Technical Context (mark unknowns as "NEEDS CLARIFICATION")
   - Fill Constitution Check section from constitution
   - Evaluate gates (ERROR if violations unjustified)
   - Phase 0: Generate research.md (resolve all NEEDS CLARIFICATION)
   - Phase 1: Generate data-model.md, contracts/, quickstart.md
   - Phase 1: Update agent context by running the agent script
   - Re-evaluate Constitution Check post-design

4. **Stop and report**: Command ends after Phase 2 planning. Report branch, IMPL_PLAN path, and generated artifacts.

## Phases

### Phase 0: Outline & Research

1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

### Phase 1: Design & Contracts

**Prerequisites:** `research.md` complete

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Agent context update**:
   - Run `.specify/scripts/powershell/update-agent-context.ps1 -AgentType copilot`
   - These scripts detect which AI agent is in use
   - Update the appropriate agent-specific context file
   - Add only new technology from current plan
   - Preserve manual additions between markers

**Output**: data-model.md, /contracts/*, quickstart.md, agent-specific file

## Key rules

- Use absolute paths
- ERROR on gate failures or unresolved clarifications
