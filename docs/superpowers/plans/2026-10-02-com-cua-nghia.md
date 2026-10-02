# Cơm Của Nghĩa v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây webapp nội bộ thay Sheet, đủ sáu màn hình, đặt cơm realtime, OCR, Google Chat và công nợ.
**Architecture:** React/Vite trên Cloudflare Workers; Supabase là nguồn chuẩn cho Auth, Postgres, Storage và Realtime. Mọi ghi nghiệp vụ phải có quyền hợp lệ và transaction ghi audit/outbox; Worker xử lý OCR, lịch nhắc và giao nhận Chat.
**Tech Stack:** TypeScript, React, Vite, Supabase, Cloudflare Workers, Vitest, Playwright, PostgreSQL integration tests.
**Spec:** [2026-10-02-com-cua-nghia-design.md](../specs/2026-10-02-com-cua-nghia-design.md)
**Approval:** Người dùng duyệt đặc tả trong cuộc trao đổi ngày 2026-10-02: “cứ theo đề xuất”. Kế hoạch này chờ review và chọn phương thức thực thi.
**Execution recommendation:** Native, triển khai tuần tự theo giao diện chung dưới đây, sau đó review độc lập toàn nhánh. Không triển khai production khi mới chỉ có bản demo/mock.

## Global Constraints

- Sáu màn hình: Đặt cơm, Quản lý menu, Tổng hợp đơn, Công nợ, Nhật ký, Cài đặt.
- Giới hạn đăng nhập bằng email thuộc rivercrane.vn.
- Mốc dự kiến là 17:00 ngày trước ngày ăn, múi giờ Asia/Ho_Chi_Minh.
- Qua 17:00 vẫn cho đặt, sửa và hủy. Thời gian không tự khóa đơn.
- Chỉ khóa khi người có quyền bấm khóa ngày đặt cơm, tương đương khóa sheet.
- Cơm thứ Hai không có nhắc tự động theo giờ.
- Mặc định nhắc lúc 16:45 hôm trước cho ngày ăn thứ Ba đến thứ Sáu; sửa được trong Cài đặt.
- Checkbox thông báo menu không tắt nhật ký hoặc thông báo thay đổi đơn.
- Tiền lưu số nguyên VND.
- Không đưa dữ liệu cá nhân, tài khoản nhận tiền, ảnh nguồn hoặc khóa tích hợp của file đính kèm vào repo công khai.
- Không tự chạy import vào dữ liệu production, gửi thử Chat thật hoặc thay webhook cũ trong lúc phát triển.
- Cấu hình thật qua kênh secret của dịch vụ; frontend chỉ có URL và publishable key.
- Dependency được chọn theo tài liệu hiện hành khi thực thi, pin phiên bản chính xác và commit lockfile. Không dùng “latest” trong manifest đã commit.
- Đọc AGENTS.md và kiểm tra repo trước khi tạo isolated branch/worktree; giữ nguyên thay đổi của người dùng.
- Mọi task bên dưới theo red → green → commit; chỉ commit file thuộc task, không git add toàn bộ thư mục chứa dữ liệu đính kèm.

## Review Focus

1. Hai thiết bị sửa cùng đơn, hoặc sửa lúc điều phối khóa ngày: không mất cập nhật, không lọt ghi sau khóa; Task 3.
2. JWT chưa hết hạn sau khi thành viên bị vô hiệu, và socket realtime còn mở: không tiếp tục nhận dữ liệu riêng; Task 2 và 4.
3. Scheduler chạy lại hoặc Chat đã nhận nhưng timeout: không mất sự kiện, retry có định danh và có thể nhận biết trùng; Task 6.
4. Tiền không chia hết, người được bao không có người trả thay, giá menu đổi sau đặt: không sai tổng hoặc hồi tố giá; Task 3, 5 và 7.
5. Ảnh OCR có lời chỉ dẫn độc hại, món trùng/ngày thiếu và file nhập có tên trùng: chỉ nhận dữ liệu đã validate, người quản trị duyệt trước công bố/import; Task 5 và 9.

---

## Cấu trúc và hợp đồng chung

