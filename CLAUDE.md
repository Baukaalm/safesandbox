---
description: Core coding style — functional programming, immutability, composition
---

# Coding Style

## Functional First

- Pure functions, no side effects unless explicitly needed (I/O, DOM)
- Immutable data: `const` only, spread/structuredClone over mutation, `readonly` in types
- Composition over inheritance: pipe small functions, avoid class hierarchies
- `map`/`filter`/`reduce`/`flatMap` over imperative loops
- Expressions over statements: ternary over if/else where readable, early returns

## TypeScript Conventions

- Arrow functions for everything except React components needing display names
- Destructure props, params, and imports
- Strict types (`strict: true`), prefer `type` over `interface`
- Zod for runtime validation, infer types from schemas (`z.infer<typeof schema>`)
- Discriminated unions over optional fields for state modeling
- No `any` — use `unknown` + narrowing; `as` casts only with justification

## File & Function Hygiene

- Functions: ≤20 lines preferred, 40 max; extract helpers aggressively
- Files: ≤200 lines preferred, 400 normal, 800 absolute max — split if larger
- No `console.log` in committed code (use proper logger or remove)
- No comments narrating code — only non-obvious intent, trade-offs, constraints
- DRY: extract repeated patterns into higher-order functions or shared utilities

## Naming

- `camelCase` for variables/functions, `PascalCase` for types/components, `UPPER_SNAKE` for constants
- Boolean variables/props: `is`/`has`/`should`/`can` prefix
- Event handlers: `on` prefix (`onClick`, `onSubmit`)
- Predicates and guards: descriptive verb (`isValid`, `hasPermission`)

---
description: Security checklist — secrets, validation, XSS, environment
---

# Security Checklist

## Secrets

- **No hardcoded secrets** — no API keys, tokens, passwords, or connection strings in source code
- Environment variables via `.env` files (gitignored) or CI/CD secrets
- If you spot a secret in code, flag it immediately and suggest `.env` extraction

## Input Validation

- Validate **all** external input (API responses, URL params, form data) with Zod schemas
- Never trust client-side validation alone — it's UX, not security
- Sanitize before rendering: escape HTML in user-generated content

## XSS Prevention

- Never use `dangerouslySetInnerHTML` without sanitization (use `DOMPurify` if needed)
- Avoid string interpolation in URLs — use `URL`/`URLSearchParams` constructors
- CSP headers should be configured at the server/proxy level

## Dependencies

- Review new dependencies before adding: check maintenance, bundle size, known vulnerabilities
- Keep `pnpm audit` clean — address high/critical vulnerabilities promptly
- Prefer well-maintained packages from the existing stack over new additions

## Auth & Network

- Never store tokens in `localStorage` — prefer `httpOnly` cookies or in-memory
- API calls go through the configured client (with auth interceptors), not raw `fetch`
- Log out / redirect on 401 — don't silently swallow auth failures

---
description: Token economy — minimize context usage, efficient tool use
alwaysApply: true
---

# Token Economy

- **Read before edit** — always read the file (or relevant section) before modifying
- **Use `explore` subagent** for broad codebase questions; don't grep manually across many files
- **Use `fast` model** for subagents on straightforward/scoped tasks (renames, simple edits, searches)
- **Batch parallel tool calls** — if calls are independent, send them in one message
- **Prefer glob-scoped rules** (`alwaysApply: false` + `globs`) over `alwaysApply: true` to reduce per-prompt token cost
<!-- - **Leverage `project-architecture.md`** — don't re-explore the monorepo structure, it's documented there -->
- **Targeted reads** — use line offsets for large files instead of reading the entire file
- **Don't over-search** — if you know the file path, read it directly; use Grep for exact symbols, SemanticSearch for conceptual questions

---
description: TypeScript/React patterns — Mantine, TanStack, FSD, Zod
globs: "**/*.ts,**/*.tsx,**/*.js,**/*.jsx"
alwaysApply: false
---

# TypeScript & React Patterns

## React Components

- Functional components only, typed with `React.FC` or explicit prop types
- Colocate hook logic: extract custom hooks when a component exceeds ~30 lines of logic
- Prefer controlled components; uncontrolled only with `useRef` when performance demands it
- Memoize with `React.memo`/`useMemo`/`useCallback` only when profiling shows a need — not by default

## Mantine UI

- Use Mantine components as the primary UI library — don't reimplement what Mantine provides
- Theming via `MantineProvider` and `theme` object; avoid inline `style` props for anything theme-addressable
- Use `@mantine/form` with Zod resolver for form validation (`zodResolver`)
- Responsive props: prefer Mantine's responsive object syntax (`{{ base: 'sm', md: 'lg' }}`) over media queries

## TanStack Query

- `useQuery` for reads, `useMutation` for writes — never use `useEffect` for data fetching
- Query keys: structured arrays `['entity', id, filters]`, extract into factory functions
- Stale/cache times: set per-query based on data volatility, don't rely on global defaults
- Invalidate related queries in `onSuccess` of mutations
- Use `select` to transform/derive data in the query, not in the component

## TanStack Router

- File-based routing: route files in `routes/` directory, follow the `__root.tsx` → layout → page convention
- Type-safe search params via Zod schemas in `validateSearch`
- Loaders for data prefetching — colocate loader logic with route definition
- Use `Link` component for navigation, never raw `<a>` tags for internal routes

## Feature-Sliced Design (FSD)

Layer hierarchy (imports flow downward only):

```
app → pages → widgets → features → entities → shared
```

- **shared**: UI kit, libs, API client, types, constants — no business logic
- **entities**: domain models + their UI (cards, rows), data access (query hooks)
- **features**: user actions (create, edit, delete) — compose entities, contain business logic
- **widgets**: composite UI blocks assembling features + entities for a page section
- **pages**: route-level components wiring widgets into layouts
- **app**: providers, routing, global config

Cross-layer rules:
- Never import upward (e.g. `entities` must not import from `features`)
- Each slice has `index.ts` public API — import only from the barrel, never from internal files
- Shared code between slices goes into `shared/` layer

## Zod & API Contracts

- Define Zod schemas as the single source of truth for API shapes
- Derive TypeScript types: `type User = z.infer<typeof userSchema>`
- Use `.transform()` for API response normalization (dates, enums)
- Colocate schemas with the entity/feature that owns them
- Hey API (`@hey-api/openapi-ts`) for OpenAPI codegen — generated types live in `data-n-contracts`

## Imports

- Path aliases: `@myhr/<package>` for cross-package imports
- Barrel imports (`index.ts`) for public API of each FSD slice
- Keep import order: externals → `@myhr/*` → relative (auto-sorted by linter)
