# Full shadcn/ui + Tailwind UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Tái thiết kế toàn bộ giao diện đặt cơm bằng shadcn/ui + Tailwind, nhanh và dễ kiểm tra đơn trên desktop/mobile.

**Architecture:** Chuyển lớp trình bày theo thứ tự foundation → shell → màn hình. Component shadcn lưu trong repo, domain wrapper giữ contract hiện tại; controller autosave, refresh và server vẫn là nguồn xử lý nghiệp vụ. Bỏ CSS cũ khi toàn bộ consumers đã chuyển.

**Tech Stack:** React 19, Vite, TypeScript 6.0.3, Tailwind v4, shadcn/ui (Radix), Lucide, Playwright, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-04-ui-redesign-design.md` (user duyệt 2026-10-04).

## Global Constraints

- Sáu route: `/order`, `/menus`, `/summary`, `/finance`, `/audit`, `/settings`; giữ deep link date/member.
- Giữ Google rivercrane.vn, quyền hiện tại và server authoritative.
- Không bổ sung Redux, TanStack Query, thay schema/RLS, endpoint hay thuật toán chia tiền.
- Menu dạng list, không ảnh minh hoạ món ăn; tiếng Việt, VND, giờ Việt Nam.
- Sau 17h hôm trước vẫn sửa; chỉ khoá thủ công hoặc quyết toán chặn đặt.
- Autosave serial/requestId/version/retry/conflict/consent/navigation guard giữ nguyên.
- Realtime gom sự kiện 300ms, một request in-flight/trailing refresh, fallback poll 60s.
- OCR preview trước, explicit submit gửi ảnh; checkbox clear tuần mặc định tắt.
- Viewport QA: 1440px, 390px, 320px; thao tác chính mobile hit target ít nhất 44px.
- Deploy staging sau hoàn tất, giữ env/secret/compatibility flags; draft PR, không merge main, không gửi Chat thử thật.

## Review Focus

1. Tên người dài/trùng tên: picker không chọn nhầm ID, tên vẫn đọc được (Task 3).
2. Mobile keyboard/Sheet và thanh cố định: không che ghi chú hoặc Retry (Task 3).
3. Snapshot đến lúc đang sửa: giữ lý do đặt hộ, giỏ và form bill (Tasks 3/4).
4. Escape/đóng modal khi request đang chạy: không bỏ xác nhận hoặc mất focus (Tasks 1/5).
5. Dữ liệu lịch sử thiếu bill chi tiết: hiển thị Chưa có dữ liệu, không suy thành 0 (Task 6).

## File Map

- `src/components/ui/*`: mã component shadcn (Button, input, textarea, label, checkbox, switch, badge, card, table, tabs, separator, select, dialog, alert-dialog, sheet, popover, command, skeleton). Chỉ thêm khi có consumer.
- `src/lib/utils.ts`: `cn(...inputs: ClassValue[]): string` (clsx + tailwind-merge).
- `src/app/styles.css`: Tailwind imports/theme và CSS tối thiểu; bỏ rule legacy sau migration.
- `src/app/App.tsx`: session/data/mutation wiring hiện tại; render AppShell.
- `src/app/AppShell.tsx`: navigation/header/mobile menu; không tự fetch dữ liệu.
- `src/features/RecipientPicker.tsx`, `SaveStatus.tsx`, `OrderCart.tsx`: picker/status/cart presentation.
- Feature files hiện tại: chuyển UI, giữ public props/domain helpers.
- `components.json`, `vite.config.ts`, `tsconfig.json`, `package*.json`: build/aliases/registry/dependencies.
- `tests/e2e/redesign.spec.ts`: responsive/keyboard mới; existing suites giữ chứng minh nghiệp vụ.

### Task 1: Foundation và modal an toàn

**Files:** Config/build/package files; `src/lib/utils.ts`, `src/components/ui/*`, `src/app/styles.css`, `src/features/ConfirmDialog.tsx`; `tests/fixtures/ui.tsx`, `tests/e2e/ui.spec.ts`.
**Interfaces:** Giữ Button default export/native props và variant primary/secondary/danger/text qua wrapper nếu cần; thêm shadcn variants chuẩn ở component nội bộ. Giữ Dialog `{title:string, children:ReactNode, onClose:()=>void, busy:boolean}` và ConfirmDialog default title.

- [x] Thêm assertions ui.spec: Escape/close khi busy không đóng, autofocus/focus restoration, explicit submit và native disabled; test Button có consistent theme trên mobile.
- [x] Chạy `PLAYWRIGHT_BROWSERS_PATH=/tmp/com-playwright npx playwright test tests/e2e/ui.spec.ts`; xác nhận test mới thất bại vì thiếu UI mới, không vì lỗi fixture.
- [x] Kiểm tra registry/peer bằng CLI/npm metadata, chọn phiên bản tương thích; không dùng force/legacy-peer-deps. Cài Tailwind v4/plugin Vite, shadcn components và dependencies dùng thật, ghi components.json/alias `@/*` → `src/*`.
- [x] Implement cn/theme/token và Button/Dialog compatibility trên shadcn; busy chặn Escape/outside/close, preserve restore focus. CSS legacy tạm scoped để Preflight không làm hỏng màn hình chưa chuyển.
- [x] Chạy npm ci, lint/format:check/typecheck và ui.spec; kết quả exit 0.
- [x] Commit `feat: establish shadcn and Tailwind UI foundation`.

### Task 2: Shell, đăng nhập và điều hướng

**Files:** `src/app/App.tsx`, new `src/app/AppShell.tsx`, `tests/e2e/shell.spec.ts`, `tests/e2e/redesign.spec.ts`.
**Interfaces:** `AppShell({children:ReactNode, member:Snapshot['member']|undefined, session:boolean, preview:boolean, connected:boolean, onRefresh:()=>void, onLogout:()=>void}):ReactElement`; event callbacks do App wiring, không bỏ requestOrderNavigation.

- [x] Thêm test shell tại 320/390/1440px: mobile menu mở đủ route, keyboard/Escape restore trigger, employee không thấy menu quản trị; nhãn preview/loading/error vẫn rõ.
- [x] Chạy shell/redesign tests để thấy assertions mới thất bại ở shell cũ.
- [x] Implement sidebar/header/Sheet navigation, bỏ sidebar-note/decorative shell. Chuyển login/setup/preview/notice sang component mới, giữ OAuth callback và guard logout/link.
- [x] Chạy shell.spec và autosave.spec (Back/link/logout), lint/typecheck; exit 0.
- [x] Commit `feat: redesign application shell and sign-in`.

### Task 3: Đặt cơm, recipient và mobile cart

**Files:** `Orders.tsx`, `WeekPicker.tsx`, new `RecipientPicker.tsx`, `SaveStatus.tsx`, `OrderCart.tsx`; autosave/order-layout/features/redesign specs và fixtures hiện có.
**Interfaces:** Giữ Orders PageProps/loadRecipientOrder, WeekPicker props hiện tại. `RecipientPicker({value:string, recipients:ReadonlyArray<{id:string,display_name:string}>, disabled:boolean, onChange:(id:string)=>void}):ReactElement`. `SaveStatus({text:string, status:AutosaveState['status'], dirty:boolean, onRetry:()=>void, retryDisabled:boolean}):ReactElement`. OrderCart nhận `cart:CartItem[]`, `foods:Snapshot['foods']`, `orderedItems:Order['items']`, `blocked:boolean`, `onChange:(cart:CartItem[])=>void`; trạng thái/actions truyền bằng ReactNode để không tạo controller thứ hai.

- [x] Thêm test tìm hai người trùng tên ID khác nhau, tên dài; chọn bằng keyboard giữ đúng memberId/lý do. Không dựa email private để phân biệt.
- [x] Thêm test mobile mất ack: Retry visible ở thanh cố định không cần mở giỏ; Sheet nhập ghi chú/tăng giảm cập nhật cùng draft, không autosave hai lần. Assert hit target ≥44px và không tràn trang 320px.
- [x] Chạy tests mới, xác nhận RED với UI cũ.
- [x] Implement menu list, toolbar tuần/ngày, Command+Popover picker, cart sticky desktop và Sheet mobile. Guard đổi subject trước cập nhật picker value. Một instance controller và một nguồn cart; region duplicate chỉ render khi phù hợp viewport, không nhân đôi DOM ID/input action.
- [x] Giữ useOrderDraft/order-autosave semantics; kết nối SaveStatus với retry/manual submit đang có. Route realtime không reset lý do. Tab Đơn mọi người/Bill chỉ đổi presentation.
- [x] Chạy autosave/order-layout/features và unit order-autosave; bảo toàn dirty manual consent, uncertain retry identity, conflict, day lock, proxy reason, navigation.
- [x] Commit `feat: redesign ordering and mobile save feedback`.

### Task 4: Tổng quan đơn và bill

**Files:** `Summary.tsx`, `SharedOrderOverview.tsx`, `BillSummary.tsx`, `BillEditor.tsx`; shared-overview/shared-realtime/history/redesign specs.
**Interfaces:** Giữ PageProps, dayBill và BillSummary `{bill:BillPreview}`; không sửa bill allocation/domain shared/contracts.

- [x] Thêm test desktop/mobile: cùng roster/order/actor/share, tìm/lọc chưa đặt và deep link proxy; realtime không reset filter hay bill draft chưa gửi.
- [x] Chạy test mới để thấy RED ở mobile table/form cũ.
- [x] Implement stats gọn, table desktop + compact rows mobile cùng dữ liệu; giữ cancelled details, actor time Vietnam và email/audit restrictions. Chuyển BillSummary/BillEditor form mới; Label/Input/Select/Checkbox nhất quán; settlement modal guards/version hiện tại.
- [x] Chạy shared-overview/shared-realtime/history và integration bill tests; snapshot tạm tính/settled và allocation giữ nguyên.
- [x] Commit `feat: redesign shared orders and bill views`.

### Task 5: Menu/OCR và xác nhận

**Files:** `Menus.tsx`, `ImageUpload.tsx`, `ConfirmDialog.tsx`; menu-week/features/order-layout/redesign specs.
**Interfaces:** Giữ Menus PageProps, ImageUpload `{disabled:boolean,onImage:(file:File)=>Promise<void>}` và draft/publish payload/version.

- [x] Thêm test luồng mobile chọn ảnh→preview→OCR→soát→công bố; preview lỗi giữ ảnh và không gửi trước submit. Test busy không đóng dialog, checkbox clear tắt mặc định, sourceVersion vẫn đúng.
- [x] Chạy test mới và ghi RED UI cũ.
- [x] Implement ba bước trên một route, list sửa món/giá, week controls có khoảng ngày, published/drafts rõ, modal destructive thay window.confirm còn lại trong menu flow. Chuyển ImageUpload UI giữ paste/drop/objectURL cleanup.
- [x] Chạy menu-week/features/order-layout và integration menu reconciliation; không bỏ coverage rename/reprice/clear whole week/history/OCR busy.
- [x] Commit `feat: redesign menu review and publication`.

### Task 6: Công nợ, Nhật ký, Cài đặt/import

**Files:** `Finance.tsx`, `Audit.tsx`, `Settings.tsx`, `Import.tsx`, `common.tsx`; history/features/autosave/redesign specs.
**Interfaces:** Giữ PageProps, Field/Empty/Person/vnd consumers; Setting payload/QR/import parser/permissions không thay.

- [x] Thêm test missing historical amount hiển thị Chưa có dữ liệu, total debt global khác week scoped; employee không có controls/webhook/roles riêng tư; mobile labels/settings grouping và order mode vẫn lưu.
- [x] Chạy test mới thấy RED ở grouping/layout cũ.
- [x] Implement finance table/mobile detail và QR dialog, audit responsive rows, settings nhóm Cá nhân/Vận hành/Tích hợp Chat/Thành viên/Import theo quyền. Password webhook không tái hiển thị; chỉ thêm filter dữ liệu hiện có hỗ trợ.
- [x] Chạy history/features/autosave setting tests và integration/Python import tests; expected permissions/null semantics không đổi.
- [x] Commit `feat: redesign finance audit and settings`.

### Task 7: Bỏ legacy, QA và staging

**Files:** `src/app/styles.css`, tất cả remaining consumers/fixtures, `README.md`, `docs/staging.md`, redesign specs.
**Interfaces:** Tất cả route dùng một theme/component system; giữ production entry/asset routing `/api/*`.

- [x] Kiểm kê remaining legacy classes/inline styles; chỉ bỏ CSS sau khi không còn consumer. Chuyển preview và fixture đồng nhất UI production, không fixture-only patch để test qua.
- [x] QA trực quan 6 route + login ở 320/390/1440px với trạng thái loading/empty/error/long names; screenshot kiểm tra overflow, safe area, focus, contraste và hit target. Chỉ snapshot assertion ổn định, không coi screenshot tồn tại là QA đạt.
- [x] Chạy npm ci; lint/format:check/typecheck/check:secrets, npm test, test:integration, Python unittest, toàn bộ Playwright. Chạy configured build và Wrangler dry-run staging; tất cả exit 0, fix root cause khi fail.
- [x] Review độc lập diff đối chiếu spec và năm Review Focus; sửa critical/important rồi rerun tests ảnh hưởng. Không rollback nghiệp vụ để đổi UI.
- [x] Commit code/README/staging notes. Sync feat branch/draft PR qua GitHub, kiểm tra tree khớp; không merge main.
- [x] Deploy configured build qua Cloudflare connector, giữ bindings/secrets/global_fetch_strictly_public. Verify /order HTML 200, JS/CSS MIME+bytes đúng build, health200/snapshot401; ghi evidence thực tế, không claim live two-account realtime nếu chưa test.
- [x] Cập nhật trạng thái/checklist và báo user URL staging, tests thực chạy, hạn chế còn lại.

## Self-review và handoff

Spec coverage: foundation(Task1), shell/login(Task2), ordering/mobile guards(Task3),
shared/bill(Task4), menu/OCR(Task5), finance/audit/settings/import(Task6), accessibility/QA/release(Task7).
Review Focus được gắn từng test ở tasks tương ứng; public interfaces giữ contract hiện tại.
Khuyến nghị thực thi Native: một người chuyển tuần tự vì foundation/theme/wrapper là dependency
chung cho mọi màn hình; review độc lập toàn branch cuối. Native execution approved; tasks completed with final review regressions and staging/draft PR sync.