Một repository, một frontend và một Worker; chưa tách microservice:
- src/app/: router, shell, điều hướng sáu màn hình và styles dùng chung.
- src/features/auth/, orders/, menus/, summary/, finance/, audit/, settings/: UI và truy vấn theo nghiệp vụ.
- src/lib/supabase.ts, src/lib/api.ts: client và lỗi chuẩn.
- shared/contracts.ts: kiểu dữ liệu runtime-validated giữa UI và Worker.
- worker/index.ts, worker/auth.ts, worker/routes/: routing và xác thực API.
- worker/integrations/, worker/jobs/: OCR, Chat, scheduler/outbox.
- supabase/schemas/: SQL nguồn có thứ tự; supabase/migrations/: migration do CLI sinh.
- tests/unit/, tests/integration/, tests/e2e/: kiểm thử; tests/fixtures/: chỉ dữ liệu tổng hợp.
- scripts/: công cụ test integration, kiểm tra secret và import cục bộ.
- docs/operations/: cấu hình, vận hành, import và rollback.

Kiểu chung trong shared/contracts.ts:
- ID = string UUID; LocalDate = string YYYY-MM-DD; Instant = string ISO UTC; Money = integer VND trong miền Number.isSafeInteger.
- Role = employee | coordinator | admin; Member = {id, authUserId: ID|null, email: string|null, displayName, role, active, canManageFinance}.
- Command<T> = {requestId: ID, expectedVersion: number, payload: T}.
- ApiError = {code: UNAUTHENTICATED|FORBIDDEN|LOCKED|CONFLICT|VALIDATION|RETRYABLE, message: string, requestId: ID}; HTTP lần lượt 401/403/423/409/422/503.
- Day = {id, date: LocalDate, locked: boolean, version: number, publishedMenuVersionId: ID|null}.
- OrderInput = {dayId, memberId, items: Array<{menuItemId: ID, quantity: number, note: string}>}; không nhận giá do browser quyết định.
- Order = {id, dayId, memberId, status: active|cancelled, version, items: Array<{id, menuItemId, quantity, note, unitPrice: Money}>, updatedAt: Instant}.
- MenuDraft = {id, weekStart: LocalDate, version, days: Array<{date: LocalDate, foods: Array<{name: string, unitPrice: Money|null}>}>}.
- Event = {id, actorId: ID|null, subjectMemberId: ID|null, kind, entityId, before, after, occurredAt: Instant, requestId, afterCutoff: boolean}.
- Settings = {version, timezone, cutoffTime, reminderTime, holidays: LocalDate[], collectorId: ID|null, bank: {bankCode, accountNumber, accountName}|null, qrTemplate, defaultPrice: Money, chatEnabledByKind: Record<string,boolean>}.
- Delivery = {id, eventId, destinationId, status: pending|sending|sent|failed, attempts, nextAttemptAt, leaseUntil, lastErrorCode: string|null}; API không trả webhook.
- WeekStatement = {weekStart, version, state: open|settled, memberLines: Array<{memberId, mealCharges, adjustments, confirmedPayments, balance: Money}>}.
- Reconciliation = {batchId, errors: string[], unresolvedMembers: string[], perDayTotals: Record<LocalDate,Money>, openingBalances: Record<ID,Money>, canApply: boolean}.

Giới hạn đề xuất triển khai: tên món 200 ký tự, ghi chú 500 ký tự, quantity 1–100; upload ảnh PNG/JPEG/WebP tối đa 10 MiB và 25 megapixel. Hiển thị lỗi cụ thể khi vượt, không cắt âm thầm.
API tài chính kiểm tra cả kiểu số và giới hạn safe integer trước khi tính toán. Tính trung gian phân bổ bằng bigint rồi chuyển về Money đã kiểm tra.

## Chuẩn chạy kiểm thử

Task 1 tạo scripts npm: typecheck, test (vitest run), test:integration (tsx scripts/test-integration.ts), test:e2e (playwright test), build, check:secrets.
Integration runner chỉ kết nối Supabase local/test URL trong allowlist và từ chối project production. Tests dùng tài khoản/seed tổng hợp, có thể reset local; không đọc fixture thật từ upload.
Mỗi task chỉnh SQL tạo trên database local, chạy advisors, rồi dùng quy trình CLI trong skill Supabase để sinh migration. Không tự đặt timestamp hoặc đánh dấu migration applied bằng tay.
Các bước gọi CLI được xác minh bằng --help lúc thực thi. Nếu local runtime không hỗ trợ Docker/Postgres, báo rõ gate integration chưa chạy; chỉ dùng project test khi đã được xác định, không thay production làm fallback.


