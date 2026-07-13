# AI Workflow Notes

## Tools used

Claude Code (Sonnet 5) was used for the full build, working from a locked-in plan (editor choice, auth approach, persistence, deployment targets) established up front in a planning phase before any code was written.

## Where it materially sped things up

- **Server scaffolding**: Prisma schema (`User`/`Document`/`DocumentShare` with the share unique constraint), Express route structure, centralized error handling (`ApiError` + `errorHandler` middleware), and the `asyncHandler` wrapper were generated quickly from a description of the desired API surface, rather than being hand-typed route by route.
- **Import parsing**: the markdown → Tiptap JSON converter (`server/src/lib/importParser.ts`) walks `marked`'s token stream and maps it to Tiptap's node/mark schema — mapping between two different tree shapes is exactly the kind of mechanical-but-easy-to-get-wrong code where generation plus review was faster than writing it by hand.
- **Client scaffolding and MUI wiring**: the toolbar (bold/italic/underline/heading/list toggle buttons wired to Tiptap's chain commands with active-state reflection) and the CRUD dialogs (rename, delete-confirm, share) followed a repeatable MUI pattern across several components, which generation handled well once the pattern was established in the first one.
- **Seed data**: three users and a few sample documents (including one already shared cross-user) so the sharing feature is visible immediately on first login, without having to manually click through creating that state.

## What was corrected from generated output

- **MUI v9 breaking change**: the client was scaffolded assuming MUI's older shorthand system props (`<Box display="flex" gap={2}>`) still worked directly on `Box`/`Typography`. MUI v9 (the version actually resolved by the `^9.2.0` range at build time) dropped those in favor of requiring `sx`. This surfaced as TypeScript overload-resolution errors during `tsc -b`, not a runtime failure — caught by running the typecheck rather than assuming it would compile, and fixed by converting the shorthand props to `sx={{ ... }}` across `Login`, `Dashboard`, `Editor`, `EditorToolbar`, and `ShareDialog`.
- **`verbatimModuleSyntax` type-only imports**: the scaffolded Vite template enables `verbatimModuleSyntax`, which requires `import type` for type-only imports (`ReactNode`, `User`, `DocumentSummary`, etc.). Several files were generated with plain `import` for types; fixed after the typecheck flagged them.

## How correctness was verified

- Ran `server`'s Jest/Supertest suite (`npm test`) after the server was built — 5 tests covering create, cross-user 403, sharing + recipient visibility, view-only edit rejection, and unauthenticated 401.
- Ran `tsc -b --noEmit` and `npm run build` on the client until clean, rather than assuming generated TypeScript compiles.
- Booted both `server` (port 4000) and `client` (port 5173) locally and drove the actual API surface end-to-end via curl in the exact sequence the UI performs it: login as a seeded user → list documents (verified the `{owned, shared}` response shape matches what the client's `useQuery` expects) → create a document → PATCH content with formatting marks (autosave simulation) → import a `.md` file and confirm the parsed Tiptap JSON has the right heading/bold/list structure → share the created document with a second seeded user (edit permission) → log in as that second user → confirm the document appears in their `shared` list. This exercises the same golden path a manual browser click-through would, at the API-contract level.
