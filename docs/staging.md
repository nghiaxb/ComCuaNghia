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