### Task 1: Nền ứng dụng và sáu route

**Files:** Create/modify package.json, package-lock.json, tsconfig.json, vite.config.ts, vitest.config.ts, playwright.config.ts, wrangler.jsonc, .gitignore, .env.example, src/app/App.tsx, src/app/styles.css, src/main.tsx, shared/contracts.ts, scripts/test-integration.ts, scripts/check-secrets.ts; test: tests/unit/contracts.test.ts, tests/e2e/shell.spec.ts.

**Interfaces:** Tạo contracts ở trên và routes /order, /menus, /summary, /finance, /audit, /settings. Shell nhận Member|null; chưa cấu hình backend thì hiển thị hướng dẫn cấu hình, không giả đăng nhập thành công.

- [ ] **Step 1 — Viết kiểm thử thất bại:** expect(validateOrderInput({dayId,memberId,items:[{menuItemId,quantity:0,note:''}]}).success).toBe(false); kiểm tra quantity 1 hợp lệ, 101 không hợp lệ. E2E viewport 390x844 và 1440x900: sáu nhãn hiện, không tràn ngang.
- [ ] **Step 2 — Chạy và xác nhận FAIL do thiếu hành vi:** `npm run test -- tests/unit/contracts.test.ts && npm run test:e2e -- tests/e2e/shell.spec.ts`. Lỗi môi trường/dependency không được tính là red test hợp lệ.
- [ ] **Step 3 — Triển khai tối thiểu:** Tạo workspace, contracts và validation bằng Zod, router React Router và styles responsive. npm scripts chạy test theo chuẩn trên. Tách file cấu hình khỏi secrets, ignore .env*, upload/, private-imports/ nhưng giữ .env.example. Worker phục vụ static assets và /api/health, endpoint không lộ cấu hình.
- [ ] **Step 4 — Chạy lại:** `npm run test -- tests/unit/contracts.test.ts && npm run test:e2e -- tests/e2e/shell.spec.ts`. Expected: toàn bộ tests chỉ định PASS, không skip gate bắt buộc. Với task SQL, chạy advisors và sinh/kiểm tra migration trước commit.
- [ ] **Step 5 — Commit:** stage đúng các file task, `git commit -m "chore: bootstrap typed app shell and test harness"`.

### Task 2: Auth, membership và ranh giới quyền

**Files:** Create/modify src/lib/supabase.ts, src/features/auth/LoginPage.tsx, src/features/auth/useMember.ts, worker/auth.ts, supabase/config.toml, supabase/schemas/01_identity.sql, supabase/schemas/02_policies.sql, tests/integration/auth.test.ts, tests/e2e/login.spec.ts.

**Interfaces:** requireMember(request: Request, env: Env): Promise<Member>; useMember(): {member: Member|null, loading: boolean, error: ApiError|null}; role và active đọc từ membership được bảo vệ. Env định nghĩa ở worker/env.ts, không có secret trong shared/contracts.ts.

- [ ] **Step 1 — Viết kiểm thử thất bại:** expect(await readAs('other-domain')).toHaveStatus(403); expect(await updateOwnRoleAsEmployee()).toHaveStatus(403); disableMember(user); expect(await readWithExistingJwt(user)).toHaveStatus(403). Auth hook chặn email chưa xác thực hoặc domain giả rivercrane.vn.evil.test. Đăng nhập ghi audit một lần cho session khi được chấp nhận.
- [ ] **Step 2 — Chạy và xác nhận FAIL do thiếu hành vi:** `npm run test:integration -- tests/integration/auth.test.ts && npm run test:e2e -- tests/e2e/login.spec.ts`. Lỗi môi trường/dependency không được tính là red test hợp lệ.
- [ ] **Step 3 — Triển khai tối thiểu:** Kiểm tra changelog Supabase và docs Google OAuth/hooks/RLS trước code. Chỉ bật Google auth, bỏ anonymous/password signup. Hook và quyền dữ liệu kiểm tra domain đã xác thực cùng active membership; không dùng user_metadata. Cấp employee cho tài khoản hợp lệ, admin bootstrap bằng công cụ vận hành riêng. Bật RLS/grants tối thiểu, các view security_invoker. Giao diện login không xin scope Drive. Revoke session khi disable và giữ membership check để token cũ cũng bị chặn.
- [ ] **Step 4 — Chạy lại:** `npm run test:integration -- tests/integration/auth.test.ts && npm run test:e2e -- tests/e2e/login.spec.ts`. Expected: toàn bộ tests chỉ định PASS, không skip gate bắt buộc. Với task SQL, chạy advisors và sinh/kiểm tra migration trước commit.
- [ ] **Step 5 — Commit:** stage đúng các file task, `git commit -m "feat: enforce company login and membership authorization"`.

