# Codex handoff — 2026-10-04

## Source of truth

- Repo: https://github.com/nghiaxb/ComCuaNghia
- Continue latest `feat/webapp-v1`; draft PR https://github.com/nghiaxb/ComCuaNghia/pull/1. Main has not been merged.
- Application baseline before these handoff docs: remote commit `13e4123f1890712363ae8feab98c879bc24ac300`, tree `9f1409fa6d1cb9d9bc00d35efed8fec45d8aeee3`. Start from the latest branch, not a reset to this historical commit.
- Staging: https://com-cua-nghia-staging.nghiaapag.workers.dev/order
- Supabase staging project: `veptcxaahkghwwfwjzvn`, Singapore. Cloudflare Worker: `com-cua-nghia-staging`; account/config are in `wrangler.staging.jsonc`.

The conversation in ChatGPT Work is not a prerequisite. This document plus AGENTS.md, current code and specs carry the needed context. Do not assume the old scratch workspace, authenticated connectors, skills or browser sessions exist on the new machine. Verify available tools/connections rather than guessing.

## Read in order

1. `AGENTS.md` — persistent instructions and invariants.
2. `README.md` — startup and project conventions.
3. Latest section of `docs/staging.md` — deployment evidence; earlier sections are historical.
4. `docs/superpowers/specs/2026-10-04-ui-redesign-design.md` and corresponding plan — approved redesign, completed.
5. `docs/superpowers/specs/2026-10-03-shared-order-overview-design.md` and corresponding plan — shared roster/bills/autosave.
6. `docs/deployment.md`, `docs/import.md`, original design and current migrations when those areas are affected. If documentation conflicts, inspect current code and ask only about unresolved business intent.

## What exists

Six routes: `/order`, `/menus`, `/summary`, `/finance`, `/audit`, `/settings`. Verified company Google login, proxy ordering for all employees with actor/reason, local OCR preview/drop/paste with explicit submit, week selection/history/menu reconciliation, audited Chat outbox, public daily bill allocations, settlement/payments, personal autosave/manual settings, and realtime refresh batching are implemented.

All screens/shell use Tailwind v4 and shadcn source (Radix). The CLI failed behind the previous proxy, so official registry files were integrated manually. `components.json`, aliases and pinned dependencies are present. `ActionButton`/`Modal` wrappers avoid filename-case collisions with generated `button`/`dialog`. One local cart content/controller renders desktop or mobile Sheet. No Redux/TanStack Query migration was requested or implemented.

Final review fixes bind confirmations to subjects, keep destructive dialogs busy/retryable, wrap long mobile shared rows, restore cart focus and preserve bill drafts with original versions across remote updates.

## Evidence and limits

At the application baseline, npm ci, lint (zero warnings), format, typecheck, secret scan, 52 unit / 34 integration / 55 browser / 3 Python tests passed. Configured Vite build and Worker dry-run passed. This is historical evidence; rerun on the new environment before claiming a new baseline.

Staging assets: `index-DhCyfFi2.js` and `index-BCfLVIdQ.css`. HTML/JS/CSS exact bytes and MIME were verified after deployment; health200 and unauthenticated snapshot401. Eight binding names/types and `global_fetch_strictly_public` were retained. No real Chat test messages were sent in final verification. These are not a guarantee that remote state is unchanged today.

Remaining validation: two real signed-in employee accounts observing Supabase Realtime; actual mobile soft keyboard/safe area; end-to-end real OCR and authorized Chat delivery. Fixtures simulate cross-page events and are not live Realtime proof. Minor known presentation/performance limitations: own-save acknowledgment can briefly show a remote bill-edit hint; Vite JS chunk was 830KB / 248KB gzip. Route splitting is an optional later optimization, not the first task.

## New machine setup

```sh
git clone --branch feat/webapp-v1 https://github.com/nghiaxb/ComCuaNghia.git
cd ComCuaNghia
npm ci
cp .env.example .env.local
npm run dev
```

Use Node24. Leaving Vite env empty allows readonly sample preview. Browser tests start their own Vite server at5173; install Playwright Chromium once. Python tests require the dependencies used by `scripts/import-workbook.py`; follow its actual imports rather than assuming the previous machine environment.

For real backend, configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local`; Worker variables go into ignored `.dev.vars` using names in `.env.example`. Run `npx wrangler dev --port 8787` alongside Vite; Vite proxies `/api` to8787. Google OAuth must allow the actual local URL; do not silently modify OAuth configuration. Do not invent or copy secrets into docs.

Codex can run repo Playwright tests via terminal when Node/browser dependencies are installed. Interactive browser tools and Supabase/Cloudflare MCP/plugins depend on the new client's configuration; check capability and sign-in there. Local preview/testing can proceed without cloud management access. Configure/authenticate cloud tools only when needed. Existing deployed Worker secrets remain on Cloudflare.

## Next work, in order

1. Read docs/code, verify branch/worktree and run local quality/test baseline. Report genuine setup blockers; do not rebuild the app or add libraries.
2. Inspect desktop/mobile ordering, picker, cart, shared rows, bill/settings and OCR preview using fixtures. Reproduce a specific defect before fixing.
3. With two authorized real employee sessions, use agreed disposable staging data to check proxy save/cancel, realtime roster/totals, conflict and draft retention, lock/unlock and reconnect. Do not alter real orders for testing.
4. Validate actual menu image OCR → review → publication → proxy ordering → bill → lock/settlement, including menu rename/price/clear semantics. Real Chat notification testing needs user authorization for the target room/message.
5. Update evidence, fix verified failures, rerun affected tests, then full release checks before an authorized deployment. Preserve secrets/bindings and draft PR; do not merge main.

The previous user approvals completed the redesign/staging release. A new Codex session should start with assessment and local verification; future production deployment, destructive data tests/imports and messaging need the corresponding user task scope.
