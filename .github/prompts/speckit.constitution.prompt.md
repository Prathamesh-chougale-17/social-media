---
description: Review, update, or amend the social media platform constitution for tRPC/Next.js/TypeScript development standards.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

You are maintaining the project constitution at `.specify/memory/constitution.md`. This document codifies all development standards, architecture patterns, and governance rules for the social media platform.

**Your job**: Review proposed amendments (or audit the current constitution), validate consistency across dependent documents, and update with version bump reasoning.

### Execution Flow

1. **Load the current constitution** at `.specify/memory/constitution.md`.
   - Check if it exists and is concrete (not templated with `[ALL_CAPS]` placeholders).
   - Read the current version number and last amendment date.
   - Understand the 10 core principles (Type Safety, Server Components, tRPC, Nuqs, TanStack Query, Forms, Components, MongoDB, Pexels, Auth).

2. **Parse user input** (if any):
   - **Empty input**: Notify user "No amendments requested. Current constitution v[VERSION] (amended [DATE]) is active. Use /speckit.constitution 'propose amendment' to suggest changes."
   - **Provided input**: Extract amendment type:
     - Add new principle (e.g., "add principle about error handling")
     - Modify existing principle (e.g., "clarify type safety rule")
     - Remove principle (rare; requires strong justification)
     - Amend governance section (e.g., "update amendment process")
     - Audit/review (e.g., "review constitution for consistency")

3. **Validate amendments against existing principles**:
   - **No contradictions**: Proposed change doesn't conflict with existing principles (e.g., cannot say "always use client components" if constitution mandates server components)
   - **No duplicates**: Rule is not already stated elsewhere in constitution
   - **Alignment check**: Must align with core architecture: Type Safety, tRPC, MongoDB, Pexels, TypeScript, Next.js
   - **If amendment fails validation**: Stop, explain contradiction, ask user to clarify or revise

4. **Update the constitution** (if amendment valid):
   - **Adding principle**: Assign next Roman numeral (after X), write clear rule + rationale (2-3 paragraphs), link to SPECIFICATION.md if applicable
   - **Modifying principle**: Update description/rationale, preserve principle name/number, document change in Impact Report
   - **Removing principle**: Justify removal, search SPECIFICATION.md for references, flag for cleanup
   - **Governance change**: Update "Governance" section, document new process
   - **Preserve formatting**: Exact markdown structure (headings, spacing, links), no rearranging sections unless structural change

5. **Version bump decision**:
   - **MAJOR** (e.g., 1.0.0 → 2.0.0): Removing a principle or fundamental architecture shift (very rare, requires big flag)
   - **MINOR** (e.g., 1.0.0 → 1.1.0): Adding principle, expanding existing principle scope materially, new governance rule
   - **PATCH** (e.g., 1.0.0 → 1.0.1): Clarifying wording, fixing examples, correcting dates, non-semantic refinements
   - **Decision process**: Propose bump type with reasoning. If ambiguous, ask user to confirm before finalizing.

