# Triển khai Supabase và Cloudflare

## Cấu hình staging

1. Tạo Supabase project riêng cho staging. Chỉ public schema được expose; không expose `private`. Bật Google provider, tắt email/password và anonymous. Dùng Google OAuth app nội bộ Workspace, domain rivercrane.vn. Redirect OAuth callback là URL do Supabase Dashboard cấp. Site URL và redirect allowlist phải khớp URL webapp, không wildcard production.
2. Backup trước khi dùng database có dữ liệu. Migration đầu tiên giả định database ứng dụng mới. Chạy `npx supabase link --project-ref PROJECT_REF`, rồi `npx supabase db push --dry-run`; kiểm tra migration trước khi `npx supabase db push`. Không chạy lại schema trực tiếp trên database đã migrate.
3. Đăng nhập bằng Google công ty. Quản trị database chỉ định admin đầu tiên bằng câu UPDATE có điều kiện **đúng email đã được xác minh** trong `public.members`; không tự nâng quyền người đầu tiên đăng nhập. Ghi nhận thao tác bootstrap trong sổ vận hành. Sau đó quản lý quyền qua Cài đặt.
4. Cloudflare Worker vars: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `APP_URL`. Đặt `SUPABASE_SECRET_KEY`, `INTEGRATION_MASTER_KEY`, `OCR_API_KEY` bằng `wrangler secret put`. Master key là 32 bytes ngẫu nhiên base64; giữ bản backup an toàn. Không đưa các secrets vào VITE hoặc git. `OCR_WORKER_URL` phải là HTTPS endpoint tin cậy hỗ trợ payload `{imageBase64,mimeType}` và kết quả `{success,data}` như script gốc.
5. Build với `VITE_SUPABASE_URL` và `VITE_SUPABASE_PUBLISHABLE_KEY`. Chạy `npm run build`, `npx wrangler deploy --dry-run`, rồi deploy staging. Wrangler có static SPA assets và cron mỗi phút.
6. Trong Cài đặt chọn người thu, VietQR bank BIN/tài khoản, ngày nghỉ và nơi nhận Google Chat. Không dùng webhook thật để test tự động. Khi admin chủ động gửi thử, xác nhận đúng phòng Chat.

## Gates trước production

- Google công ty đăng nhập được; domain ngoài, phiên vô hiệu, nhân viên bị khóa không đọc/ghi được. Kiểm tra RLS và Security Advisor Supabase; kiểm tra provider/claim Google thực tế.
- Hai trình duyệt thấy đặt/sửa/hủy và khóa ngày qua Realtime; nhân viên không thấy công nợ riêng của người khác, quyền tài chính thấy đủ đơn cần tính tiền.
- Sửa sau 17h được; khóa thủ công chặn; race giữa sửa/khóa/settle không tạo kết quả nửa chừng.
- OCR PNG/JPEG/WebP qua Worker thật, ảnh trong bucket riêng tư chỉ staff xem; lỗi OCR vẫn nhập tay được.
- Kiểm tra Chat trong phòng staging được phép: nội dung trước/sau, tùy chọn không gửi menu, lỗi 429/5xx và hết retry. Delivery có thể trùng sau timeout; Google Chat webhook không hỗ trợ exactly-once.
- Cron thứ Hai không nhắc cơm thứ Hai; thứ Ba–thứ Sáu nhắc một lần/ngày trong cửa sổ 15 phút; ngày nghỉ/khóa không nhắc. Theo dõi cron lỡ cửa sổ bằng logs.
- Đối soát nhập dữ liệu theo docs/import.md, tiền tổng và số dư từng người; xác minh QR bằng app ngân hàng nhưng không chuyển tiền khi test.

## Vận hành và rollback

Không log token hoặc webhook. Trang Nhật ký hiển thị delivery và cho admin thử lại bản failed; kiểm tra event ID trước retry. Tắt nơi nhận sẽ hủy delivery đang chờ. Đổi khóa mã hóa cần tái mã hóa destination secrets và delivery snapshots còn chờ bằng khóa cũ trước khi bỏ khóa cũ; không chỉ thay env.

Rollback frontend/Worker bằng Cloudflare deployment trước. Database/ledger không rollback bằng xóa migration; dùng thao tác mở lại quyết toán, đảo bút toán hoặc restore backup đã kiểm thử trong thời gian bảo trì. Giữ audit và cân đối tiền trước mở lại hệ thống.

Các giới hạn bản hiện tại: audit UI lấy 100 bản gần nhất, chưa phân trang; chưa có audit phiên đăng nhập riêng (Supabase Auth có logs); chưa có công cụ xoay master key tự động; chưa chạy đo tải. Khóa advisory toàn ứng dụng phù hợp nhóm nội bộ nhỏ, cần đo tải trước mở rộng.

Tham khảo: [Supabase CLI configuration](https://supabase.com/docs/guides/local-development/cli/config), [Cloudflare static assets](https://developers.cloudflare.com/workers/static-assets/).

Worker gọi OCR Worker qua workers.dev cần `compatibility_flags: ["global_fetch_strictly_public"]`. Dùng `redirect: "manual"` và từ chối HTTP 3xx, không chuyển tiếp khóa API/webhook theo redirect. Runtime production đã từ chối `redirect: "error"` dù Node fetch chấp nhận; regression test chạy bằng workerd/Miniflare, không chỉ mock Node.