### Task 3: Lệnh đặt cơm, khóa ngày và audit nguyên tử

**Files:** Create/modify supabase/schemas/03_orders.sql, supabase/schemas/04_commands.sql, supabase/schemas/05_audit_outbox.sql, worker/routes/orders.ts, worker/routes/days.ts, worker/routes/audit.ts, tests/integration/orders.test.ts, tests/integration/order-lock-race.test.ts.

**Interfaces:** saveOrder(command: Command<OrderInput>): Promise<Order>; cancelOrder(command: Command<{orderId: ID}>): Promise<Order>; setDayLock(command: Command<{dayId: ID, locked: boolean, reason: string}>): Promise<Day>; listAudit(cursor: string|null): Promise<{items: Event[], nextCursor: string|null}>. Actor do server lấy từ JWT.

- [ ] **Step 1 — Viết kiểm thử thất bại:** expect(await saveAt('2026-10-05T10:01:00Z',openDay)).toSucceed(); expect(await saveAsAdmin(lockedDay)).toHaveCode('LOCKED'); replay(requestId) giữ một version, một audit và một outbox. Cùng requestId khác payload => CONFLICT. Race save/lock: chỉ một thứ tự hợp lệ, không commit save sau lock. expectedVersion cũ => CONFLICT.
- [ ] **Step 2 — Chạy và xác nhận FAIL do thiếu hành vi:** `npm run test:integration -- tests/integration/orders.test.ts tests/integration/order-lock-race.test.ts`. Lỗi môi trường/dependency không được tính là red test hợp lệ.
- [ ] **Step 3 — Triển khai tối thiểu:** Tạo FK/unique cho member+day, date+vendor, version và request actor+id. Transaction khóa day trước order, cùng thứ tự ở lock/save/cancel. Server đọc menu/giá; giữ giá snapshot với dòng không thay món, thêm dòng mới dùng giá hiện hành. Cấm đổi chủ đơn qua payload, đặt hộ cần coordinator/admin và lý do. Audit append-only; outbox cùng transaction, bí mật bị loại khỏi event. Publish tối thiểu các bảng realtime cần thiết. Schema menu stub đủ cho task 3, task 5 mở rộng phiên bản.
- [ ] **Step 4 — Chạy lại:** `npm run test:integration -- tests/integration/orders.test.ts tests/integration/order-lock-race.test.ts`. Expected: toàn bộ tests chỉ định PASS, không skip gate bắt buộc. Với task SQL, chạy advisors và sinh/kiểm tra migration trước commit.
- [ ] **Step 5 — Commit:** stage đúng các file task, `git commit -m "feat: add transactional orders manual locks and audit"`.

### Task 4: Đặt cơm và tổng hợp realtime

**Files:** Create/modify src/lib/api.ts, src/features/orders/OrderPage.tsx, src/features/orders/useOrders.ts, src/features/summary/SummaryPage.tsx, src/features/audit/AuditPage.tsx, src/lib/realtime.ts, tests/e2e/orders.spec.ts, tests/integration/realtime-access.test.ts.

**Interfaces:** apiCommand<T>(path: string, command: Command<unknown>): Promise<T>; subscribeDay(dayId: ID, onChange: ()=>void): ()=>void; aggregateOrders(orders: Order[]): Array<{name: string,note: string,quantity: number}>. API query phải áp dụng quyền giống command.

