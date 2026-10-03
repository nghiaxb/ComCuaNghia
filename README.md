# Cơm Của Nghĩa

Webapp đặt cơm nội bộ Rivercrane: React + Supabase (Auth/PostgreSQL/Realtime/Storage) + Cloudflare Worker. Sáu màn hình: đặt cơm, menu OCR, tổng hợp, công nợ, nhật ký, cài đặt.

**Trạng thái:** bản triển khai trên nhánh phát triển; chưa kết nối hoặc triển khai hệ thống thật. Không có dữ liệu nhân viên hay webhook thật trong repository. Bản xem trước chỉ dùng dữ liệu mẫu và không ghi dữ liệu.

## Chạy trên máy

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Không điền biến môi trường vẫn xem được giao diện mẫu. Để dùng backend, điền hai biến public Vite, cấu hình `.dev.vars` theo `.env.example`, chạy `npm run build` và `npx wrangler dev --port 8787`; Vite chuyển `/api` sang Worker. Google OAuth phải cho phép đúng URL ứng dụng.

## Quy tắc nghiệp vụ

- Mốc 17:00 hôm trước chỉ đánh dấu thay đổi trễ; vẫn sửa/hủy cho đến khi người điều phối bấm khóa. Thời gian nghiệp vụ: `Asia/Ho_Chi_Minh`.
- Không có nhắc lịch cho cơm thứ Hai. Công bố menu có ô chọn thông báo Chat. Nhắc thứ Ba–thứ Sáu mặc định 16:45 hôm trước.
- Thay menu giữ nguyên đơn và giá đã đặt. OCR lưu nháp riêng tư, cần kiểm tra trước khi công bố.
- Mutations chạy trong giao dịch gồm audit và outbox. Nhật ký giữ trước/sau, người thực hiện và lý do. Chat thử lại có giới hạn; event ID giúp nhận diện bản trùng khi mạng mất phản hồi.
- Quyết toán dùng số nguyên VND, phân bổ phần dư, miễn phần cơm của người thu và chia khoản bao cho người tài trợ. Đã quyết toán cần mở lại trước khi sửa đơn.
- Mọi nhân viên active được đặt/sửa/hủy hộ, bắt buộc lý do, audit giữ người thao tác/người nhận/trước/sau.
- OCR nhận kéo thả và Ctrl+V/⌘V để chọn và xem trước ảnh; chỉ gửi khi bấm “Đọc menu bằng OCR”. Có nút bỏ ảnh, giữ ảnh khi lỗi. Nhập thứ Hai–thứ Sáu, bỏ qua cuối tuần; lỗi OCR phân biệt dịch vụ, phân tích và lưu nháp.
- Đăng nhập Google đã xác minh thuộc `rivercrane.vn`; RLS kiểm tra trạng thái thành viên mỗi request. Client không có quyền ghi trực tiếp bảng.

## Kiểm tra

```sh
npm test
npm run test:integration
python3 -m unittest discover -s tests -p '*_test.py'
npm run build
npx playwright install chromium
npm run test:e2e
npm run check:secrets
```

Integration chạy PostgreSQL WASM (PGlite), có mô phỏng Auth/RLS; E2E hiện kiểm tra giao diện mẫu ở 390px và 1440px. Chưa thay thế kiểm tra OAuth, Realtime, Storage và Worker cron trên staging. Xem [hướng dẫn triển khai](docs/deployment.md), [nhập dữ liệu](docs/import.md) và [trạng thái kiểm chứng](docs/verification.md).
