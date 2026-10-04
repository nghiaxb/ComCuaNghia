# Cơm Của Nghĩa — project instructions

## Start here

Read `docs/handoff.md`, `README.md`, and the latest dated section of `docs/staging.md` before editing. Older sections are historical evidence, not current configuration. Check git status/branch and preserve user changes. Continue the current feature branch `feat/webapp-v1` / draft PR #1; do not merge main without an explicit merge request.

Use Vietnamese for user-facing text and progress reports. Proceed with authorized work and routine reversible changes; do not repeatedly ask for confirmation. Report concrete blockers and verification evidence. Never claim a simulated fixture proves live multi-account Realtime.

## Architecture and contracts

React 19 / Vite / TypeScript frontend; repo-owned shadcn/ui + Tailwind v4; Supabase Auth/Postgres/Realtime/Storage; Cloudflare Worker APIs/integrations. `src/features/` presents data, `src/lib/order-autosave.ts` and `useOrderDraft` own draft saving, `src/lib/refresh.ts` batches refreshes, `shared/` defines contracts/time/money, `worker/` handles APIs/integrations, `supabase/migrations/` owns database transactions/RLS.

The server is authoritative for permission, versions, allocation, audit and outbox. Do not write business tables directly from the browser. Do not introduce Redux, TanStack Query, another UI framework or schema changes merely to reorganize UI; justify any new dependency by a concrete requirement. Pin dependencies and keep the lockfile.

## Business invariants

- Google login must be verified and belong to `rivercrane.vn`; respect active membership and existing roles/RLS.
- Timezone is `Asia/Ho_Chi_Minh`, amounts are integer VND. The 17:00 previous-day cutoff is informational: users can modify/cancel until a day is locked or its week is settled.
- All active employees may place/edit/cancel for another employee. Require the proxy reason, preserve actor and recipient, and audit before/after. Public roster/bill visibility must not expose private email, webhook, payment or audit fields outside existing permissions.
- Preserve serial autosave, request IDs/idempotent retries, expected versions, uncertain-response recovery, manual-mode consent, and dirty guards for day/member/week/route/Back/logout. Realtime snapshots must not replace local drafts or proxy reasons.
- OCR accepts upload/drop/paste with immediate local preview. Only explicit submit sends the image. Keep the selected image on failure. Select the target week explicitly; weekend defaults point to the next work week. Monday reminders are tied to the menu/OCR publication flow and its Chat choice, not a Monday reminder cron.
- Menu publication can explicitly clear current active orders for that week after confirmation. Rename/remove food reconciles affected order items; price edits update retained items and notify through existing audit/outbox. Preserve history. Read current reconciliation SQL before changing this behavior.
- Shared order/bill overview updates from order mutations, not only a manager saving a bill. Preserve integer allocation and settlement snapshots. Remote bill changes must keep a local bill draft and its original expected version.
- Destructive/reason dialogs must bind to the initiating subject, await actions, prevent dismissal while processing, retain reasons on failure and restore focus. Keep compact food lists without decorative meal images.

## UI conventions

shadcn sources live in `src/components/ui/`; `components.json` configures aliases/style. Radix dependencies are normal: no runtime `shadcn` package is required. Reuse tokens in `src/app/styles.css`, `cn`, generated primitives and existing domain wrappers `ActionButton`/`Modal`. Additional registry components should have a real consumer. Avoid blindly overwriting customized components through CLI.

Verify keyboard focus, mobile wrapping, 44px primary touch targets and a single cart/controller. Test 320/390/1440px when changing layout. Escape/outside-click behavior must respect busy state.

## Verification

Use Node 24 and `npm ci`. Run relevant regressions for each change; reproduce bugs before fixing. Full release baseline:

```sh
npm run lint
npm run format:check
npm run typecheck
npm run check:secrets
npm test
npm run test:integration
python3 -m unittest discover -s tests -p '*_test.py'
npx playwright install chromium
npm run test:e2e
npm run build
npx wrangler deploy --config wrangler.staging.jsonc --dry-run --minify
```

Integration uses PGlite and browser tests use fixtures; real OAuth/Realtime/OCR/Chat need separate staging evidence. Do not skip tests or weaken business assertions to make a UI migration pass. For documentation-only edits, check formatting, links, factual consistency and secret scan; runtime tests need not be rerun.

## Environment and delivery

Follow `docs/handoff.md` for local preview/backend setup. Keep secret values out of Git, screenshots, logs and chat. Frontend receives only the public Supabase URL/publishable key. `INTEGRATION_MASTER_KEY` is a random encryption key, not the Google Chat webhook.

Preserve Worker `global_fetch_strictly_public`, all existing secrets/bindings, SPA fallback and `/api/*` Worker-first routing. Cloudflare fetch redirect mode is `manual` in existing integration helpers; do not reintroduce `redirect: "error"`. Use staging configuration for staging. Deployment requires a task that authorizes it; this handoff does not independently authorize future production writes, imports or real Chat messages. Use isolated test data for external QA and coordinate live destructive tests with the user.

After an authorized deployment, verify `/order` returns HTML, deployed JS/CSS MIME and bytes match the configured build, health is 200 and unauthenticated snapshot is 401. Keep PR draft unless the user requests otherwise.