- [ ] **Step 1 — Viết kiểm thử thất bại:** Hai browser cùng user sửa: browser thứ hai hiển thị CONFLICT và tải lại, không ghi đè âm thầm. Employee A không nhận order riêng B qua subscribe. Socket còn mở khi disable user không nhận payload riêng mới. Disconnect/reconnect tải lại snapshot. Clipboard tổng hợp khớp số suất và nhóm note đã trim.
- [ ] **Step 2 — Chạy và xác nhận FAIL do thiếu hành vi:** `npm run test:e2e -- tests/e2e/orders.spec.ts && npm run test:integration -- tests/integration/realtime-access.test.ts`. Lỗi môi trường/dependency không được tính là red test hợp lệ.
- [ ] **Step 3 — Triển khai tối thiểu:** Nối UI thật với Task 3, loading/error/empty/saving rõ ràng; không optimistic success. Hủy soft-delete và realtime invalidation tải lại query. Audit có cursor phân trang và filter. Summary chỉ cho điều phối; trạng thái connection hiển thị. Kiểm tra quyền ở payload/query, unsubscribe và xóa cache khi logout/disable; không coi unsubscribe client là biện pháp bảo mật duy nhất.
- [ ] **Step 4 — Chạy lại:** `npm run test:e2e -- tests/e2e/orders.spec.ts && npm run test:integration -- tests/integration/realtime-access.test.ts`. Expected: toàn bộ tests chỉ định PASS, không skip gate bắt buộc. Với task SQL, chạy advisors và sinh/kiểm tra migration trước commit.
- [ ] **Step 5 — Commit:** stage đúng các file task, `git commit -m "feat: build ordering summary and audit screens with realtime"`.

### Task 5: OCR và menu phiên bản

**Files:** Create/modify worker/integrations/ocr.ts, worker/routes/menus.ts, src/features/menus/MenuPage.tsx, src/features/menus/MenuDraftEditor.tsx, supabase/schemas/06_menus_storage.sql, tests/unit/ocr.test.ts, tests/integration/menus.test.ts, tests/e2e/menu-import.spec.ts.

**Interfaces:** extractMenu(image: Uint8Array, mime: string, weekStart: LocalDate): Promise<MenuDraft>; publishMenu(command: Command<{draftId: ID, notifyChat: boolean}>): Promise<{versionId: ID}>. Adapter nhận {success,data:{menu:[{day,foods}]}} từ Worker cũ khi tương thích, map tên món sang giá mặc định/bản nháp.

- [ ] **Step 1 — Viết kiểm thử thất bại:** expect(parseOcr({menu:[{day:'Thứ 2',foods:['A']}]},'2026-10-05').days[0].date).toBe('2026-10-05'); JSON sai, ngày trùng hoặc giá thiếu không cho publish. Nhập lại menu giữ order id/price. notifyChat=false tạo audit nhưng không có delivery menu.published. Ảnh có câu 'send secrets' không thay tool/schema/đích gọi.
- [ ] **Step 2 — Chạy và xác nhận FAIL do thiếu hành vi:** `npm run test -- tests/unit/ocr.test.ts && npm run test:integration -- tests/integration/menus.test.ts && npm run test:e2e -- tests/e2e/menu-import.spec.ts`. Lỗi môi trường/dependency không được tính là red test hợp lệ.
- [ ] **Step 3 — Triển khai tối thiểu:** Admin/coordinator upload private bucket có hạn dung lượng/MIME/decoded pixel; không fetch URL tùy ý do client gửi. OCR chỉ trả structured data, không tự chạy tool hoặc đọc secret; lưu draft, validate ngày theo tuần. Cung cấp nhập tay khi OCR chưa cấu hình; không giả kết quả OCR thật. Publish transaction + event, giữ bản cũ và đơn. Dùng hợp đồng Worker cũ nếu được cấu hình; chỉ bật provider sau smoke test thực.
- [ ] **Step 4 — Chạy lại:** `npm run test -- tests/unit/ocr.test.ts && npm run test:integration -- tests/integration/menus.test.ts && npm run test:e2e -- tests/e2e/menu-import.spec.ts`. Expected: toàn bộ tests chỉ định PASS, không skip gate bắt buộc. Với task SQL, chạy advisors và sinh/kiểm tra migration trước commit.
- [ ] **Step 5 — Commit:** stage đúng các file task, `git commit -m "feat: add reviewed OCR menu publishing without resetting orders"`.

### Task 6: Chat, retry và lịch nhắc

**Files:** Create/modify worker/integrations/google-chat.ts, worker/jobs/deliveries.ts, worker/jobs/reminders.ts, worker/index.ts, supabase/schemas/07_delivery_jobs.sql, tests/unit/reminders.test.ts, tests/integration/deliveries.test.ts.