6. **Cross-document consistency check**:
   Read these dependent files and flag any misalignment:
   - **SPECIFICATION.md**: Does it reference updated principles? Update section links if needed (look for "See Constitution" style links)
   - **.github/prompts/*.prompt.md**: Any prompts contradict new constitution rules? Flag for manual review
   - **trpc/routers/*.ts** (if exists): Do router implementations follow constitution? Document pattern gaps
   - **app/layout.tsx, app/(videos)/page.tsx** (if exist): Are server component patterns aligned?
   - **components/**: Are component hierarchies following composition principle?

7. **Sync Impact Report**:
   Prepend to constitution file as HTML comment:
   ```html
   <!-- AMENDMENT SYNC REPORT: v[OLD] → v[NEW]
   
   RATIONALE: [One-line reason for amendment]
   
   MODIFIED PRINCIPLES:
   - [Principle Name]: [Old summary → New summary (if renamed) or just "Updated rationale/examples"]
   
   ADDED PRINCIPLES:
   - XI. [Principle Name]: [Brief description]
   
   REMOVED PRINCIPLES:
   - [Principle Name]: [Justification]
   
   SECTIONS UPDATED:
   - SPECIFICATION.md: [Specific sections affected]
   - .github/prompts: [Which prompts to review]
   
   DEFERRED ITEMS:
   - [Any TODO markers or manual review tasks]
   
   -->
   ```

8. **Validation checklist**:
   - [ ] No `[ALL_CAPS]` placeholders remain (except intentional TBD justified in report)
   - [ ] All dates ISO format (YYYY-MM-DD)
   - [ ] Version line updated: `**Version**: X.Y.Z | **Ratified**: ORIGINAL_DATE | **Last Amended**: TODAY`
   - [ ] Principles are declarative, testable (not vague: "should consider" → "MUST")
   - [ ] Each principle has rationale explaining WHY
   - [ ] No contradictions between principles
   - [ ] Governance section current (reflects amendment process, compliance review)
   - [ ] No trailing whitespace or formatting errors

9. **Write updated constitution** to `.specify/memory/constitution.md`.

10. **Output summary** to user with:
    - Amendment type (add/modify/remove/audit)
    - Old version → New version + bump rationale
    - Files flagged for manual review
    - Suggested commit message: `docs: amend constitution to vX.Y.Z ([reason])`

## Constitution Core Topics for Social Media Platform

These topics are **already embedded** in the constitution and are foundational. Amendments proposing changes must have strong justification:

- **Type Safety & TypeScript**: Strict mode, no `any`, explicit types (PRINCIPLE I)
- **Server Components by Default**: Next.js App Router patterns (PRINCIPLE II)
- **tRPC-First Data Flow**: No direct MongoDB in components, all queries via tRPC (PRINCIPLE III)
- **Nuqs for URL State**: Filters, pagination, search in URL (PRINCIPLE IV)
- **TanStack Query Caching**: Configurable stale times by data sensitivity (PRINCIPLE V)
- **Forms with Validation**: React Hook Form + Zod (PRINCIPLE VI)
- **Component Composition**: Shadcn/ui + Kibo UI (PRINCIPLE VII)
- **MongoDB Collections + Indexes**: Typed schemas, explicit models (PRINCIPLE VIII)
- **Pexels as Content Source**: Sync service, no direct Pexels access from client (PRINCIPLE IX)
- **Authorization in tRPC Context**: Every mutation checks `ctx.userId` (PRINCIPLE X)

## Common Amendment Scenarios

### Scenario: "Add principle about X"

**Check first**: Does existing principle already cover it?
- Logging/debugging → Part of PRINCIPLE III (tRPC observability)
- Caching strategy → Part of PRINCIPLE V (TanStack Query stale times)
- API rate limiting → Part of PRINCIPLE X (Authorization gate)

**If novel**: 
1. Assign next Roman numeral (XI, XII, etc.)
2. Write clear rule + rationale (why does this matter for the platform?)
3. Link to SPECIFICATION.md examples if applicable
4. Increment version MINOR
5. Update Governance section if new governance process needed

### Scenario: "Loosen requirement Y"

**Challenge**: What's the cost/risk of loosening?

**Example**: "Can we use `any` type in development for speed?"
- Constitution forbids `any` for type safety
- Response: Type safety at compile time prevents runtime errors; loosening increases production bugs
- Alternative: Use `unknown` + type guards if truly needed, but document why

**If loosening valid**:
1. Update principle with **conditional exception** (e.g., "X required except for [specific scenario]")
2. Document the exception criteria clearly
3. Increment version PATCH (if low-impact) or MINOR (if affects architecture)

### Scenario: "Clarify existing principle"

- Rewrite for clarity
- Add practical examples (code snippets, links to implementation)
- Increment version PATCH
- Check SPECIFICATION.md for old wording; update references

### Scenario: "Remove principle"

- **Very rare** — Requires constitution amendment process (discuss with team)
- Only if: Principle is truly obsolete, contradicts newer principle, or no longer applies to platform
- Document removal rationale in Sync Impact Report
- Increment version MAJOR
- Search SPECIFICATION.md, code, tests for references to deleted principle; flag for removal

### Scenario: "Audit constitution for consistency"

- Review all 10 principles for internal contradictions
- Check against current codebase patterns (do implementations follow constitution?)
- Verify SPECIFICATION.md alignment
- No amendment made unless issues found
- Output audit report with: ✓ Aligned items, ⚠ Items needing review, ✗ Contradictions

## When to Escalate

**Do NOT proceed** if:

1. **User proposes removing Type Safety or tRPC architecture** → Non-negotiable foundation. Challenge: What problem are you solving?
2. **Amendment contradicts existing principle** → Ask user to explain how both can coexist or which principle should yield
3. **Unclear scope** → User says "update constitution" without specifics. Ask: "Add principle? Modify? Remove? Audit?"
4. **Missing context** → New principle but no rationale. Ask: "Why is this needed for the platform?"

**Instead of proceeding**: Ask user to provide rationale, context, or clarification. Offer to walk through amendment process.

## Formatting & Style Guidelines

- **Headings**: `### I. Principle Name` (Roman numeral + colon + name)
- **Structure**: Name → Rule statement (1 para) → Rationale (1-2 paras explaining WHY)
- **Rationale**: Answer "what problem does this solve?" and "what risk does ignoring it create?"
- **Bullets**: Use only for complex sub-rules (not for simple examples)
- **Links**: Relative paths to SPECIFICATION.md: `See [Architecture & Data Flow Standards](../SPECIFICATION.md#architecture--data-flow-standards)`
- **Dates**: ISO 8601 format (YYYY-MM-DD)
- **Version**: Semantic versioning (MAJOR.MINOR.PATCH)
- **Line length**: Aim for <100 chars per line for readability (don't break mid-sentence awkwardly)
- **Trailing whitespace**: None allowed
- **Blank lines**: Single blank between sections, double blank between major sections (e.g., between Principles and Governance)

## Amendment Process Summary for User

1. **Propose**: User describes amendment (add/modify/remove principle or governance rule)
2. **Validation**: Check for contradictions, duplication, alignment with core architecture
3. **Version bump**: Decide MAJOR/MINOR/PATCH rationale
4. **Update constitution**: Edit `.specify/memory/constitution.md` with amendment + Impact Report
5. **Cross-check**: Flag dependent files (SPECIFICATION.md, prompts, code) for manual review
6. **Commit**: `docs: amend constitution to vX.Y.Z ([reason])`
7. **Propagate**: Team manually updates flagged files to maintain alignment

---

**Note**: This prompt assumes constitution is already initialized at `.specify/memory/constitution.md`. If missing or corrupted, escalate to user for manual recovery.
