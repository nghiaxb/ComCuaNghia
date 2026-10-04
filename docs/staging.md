# Staging — 2026-10-03 (Việt Nam)

- URL: https://com-cua-nghia-staging.nghiaapag.workers.dev
- Supabase project: `veptcxaahkghwwfwjzvn`, tên `com-cua-nghia-staging`, Singapore (`ap-southeast-1`). Organization `tang.nghia@rivercrane.vn's Org`.
- Supabase create-project cost endpoint báo 0 USD/tháng tại thời điểm tạo; không phải cam kết mọi mức sử dụng đều miễn phí.
- Cloudflare Worker riêng `com-cua-nghia-staging`; không sửa các Worker có sẵn.
- Source tree deployed: `78c274eae9a1510e4ea07638d4daf58405125500` (PR #1). Build Vite có biến public Supabase, Wrangler bundle/minify và direct asset upload qua API.

## Đã kiểm chứng

Migration `core` đã apply thành công. 12 bảng public có RLS; chưa có thành viên hoặc dữ liệu thật. Bucket `menu-images` private. `anon` không execute command; `authenticated` không claim outbox. Security Advisor có một WARN có chủ đích: public.delivery_status là SECURITY DEFINER, nhưng kiểm tra private.is_admin trước khi trả dữ liệu, chỉ trả trạng thái và lỗi rút gọn, không trả secret. [Giải thích cảnh báo](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

Health endpoint trả 200 `{ok:true,configured:true}`; `configured` chỉ xác nhận URL backend có giá trị, không xác nhận OAuth/OCR/Chat đã sẵn sàng. Không coi đây là kiểm tra tích hợp hoàn chỉnh.

## Cần cấu hình trước khi đăng nhập và chạy tích hợp

1. Trong Google Cloud tạo OAuth Web client. Authorized redirect URI: `https://veptcxaahkghwwfwjzvn.supabase.co/auth/v1/callback`. Cấu hình ứng dụng nội bộ rivercrane.vn nếu quản trị Workspace cho phép.
2. Supabase Authentication → Providers → Google: điền Client ID/Client Secret và bật Google. Không gửi secret trong chat. Tắt email/password và anonymous providers.
3. Supabase URL Configuration: Site URL `https://com-cua-nghia-staging.nghiaapag.workers.dev`, redirect allowlist `https://com-cua-nghia-staging.nghiaapag.workers.dev/order`.
4. Đăng nhập đúng tài khoản công ty rồi bootstrap admin đầu tiên bằng đúng email đã xác minh. Không đoán admin hoặc nâng quyền tất cả người đăng nhập.
5. Cloudflare Worker Secrets: `SUPABASE_SECRET_KEY`, `INTEGRATION_MASTER_KEY` (32 random bytes base64), `OCR_API_KEY`; cấu hình `OCR_WORKER_URL` theo Worker OCR gốc. Chưa đặt các secrets này. Chưa bật cron trước khi có secrets và phòng Chat staging được chỉ định.
6. Kiểm tra các gates trong deployment.md: hai phiên Realtime, upload ảnh riêng tư, OCR và retry Chat. Không nhập workbook thật trước khi mapping/tuần đã đối soát.

## Redeploy

Build với VITE_SUPABASE_URL và VITE_SUPABASE_PUBLISHABLE_KEY tương ứng các biến public trong `wrangler.staging.jsonc`, rồi `npx wrangler deploy --config wrangler.staging.jsonc`. Chỉ thêm cron mỗi phút sau khi các secrets và Google Chat được cấu hình. Không sử dụng config staging cho production.

## Sửa lỗi đăng nhập lần đầu

Log `FORBIDDEN: verified company Google identity required` làm OAuth trả `Database error saving new user`. Trigger cũ kiểm tra email_confirmed_at ngay lúc INSERT, trong khi GoTrue xác nhận email ở UPDATE tiếp theo. Migration defer_google_member_until_confirmed không tạo membership cho Auth user đang chờ xác minh; khi xác minh xong vẫn kiểm tra provider Google và domain công ty rồi mới cấp membership employee. Đã kiểm tra insert → confirm trực tiếp trên staging trong transaction rollback; không giữ tài khoản test. 21 integration và 22 unit tests qua. Cần người dùng thử lại OAuth trong trình duyệt để xác nhận toàn luồng.

## OCR và đặt hộ — 2026-10-03

Theo yêu cầu đã xác nhận: mọi nhân viên active được đặt/sửa/hủy hộ thành viên active. Màn hình Đặt cơm có chọn người nhận, tải đúng đơn hiện có và yêu cầu lý do khi thao tác hộ. Danh sách người nhận chỉ chia sẻ tên và mã; đơn cơm được tải riêng theo người nhận/ngày được chọn. RLS trực tiếp trên members/orders và công nợ/thanh toán giữ nguyên phạm vi trước đó. Audit hiển thị người thao tác và người nhận; Chat giữ lý do và trước/sau. Migration employee_proxy_orders thực hiện quyền mới. Mốc 17h vẫn là thông tin, không tự khóa; kỳ đã quyết toán vẫn cần mở lại theo quy trình tài chính.

OCR hỗ trợ chọn file, kéo thả và dán ảnh Ctrl+V/⌘V trong màn hình Quản lý menu. Mỗi lần một ảnh, PNG/JPEG/WebP dưới 10MB và 25MP, không kích hoạt OCR khi dán văn bản, không nhận thêm ảnh khi đang xử lý. Vẫn cần kiểm tra nháp và chọn thông báo Chat trước công bố.

22 integration, 22 unit và 6 Playwright tests đã qua, gồm employee proxy ở authenticated role, lý do/audit/cutoff/manual lock, các luồng nhập ảnh và chuyển người nhận. Review độc lập phát hiện và đã sửa input lý do bị vô hiệu hóa khi trống; browser regression đã qua. Không gọi OCR thật hoặc gửi Google Chat thử trong các test này.

Kiểm tra staging ngày 2026-10-03: migration đặt hộ đã áp dụng; xác minh bằng giao dịch rollback với quyền employee thật rằng danh sách tên, RPC đơn theo người/ngày, RLS hồ sơ/đơn và nhật ký sau mốc dự kiến hoạt động. Không để lại dữ liệu kiểm thử hoặc thông báo Google Chat. Bổ sung regression giữ chỉnh sửa chưa lưu khi refresh snapshot.

OCR investigation 2026-10-03: supplied menu image was read successfully by the existing OCR service (5 weekdays, 25 dishes). Recent failed app attempts recorded menu.upload but no menu.ocr; therefore image validation/storage completed. A transaction with the admin identity successfully saved a menu.ocr draft and was rolled back. The original failure cannot be conclusively attributed from the generic VALIDATION response; the captured 5-day response also passes the old parser. Confirmed compatibility gaps fixed: allow up to 7 source rows and exclude weekends before weekday food validation; understand Vietnamese weekday words. Provider transport/response failures are now RETRYABLE with safe stage-specific messages, parser failures retain precise safe messages, and logs contain only stage/code. No production OCR-provider code or credentials changed.
Image selection, drag/drop, and paste now display a local object-URL preview immediately and keep it on OCR errors; URLs are revoked on replacement/unmount. 27 unit, 22 integration and 7 browser tests pass; configured build and secret scan pass. End-to-end app OCR with the user's live browser session remains to be retried after deployment; do not claim the original failure conclusively resolved.

2026-10-03 OCR submit gate: chọn file/drop/paste chỉ giữ File và object URL trong trình duyệt, không gọi OCR hay upload Storage. Nút Đọc menu bằng OCR mới gọi callback gửi ảnh; bỏ ảnh xóa lựa chọn và vô hiệu hóa submit. Chặn gửi lặp/thay ảnh khi request đang chạy. Browser regression kiểm tra 0 callback trước submit, gửi đúng ảnh mới nhất, giữ preview khi lỗi và không thể submit ảnh đã bỏ. 27 unit + 8 browser tests, configured build và secret scan qua.

2026-10-03 provider root cause confirmed in deployed Cloudflare runtime: same-date protected temporary probe using redirect:error threw Invalid redirect value (only follow/manual implemented). Changing to manual reached HTTP404 Cloudflare1042. Adding global_fetch_strictly_public reached the OCR service (HTTP405 JSON for GET), proving cross-Worker routing works. Fixed OCR and existing Chat sender to manual (3xx stays failure); added flag to both Wrangler configs. Native workerd production-helper regression was red (503 instead of 200) before fix and green afterwards; redirect test asserts only one outbound request. 29 unit tests pass, typecheck/configured build/secret scan pass.
A full private-image/key request through the temporary probe was rejected by automatic review because the destination authorization was considered unestablished. Did not bypass or retry it. Verification used the safe no-image/no-key routing probe and native-runtime test with dummy OCR data; temporary Worker removed. Prior direct-provider supplied-image verification remains valid (5 days/25 dishes). User's staging browser OCR must be retried after deploying this concrete runtime fix.

2026-10-03 realtime snapshot batching: publishing a menu emits one Postgres change per day/food row; the previous listener fetched the entire snapshot for each event. All realtime, reconnect, focus and periodic notifications now share a fixed 300ms batching window. Manual/post-command refresh remains immediate and all snapshot reads share a serial queue with a trailing refresh for changes during an active read. Cleanup cancels queued timers and ignores stale results; logout disposes the controller immediately. Refresh errors retain the last displayed snapshot. Regression tests reproduce 60-event bursts, spaced events overlapping a slow read, awaited post-command refresh, disposal, the completion microtask race and recovery without automatic retry loops. 35 unit + 8 browser tests, configured build and secret scan pass; independent review has no blockers. No database/audit/Chat changes or live test notifications.

2026-10-03 menu management: added a visible published-menu section for the selected week with daily edit and delete actions, local row removal/discard and saved-draft deletion. Delete published menu retires active foods, preserves food IDs/order snapshots/financial history, requires a reason and confirmation, and records audit/outbox in the same idempotent command transaction. Staff-only, expected day/draft versions, manual locks and settled-week guards enforced. Publishing increments day version; editing carries source versions and saved/reopened edits retain provenance in each draft day's sourceVersion field. New menu/OCR drafts retain the existing publication flow. Chat withdrawal message identifies date and reason; real messages were not sent during tests. 36 unit, 24 integration and 12 browser tests pass, configured build/typecheck and secret scan pass; independent review has no remaining blockers. The staging migration is applied, and a rolled-back transaction with the verified admin confirmed food retirement, untouched order items/prices and audit creation; no test data or deliveries persist. UI/Worker deployed with all environment bindings and global_fetch_strictly_public preserved. Security Advisor findings were existing delivery_status admin-checked function and password protection for Google-only auth.

2026-10-03 week selection, history and menu reconciliation: Vietnamese weekend menu preparation defaults to next Monday. Menu, Orders, Summary and Finance now share a week selector with Monday–Friday date ranges and older weeks. Employees see their own order/financial history; administrators can inspect weekly aggregates. Past dates do not automatically lock orders; manual locks and settled weeks remain authoritative.

Publishing preserves food IDs when editing or matching exact OCR names. Renaming/removing a dish cancels only its ordered portions; repricing updates active orders to the new unit price while retaining quantity/notes. The unchecked clear-orders option requires confirmation and cancels all active orders throughout the target week, even for dates omitted from the new menu. Any locked day or settled week blocks clearing. Withdrawing a day menu requires explicit cancellation acknowledgement and cancels its active orders while preserving historical snapshots. Changes record actor/subject/before/after audit and queue configured Chat notifications; initial publication notification remains optional.

Verification: 42 unit, 27 integration and 24 browser tests passed; configured production build/typecheck, Worker dry-run and secret scan passed. Independent final review found no blockers. Staging migration `20261003084025_reconcile_menu_orders` applied. A rollback transaction using the verified administrator confirmed repricing, rename cancellation, stored history and two order-change audit events; no test rows/deliveries persisted and no live Chat messages were sent. Authenticated clients cannot execute the reconciliation helper. Security Advisor reported only the existing admin-gated delivery_status warning and Google-only auth password-protection warning. UI/Worker deployed with all environment bindings and global_fetch_strictly_public retained.

2026-10-03 static asset MIME incident: direct uploads incorrectly declared every multipart file as application/octet-stream. Live /order and other SPA routes returned HTML bytes with that MIME, causing browsers to download the page. Corrected the uploader to send text/html, text/javascript and text/css, with MIME included in the asset identity so cached incorrect metadata is not reused. Added scripts/upload-worker-assets.py and scripts/check-deployed-assets.py; the live header check reproduced the failure before redeployment. Future direct uploads must use this helper, then run the live MIME/attachment check (a 200/body match alone is insufficient). No app/database logic changed.

2026-10-03 compact ordering UI: removed the decorative order banner and food illustrations. Menu dishes now appear as compact rows with name, price, visible quantity controls and selected-state highlighting. The desktop cart remains alongside the list; mobile has a fixed total/view-order/save toolbar above navigation. Week navigation is compact on mobile. Both save controls share validation and payload logic, including proxy reason, lock/settlement/read-only checks and expected order version.

Published-menu deletion now opens a native modal immediately, displaying the target day, affected active-order count and mandatory reason. Initial focus goes to the reason; Escape/Back restore the trigger; processing disables cancellation, and success closes the modal. Existing audited menu.withdraw semantics unchanged.

Verification: new browser regression tests failed before implementation and now pass for modal focus/Escape, list portion editing and mobile save. Full 42 unit, 27 integration and 27 browser tests pass; configured build/typecheck, Worker dry-run and secret scan passed. Desktop/mobile screenshots were inspected, and independent review found no blockers. No database changes or live Chat test messages.

2026-10-03 shared overview and personal autosave: active employees now see day orders and a safe roster/last actor projection. Email, private audit, ledger and payments retain existing authorization. Shared daily bill configuration (fixed/percent discount, fee, covered/sponsors) is versioned and finance-managed. Live preview uses the same database allocation as settlement; settled bill/order/share snapshots remain immutable. Imported sheet periods explicitly show unknown daily bill details. Legacy settlement payloads are allowed only when no new bill configuration exists.

Autosave defaults on, with a personal manual-submit preference and 700ms debounce. The controller serializes saves, immediately adopts command acknowledgements, preserves uncertain request IDs/payloads for explicit retries, pauses on conflicting versions and protects pending drafts when changing day/member/week, navigating/back or logging out. Proxy actions use the actor's preference and require a reason. Locks and settled periods block writing; the previous-day cutoff remains informational. Chat events use the existing audited outbox, including public bill settings.

Predeployment verification: 50 unit, 34 database integration and 37 browser tests pass; configured production build/typecheck, secret scan and Wrangler dry-run pass. Two-page fixture runs actual React, autosave and refresh batching with simulated transport for order/cancel/menu/lock/reconnect events, including burst counts; this is not live Supabase Realtime proof. Two authorized real signed-in employee sessions are unavailable here, so live cross-account observation remains to be checked after deployment. No real Chat test messages are sent.

Independent review found and the single regression fix pass addressed: lost-response plus Realtime hiding the original retry, disposal on same-subject navigation, refreshed autosave preferences submitting manual drafts without consent, and own normalized notes causing false conflicts. New regressions were observed failing before fixes. Final local verification: 52 unit, 34 integration and 40 browser tests pass; configured build/typecheck, secret scan and Worker dry-run pass. Minor deferred: mobile fixed toolbar does not duplicate cart error/Retry; its View order action reaches those controls.

Staging applied/deployed: project `veptcxaahkghwwfwjzvn` was verified through Supabase as `com-cua-nghia-staging`; migrations `20261003112345_shared_overview_autosave` and `20261003112401_shared_daily_bills` applied and filenames aligned. An own verified-admin transaction exercised order save/cancel, automatic bill recomputation, settlement/reopen and employee-role read/write privileges, then rolled back. Retained test days/foods are zero; daily_bills is in supabase_realtime. Advisor findings remain the existing admin-gated delivery_status and Google-only password-protection warnings.

Cloudflare deployed UI `index-hbiIFlGD.js` / `index-Djq4o5c4.css` and updated Worker. All eight environment bindings, secrets and global_fetch_strictly_public were preserved. Exact deployed HTML/JS bytes and HTML/JS/CSS MIME checks pass, health returns configured 200, unauthenticated snapshot returns 401. Independent review blockers are resolved by regressions; live two real signed-in employee Realtime observation remains unverified. Source stays on feat/webapp-v1 with draft PR #1; main is not merged.

## Full shadcn/ui + Tailwind redesign — 2026-10-04

All six screens and the sign-in/shell use Tailwind v4 tokens and repo-owned shadcn components. Ordering uses a compact meal list, searchable recipient picker, a single mobile cart Sheet, inline save/retry status and shared-order/Bill tabs. Settings has personal/operation/Chat/members/import groups. OCR still requires explicit submit after local preview. Draft bill fields retain their original expected version across remote snapshots.

Final independent review found subject-changing confirmations, mobile clipped long text and prematurely closing destructive dialogs. A single RED→GREEN fix pass addresses all three plus mobile cart focus restoration. Confirmation actions await completion, prevent Escape while processing, retain reasons on failure and expire when the order/day/week subject changes. No review Minor remains deferred; a brief own-save bill acknowledgment can still show a remote-edit hint until acknowledgment completes.

Fresh verification: npm ci, zero-warning lint, format check, typecheck, secret scan, 52 unit, 34 database integration, 55 Playwright browser and 3 Python tests pass. Configured Vite build and staging Wrangler dry-run pass. Visual QA covers all six routes at 320/390/1440px, without horizontal overflow; representative screenshots were inspected. Real mobile soft-keyboard positioning and two actual signed-in employees observing Supabase Realtime remain unverified. No real Google Chat test messages were sent. Vite reports an 830KB JS chunk (248KB gzip); route splitting is a possible later performance improvement.

Implementation rulings: official shadcn registry sources were fetched manually after CLI proxy failure; wrappers are ActionButton/Modal to avoid case-only TypeScript filename collisions; one local cartContent/controller supplies desktop or mobile rendering; legacy CSS was replaced with Tailwind tokens/@apply layouts because unlayered rules overrode utilities. No Redux/query-cache/schema migration.

Cloudflare staging release: `index-DhCyfFi2.js` / `index-BCfLVIdQ.css`, Worker updated with SPA asset routing and `/api/*` Worker-first. Deployment settings retain all eight binding names/types and `global_fetch_strictly_public`. Source remains feat/webapp-v1 and draft PR #1; main is not merged.

## Tiếp quản local Windows — 2026-10-04 (không deploy)

Checkout bắt đầu ở `feat/webapp-v1`, commit `844cde7`, worktree sạch. Đã đọc AGENTS.md,
handoff, README, mục staging mới nhất và spec/plan redesign 2026-10-04, shared overview/autosave
2026-10-03; tiếp tục code hiện tại. Thư mục `.codex/skills/ui-ux-pro-max` xuất hiện trong
phiên được giữ nguyên, không stage. Không commit/push, sửa PR, merge main hoặc ghi cloud.
Thông tin staging ở mục trước là bằng chứng lịch sử, chưa được kiểm chứng lại từ xa trong phiên này.

Môi trường: Node `24.21.0`, npm `11.19.0`, Python `3.14.7`. `python3` trên máy này trỏ
vào shortcut Microsoft Store; cùng bộ unittest được chạy bằng `python`. `npm ci`, Vitest,
Playwright, Vite và Wrangler gặp lỗi sandbox `spawn EPERM`/cache permission; chạy lại ngoài
sandbox với quyền được cấp đã thành công. Chromium Playwright đã được cài. Không có
`.env.local`/`.dev.vars`; preview và browser fixtures dùng dữ liệu local.

Lỗi đã tái hiện và sửa:

- Git `core.autocrlf=true` khiến format check báo 112 file CRLF. Thêm `.gitattributes`
  với `text=auto eol=lf`, chuẩn hoá các file được Prettier kiểm tra; không đổi nội dung
  nghiệp vụ. Các file chỉ đổi metadata checkout đã được làm mới index; staged diff rỗng.
- Nút preview ở màn hình kết nối hệ thống vượt thẻ và làm trang rộng 321px khi viewport
  320px. Cho chữ xuống dòng trong chiều rộng thẻ, giữ vùng chạm tối thiểu 44px.
- Tab Cài đặt xuống hai dòng ở 320/390px nhưng chiều cao mặc định của tab ngang ghi đè
  `h-auto`, làm hàng dưới chồng lên nội dung. Override đúng modifier ở consumer Cài đặt.
  Regression kiểm tra tab nằm trong khung, nội dung nằm phía dưới và từng tab cao ít nhất 44px.

Cả hai UI regression đều thất bại đúng lỗi trước sửa và qua sau sửa. Shell kiểm tra cả
sáu route tại 320/390/1440px; đã xem ảnh render đại diện desktop/mobile và ảnh sau sửa.
QA bổ sung kiểm tra chọn người bằng bàn phím, ghi chú giỏ mobile và focus khi Escape,
giữ nháp bill khi có cập nhật mô phỏng, preview ảnh không gửi trước submit và giữ ảnh
khi OCR fixture trả lỗi. 35 ảnh QA local, cùng ảnh Cài đặt được chụp lại sau sửa, nằm
trong `.superpowers/local-qa/` (ignored, không phải artifact cloud); kiểm tra không tràn
ngang và không có page error đã qua.

Kết quả thực chạy trong phiên: npm ci; lint 0 cảnh báo; format check; typecheck;
secret scan; 52 unit, 34 PGlite integration, 3 Python và 56 Playwright tests qua.
Sau sửa UI cuối đã chạy lại lint/format/typecheck, toàn bộ Playwright, build với hai biến
public từ `wrangler.staging.jsonc` và `npx wrangler deploy --config wrangler.staging.jsonc
--dry-run --minify`; exit 0. Build local: JS 830.19kB / 248.42kB gzip, vẫn có cảnh báo
chunk lớn. Dry-run chỉ đóng gói local, không xác minh secrets/bindings đang triển khai.
Review read-only độc lập cuối không phát hiện Critical/Important/Minor trong diff này;
kết luận đủ điều kiện bàn giao local, không xác nhận QA live hoặc quyền merge/deploy.

Còn cần người dùng hỗ trợ kiểm chứng ngoài fixture:

- Hai phiên Google công ty đã xác minh, hai thành viên active, với tuần/ngày/người test
  staging được thống nhất và dữ liệu dùng riêng. Theo dõi đặt/sửa/huỷ/đặt hộ, roster/bill,
  conflict/giữ nháp và reconnect. Fixtures hai trang không chứng minh live Supabase Realtime.
- Thiết bị iOS Safari/Android Chrome thực để kiểm tra bàn phím mềm, safe area, ô lý do,
  ghi chú và thao tác lưu/Retry trong Sheet.
- Ảnh menu được phép gửi OCR, tuần đích và người có quyền soát/công bố. Kiểm thử Chat
  cần chỉ định phòng thử/nội dung được phép; các mutation có outbox phải được phối hợp
  để tránh gửi vào phòng thật ngoài ý muốn. Cấu hình credential qua môi trường, không gửi
  secret trong chat. Phiên này chưa gọi OCR thật hoặc gửi Google Chat.

## Commit, push và deploy staging — 2026-10-04

Người dùng yêu cầu commit/push toàn bộ thay đổi local và deploy nếu chưa deploy,
sau đó đánh giá UI/UX bằng `ui-ux-pro-max`. Đã tiếp tục `feat/webapp-v1`, giữ PR #1
draft, không merge main. Mục local Windows phía trên là lịch sử trước yêu cầu này.

Commit ứng dụng `ec813a13138ac9b3a36f3b4bf1b3790fb0a8f74f` đã push lên origin:
hai sửa lỗi UI, regression ở 320/390/1440px, `.gitattributes` và ghi nhận baseline.
Chạy lại lint, format, typecheck, secret scan; 52 unit, 34 integration, 3 Python,
56 Playwright đều đạt. Dùng `python` trên Windows vì `python3` trỏ shim Store.
Build với hai biến Vite public lấy từ cấu hình staging và Wrangler dry-run đạt.

Wrangler CLI chưa đăng nhập; deployment dùng connector Cloudflare đã xác thực và
helper `scripts/upload-worker-assets.py`, giữ MIME của assets. Worker staging
`com-cua-nghia-staging` nhận phiên bản `b3dd8e1f-d188-41c6-9ffe-6f8de7f2d1c0`
tại `2026-10-04T07:34:20.858023Z`; deployment
`ea5ce2c5-94c0-404d-8225-753f59e2ba8d` phục vụ 100% phiên bản này.

Đối chiếu trước/sau: giữ đủ tám binding names/types, mọi plain-text value và
secret bindings được kế thừa; giữ `global_fetch_strictly_public`, observability,
SPA fallback và `/api/*` Worker-first. Không thay đổi schema hoặc gửi Chat thử.

Xác minh HTTP sau deploy bằng GET chưa đăng nhập:

| Đường dẫn                    | Status | MIME               | Bằng chứng                                  |
| ---------------------------- | ------ | ------------------ | ------------------------------------------- |
| `/order`                     | 200    | `text/html`        | 404 bytes, khớp chính xác `dist/index.html` |
| `/assets/index-By-mODHF.js`  | 200    | `text/javascript`  | 830.190 bytes, khớp chính xác local         |
| `/assets/index-CaBlsdPb.css` | 200    | `text/css`         | 72.079 bytes, khớp chính xác local          |
| `/api/health`                | 200    | `application/json` | `ok=true`, `configured=true`                |
| `/api/snapshot`              | 401    | `application/json` | Chưa đăng nhập bị từ chối                   |

Client Python mặc định ban đầu nhận 403; curl và Python với browser User-Agent
nhận đúng các kết quả trên. Chromium mở trang login staging ở 390px thành công,
không có page error; không đăng nhập hay sửa dữ liệu thật.

Đã chụp lại 35 trạng thái local, không tràn ngang/page error; báo cáo và số đo trong
[đánh giá UI/UX ngày 2026-10-04](ui-ux-review-2026-10-04.md). Đề xuất cải thiện tiếp,
chưa triển khai thêm thay đổi hành vi. Kiểm chứng hai tài khoản Realtime, bàn phím
mobile và OCR/Chat thật vẫn cần người dùng hỗ trợ theo giới hạn ở trên.

## Styling được duyệt, commit/push và staging — 2026-10-04

Người dùng duyệt các chỉnh styling sau đánh giá bổ sung. Commit ứng dụng
`cff86ee145cbe2e4e3f3fea39fbc442e9a47fec7` đã push `feat/webapp-v1`: spacing/card
nhất quán, thực đơn desktop cao theo nội dung, quantity outline, roster mobile gọn,
tổng tiền nổi bật/tabular numerals và lưới tab Cài đặt. Giữ các handler, quyền,
versions, nháp và schema. PR #1 vẫn draft, không merge main.

`npm ci` trên Node 24 đạt; lint, format, typecheck, secret scan, 52 unit,
34 integration, 3 Python, cài Chromium, 57 Playwright, configured build và staging
Wrangler dry-run đều đạt. Có thêm regression RED→GREEN cho share có trong snapshot
khi recipient chưa có đơn; fixture chỉ kiểm chứng hiển thị, không allocator thật.
Review độc lập cuối không còn Critical/Important/Minor.

Visual QA mới: 35 trạng thái local ở 320/390/1440px không tràn ngang/page error;
recapture Cài đặt và kiểm tra thêm tên/ghi chú dài, lịch sử hủy, bill dirty giữ nháp,
share và điều hướng tab bằng bàn phím. Số đo trước/sau có trong
[báo cáo UI/UX](ui-ux-review-2026-10-04.md#styling-đã-duyệt-và-triển-khai--2026-10-04).

Deploy qua connector Cloudflare và helper MIME-preserving hiện có: version
`a9efa02d-fbc9-4c72-9258-7de727603fd1`, deployment
`d88a67ec-bcc4-4d4c-8f97-7c674e5d8eac`, 100% tại `2026-10-04T07:57:18.108432Z`.
Giữ tám bindings names/types, plain values, secret inheritance, observability,
`global_fetch_strictly_public`, SPA fallback và `/api/*` Worker-first.

Sau deploy, `/order` HTML 200 (404 bytes), JS `index-DdA-KL6t.js` 200
`text/javascript` (830.498 bytes) và CSS `index-CTWdhfZ3.css` 200 `text/css`
(74.437 bytes) khớp chính xác local. Health 200/configured=true, snapshot không
đăng nhập 401. JS gzip khoảng 248,52KB; cảnh báo chunk >500KB vẫn còn.
Chromium kiểm tra Đặt cơm/Cài đặt qua preview staging tại 320/390/1440px đạt,
không tràn ngang/page error. Chọn tuần có dữ liệu mẫu khi kiểm tra vào cuối tuần;
không đăng nhập, ghi dữ liệu thật hoặc coi preview là bằng chứng backend/Realtime.

`npm ci`/`npm audit` còn báo hai high trong toolchain `@playwright/test`/`playwright`
1.51.1, cùng advisory GHSA-7mvr-c777-76hp về tải browser. Lockfile/dependencies
không đổi trong đợt styling; cần xử lý nâng công cụ test trong phạm vi riêng.
Realtime hai tài khoản thật, bàn phím thiết bị thật và OCR/Chat thật vẫn chưa kiểm chứng.
Không ghi dữ liệu thật, gọi OCR thật hoặc gửi Google Chat trong đợt này.

## Thu gọn màn hình đặt cơm và cài đặt cách lưu — 2026-10-04

Người dùng yêu cầu sửa khoảng trống bộ lọc tuần, chỉ giữ cách lưu đơn trong Cài đặt
cá nhân và giảm cuộn trên màn hình đặt cơm. Commit ứng dụng
`95fa37e649cabcc6b45b20a522c94bb47f186d29` đã push `feat/webapp-v1`; PR #1 vẫn
open/draft, không merge main.

Gom select tuần và nút trước/hiện tại/kế tiếp thành một cụm, bỏ dòng ngày tuần lặp
ở giao diện nhưng giữ thông báo cho screen reader. Người nhận nằm cùng toolbar
trên desktop; lý do đặt hộ chỉ xuất hiện khi chọn đồng nghiệp. Thu gọn tiêu đề,
danh sách món và giỏ; mobile giữ năm ngày trên một hàng và thanh thao tác cố định.
Không còn selector cách lưu trong giỏ. Cài đặt cá nhân vẫn lưu lựa chọn của user,
áp dụng cả khi đặt hộ. Không sửa controller autosave, retry/requestId, expected
version, consent khi đổi chế độ từ phiên khác hoặc dirty guards.

Kiểm tra bổ sung tái hiện và sửa ô ngày tuần trống bị bó vào một cột mobile,
và nút refresh của header đăng nhập tràn ngang ở 320px. Năm regression mới đã chạy
RED trước sửa và GREEN sau sửa; fixture desktop có AppShell, năm ngày/năm món,
hai món trong giỏ. Bài autosave cũ đổi từ selector đã bỏ sang sự kiện đổi cài đặt
từ phiên khác, vẫn kiểm tra consent và số lần ghi.

`npm ci` trên Node 24, cài Chromium, lint, format, typecheck, secret scan,
52 unit, 34 integration, 3 Python, 62 Playwright, configured build và staging
Wrangler dry-run đều đạt. Dùng `python` trên Windows; dependencies/lockfile không
đổi. Hai cảnh báo high của Playwright và cảnh báo JS chunk lớn đã ghi ở mục trước
vẫn còn. Review độc lập cuối không còn lỗi chặn bàn giao.

Visual QA: 35 trạng thái local ở 320/390/1440px không tràn ngang/page error,
kiểm tra picker bằng bàn phím, trả focus và giữ nháp giỏ, nháp bill, OCR preview
và lỗi bằng fixture. Kiểm tra riêng AppShell có phiên đăng nhập với năm món và
hai món cũ trong giỏ: tại 1440×800, danh sách món kết thúc y=653px và nút lưu
kết thúc y=746,25px, đều trong khung nhìn đầu. Tên món dài vẫn xuống dòng.
Giỏ nhiều món, nội dung đặt hộ và phần tổng hợp bên dưới vẫn có thể cần cuộn;
không ẩn dữ liệu để ép toàn trang vào một màn hình. Ảnh và số đo local ở ignored
`.superpowers/order-compact-qa/` và `.superpowers/compact-qa/`.

Deploy staging qua connector Cloudflare và helper assets hiện có: version
`9e2e2768-52d3-4176-b1f4-0475e6e31e71`, deployment
`b2927fde-788b-4225-9d4e-3adc8d6ecb13`, 100% tại
`2026-10-04T08:31:53.126095Z`. Giữ tám bindings names/types, plain values,
secret inheritance, observability, `global_fetch_strictly_public`, SPA fallback
và `/api/*` Worker-first.

Sau deploy: `/order` trả HTML 200 (404 bytes), JS `index-DXFlprv7.js` trả 200
`text/javascript` (830.350 bytes), CSS `index-B3adGQpy.css` trả 200 `text/css`
(76.857 bytes); cả ba khớp chính xác local. Health 200/ok=true/configured=true;
snapshot chưa đăng nhập 401. Chromium kiểm tra Đặt cơm/Cài đặt qua preview staging
tại 320/390/1440px đạt, không tràn ngang/page error.

Fixture và preview không chứng minh live Realtime. Hai tài khoản công ty thật,
bàn phím mobile và OCR/Chat thật vẫn cần phối hợp như handoff. Không đăng nhập,
ghi dữ liệu thật, gọi OCR thật hay gửi Chat thử trong đợt này.