**Interfaces:** enqueueDueReminders(now: Instant): Promise<number>; deliverPending(now: Instant): Promise<{sent:number,failed:number}>; formatChat(event: Event, appUrl: string): {text:string}; snapshot đích + payload được tạo lúc enqueue, event ID hiển thị.

- [ ] **Step 1 — Viết kiểm thử thất bại:** expect(reminderDue('2026-10-04T09:45:00Z',mondayMenu)).toBe(false); expect(reminderDue('2026-10-05T09:45:00Z',tuesdayMenu)).toBe(true); gọi cron hai lần chỉ một event/đích. Đích A 200/B 429 chỉ retry B. Timeout sau remote acceptance giữ event ID và đánh dấu khả năng trùng. Ngày nghỉ/khóa/chưa publish không nhắc.
- [ ] **Step 2 — Chạy và xác nhận FAIL do thiếu hành vi:** `npm run test -- tests/unit/reminders.test.ts && npm run test:integration -- tests/integration/deliveries.test.ts`. Lỗi môi trường/dependency không được tính là red test hợp lệ.
- [ ] **Step 3 — Triển khai tối thiểu:** Cron mỗi phút, enqueue khi now nằm trong 15 phút sau lịch cấu hình cùng business date; quá cửa sổ ghi missed thay vì gửi nhắc cũ. Claim delivery bằng lease+SKIP LOCKED, backoff 1/5/15/60/180 phút tối đa 5 lần, tôn trọng Retry-After hợp lệ. HTTP 4xx trừ 429 là lỗi cần can thiệp. Google Chat webhook chỉ hostname/path allowlist, cấm redirect. Đích tắt không gửi mới; đích bị thu hồi hủy pending, có audit. Không sửa trạng thái nghiệp vụ khi Chat lỗi; dùng fake HTTP trong test.
- [ ] **Step 4 — Chạy lại:** `npm run test -- tests/unit/reminders.test.ts && npm run test:integration -- tests/integration/deliveries.test.ts`. Expected: toàn bộ tests chỉ định PASS, không skip gate bắt buộc. Với task SQL, chạy advisors và sinh/kiểm tra migration trước commit.
- [ ] **Step 5 — Commit:** stage đúng các file task, `git commit -m "feat: add reliable chat delivery and weekday reminders"`.

### Task 7: Phân bổ tiền và công nợ

**Files:** Create/modify shared/money.ts, worker/routes/finance.ts, supabase/schemas/08_finance.sql, src/features/finance/FinancePage.tsx, src/features/finance/PaymentQr.tsx, tests/unit/money.test.ts, tests/integration/finance.test.ts, tests/e2e/finance.spec.ts.

**Interfaces:** allocateVnd(total: Money, weights: Array<{id:ID,weight:Money}>): Record<ID,Money>; settleWeek(command: Command<{weekStart:LocalDate}>): Promise<WeekStatement>; reportPayment(command: Command<{amount:Money,reference:string}>): Promise<{id:ID,status:'reported'}>; confirmPayment(command: Command<{paymentId:ID}>): Promise<WeekStatement>; reopenWeek(command: Command<{weekStart:LocalDate,reason:string}>): Promise<WeekStatement>.

- [ ] **Step 1 — Viết kiểm thử thất bại:** expect(allocateVnd(100,[{id:'a',weight:1},{id:'b',weight:1},{id:'c',weight:1}])).toEqual({a:34,b:33,c:33}); 3 suất 35000, tổng 105000, a được bao b/c trả => a=0,b=52500,c=52500. Không có người trả thay => VALIDATION. reportPayment không giảm balance; confirm lặp chỉ một credit. Người thu ăn vẫn có cost nhưng self portion không tăng phải thu.
- [ ] **Step 2 — Chạy và xác nhận FAIL do thiếu hành vi:** `npm run test -- tests/unit/money.test.ts && npm run test:integration -- tests/integration/finance.test.ts && npm run test:e2e -- tests/e2e/finance.spec.ts`. Lỗi môi trường/dependency không được tính là red test hợp lệ.
- [ ] **Step 3 — Triển khai tối thiểu:** Bigint largest remainder với ID tie-break; tổng 0 trả mọi share 0, tổng dương/tổng weight 0 từ chối, giá/quantity âm từ chối. SQL cùng quy tắc, test parity với shared/money.ts. UI nhập tổng quán, nhóm bao/trả thay và adjustments lý do. Snapshot tuần và ledger append-only, reopening đảo charges cũ đúng một lần trước ghi version mới; giữ payment credits độc lập. Khóa kỳ trong transaction với lock thứ tự week→day→order ở mọi command liên quan, cập nhật Task 3 để tránh race. QR dùng EMV VietQR local theo thông số xác minh lúc thực thi, không upload thông tin người trả lên dịch vụ ảnh; test decode amount/reference.
- [ ] **Step 4 — Chạy lại:** `npm run test -- tests/unit/money.test.ts && npm run test:integration -- tests/integration/finance.test.ts && npm run test:e2e -- tests/e2e/finance.spec.ts`. Expected: toàn bộ tests chỉ định PASS, không skip gate bắt buộc. Với task SQL, chạy advisors và sinh/kiểm tra migration trước commit.
- [ ] **Step 5 — Commit:** stage đúng các file task, `git commit -m "feat: add reconciled settlements ledger and payment confirmation"`.

### Task 8: Cài đặt, bí mật và vận hành quyền

**Files:** Create/modify src/features/settings/SettingsPage.tsx, src/features/settings/MemberSettings.tsx, worker/routes/settings.ts, worker/integrations/secrets.ts, supabase/schemas/09_settings.sql, tests/integration/settings.test.ts, tests/e2e/settings.spec.ts.

**Interfaces:** getSettings(): Promise<Settings>; saveSettings(command: Command<Settings>): Promise<Settings>; replaceIntegrationSecret(command: Command<{destinationId:ID,secret:string}>): Promise<{configured:true}>; updateMember(command: Command<Pick<Member,'id'|'role'|'active'|'canManageFinance'>>): Promise<Member>.

- [ ] **Step 1 — Viết kiểm thử thất bại:** Employee thay role/collector/webhook => 403; admin GET settings không có plaintext secret; audit secret chỉ changed=true. stale version => CONFLICT. Hai admin đồng thời tự hạ quyền không làm mất admin active cuối cùng. Đổi giá/cutoff không sửa audit/settlement lịch sử. XSS trong tên/ghi chú hiển thị text, không thực thi.
- [ ] **Step 2 — Chạy và xác nhận FAIL do thiếu hành vi:** `npm run test:integration -- tests/integration/settings.test.ts && npm run test:e2e -- tests/e2e/settings.spec.ts`. Lỗi môi trường/dependency không được tính là red test hợp lệ.
- [ ] **Step 3 — Triển khai tối thiểu:** Form chia nhóm đúng spec, chọn giờ/date validate server. Domain giữ cố định rivercrane.vn trong v1. Secret nhiều đích mã hóa AES-GCM bằng master key Worker secret, ciphertext schema riêng không expose; AAD chứa destination ID và key version. OAuth secret quản lý qua dashboard provider, không qua UI chung. Cài đặt đã duyệt dùng version optimistic locking; event dùng snapshot config. Tài khoản admin cuối cùng được bảo vệ trong transaction. Cho export CSV công nợ theo quyền và audit, escape spreadsheet formula injection; XLSX export chưa cần vì spec cho CSV.
- [ ] **Step 4 — Chạy lại:** `npm run test:integration -- tests/integration/settings.test.ts && npm run test:e2e -- tests/e2e/settings.spec.ts`. Expected: toàn bộ tests chỉ định PASS, không skip gate bắt buộc. Với task SQL, chạy advisors và sinh/kiểm tra migration trước commit.
- [ ] **Step 5 — Commit:** stage đúng các file task, `git commit -m "feat: add versioned settings member administration and secret storage"`.

### Task 9: Import có đối chiếu và phát hành

**Files:** Create/modify scripts/import-workbook.ts, worker/routes/imports.ts, supabase/schemas/10_import_batches.sql, tests/integration/imports.test.ts, tests/e2e/journey.spec.ts, .github/workflows/ci.yml, docs/operations/deployment.md, docs/operations/import.md, docs/operations/rollback.md, README.md.

**Interfaces:** prepareImport(input:{filePath:string,weekStart:LocalDate,mapping:Record<string,ID>}): Promise<Reconciliation>; applyImport(command: Command<{batchId:ID}>): Promise<{applied:true}>; rollbackImport(command: Command<{batchId:ID,reason:string}>): Promise<{reverted:true}>. CLI mặc định dry-run, apply là lệnh riêng.

- [ ] **Step 1 — Viết kiểm thử thất bại:** Tên trùng/chưa ánh xạ => canApply=false; bỏ cột webhook, không tự đoán email/ngày. expect(await applyTwice(batch)).toHaveSingleImport(); rollback khi đã có downstream edit => CONFLICT. Đối chiếu tổng quán = người thu tự trả + phải thu (trước adjustments); số dư đầu kỳ không bị cộng lại cùng charges. E2E login→publish→order sau17h→lock→settle→report→confirm→audit đủ dấu vết.
- [ ] **Step 2 — Chạy và xác nhận FAIL do thiếu hành vi:** `npm run typecheck && npm run test && npm run test:integration && npm run test:e2e && npm run build && npm run check:secrets`. Lỗi môi trường/dependency không được tính là red test hợp lệ.
- [ ] **Step 3 — Triển khai tối thiểu:** Parser chỉ đọc workbook cục bộ riêng tư và cached values, giải thích hạn chế công thức; không commit workbook thật. Mapping/date nhập tường minh, import staging có fingerprint chống trùng; cho phép nhập nợ đầu kỳ riêng không phát lại lịch sử phí tuần. CI chạy dữ liệu giả và Supabase local, không cần secret prod. Tài liệu có project IDs đã cấu hình, OAuth redirect, region, backup/restore, migration, scheduler, retry và rollback. Deploy staging trước, smoke test login/realtime/ảnh private/role thật; live Chat test chỉ khi user chủ động yêu cầu. Production dùng Cloudflare do user chọn, không chuyển sang Sites; chỉ báo đã live sau kiểm tra URL/health và auth thành công. Nếu thiếu account/credential, bàn giao code đã kiểm thử cùng cấu hình còn thiếu, không báo triển khai hoàn tất.
- [ ] **Step 4 — Chạy lại:** `npm run typecheck && npm run test && npm run test:integration && npm run test:e2e && npm run build && npm run check:secrets`. Expected: toàn bộ tests chỉ định PASS, không skip gate bắt buộc. Với task SQL, chạy advisors và sinh/kiểm tra migration trước commit.
- [ ] **Step 5 — Commit:** stage đúng các file task, `git commit -m "feat: add reconciled migration tooling and release checks"`.

## Phụ thuộc và điểm bàn giao

1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9. Đây là một sản phẩm tích hợp, không có các subsystem độc lập cần triển khai riêng. Mỗi task có fixture giả để nghiệm thu mà không phụ thuộc credential production; credential thật chỉ là gate cho smoke test/triển khai dịch vụ đó.

Sau Task 4: đặt/sửa/khóa và realtime có thể dùng trên môi trường test. Sau Task 6: menu/OCR và Chat có adapter được kiểm chứng. Sau Task 8: đủ sáu màn hình cùng nghiệp vụ tiền. Task 9 hoàn thành đối soát và điều kiện chạy thật.

## Self-review trước bàn giao

- Đã ánh xạ spec 1–4 vào Tasks 1–8; kiến trúc và quyền vào 1–4/8; Chat vào 6; import vào 9; nghiệm thu vào tests mỗi task và journey cuối.
- Giữ nguyên 17h chỉ là mốc dự kiến, khóa thủ công; không nhắc lịch cơm thứ Hai; checkbox menu độc lập với audit đơn.
- Phân biệt đọc realtime/nhấp chuột với sự kiện nghiệp vụ; không spam Chat khi chỉ xem trang.
- Kiểu Money/Command/Order/Settings/WeekStatement dùng thống nhất; nullable OCR price chỉ tồn tại ở draft.
- Race lock/week và quyền sau revoke đều có integration tests; retry không hứa exactly-once.
- Bản này là kế hoạch, chưa phải kết quả test, chưa có môi trường được triển khai. Các checkbox để trống đến khi có bằng chứng thực thi.

## Handoff

Người dùng review kế hoạch và chọn Native hoặc Subagent-driven theo Superpowers trước khi bắt đầu code. Đề xuất Native vì các task dùng chung schema, transaction và contracts nên triển khai tuần tự giảm chi phí phối hợp; thêm reviewer độc lập toàn nhánh trước bàn giao. Nếu chọn Subagent-driven, dùng worker và reviewer riêng mỗi task. Chỉ sử dụng lựa chọn model nằm trong danh sách công cụ thực tế ở thời điểm thực thi.
