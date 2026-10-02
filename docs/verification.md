# Trạng thái kiểm chứng — 2026-10-02

Bản v1 trên nhánh `feat/webapp-v1`, chưa deploy hoặc nhập dữ liệu thật.

| Phần | Bằng chứng local | Còn cần staging |
|---|---|---|
| 6 màn hình + Cài đặt | Playwright 2 tests, 390px/1440px, xem ảnh render | Luồng có phiên đăng nhập thật |
| Hợp đồng/money/time/OCR/mã hóa | 22 unit tests | OCR Worker thực tế |
| Auth, RLS, commands, audit, outbox, finance, import | 20 PostgreSQL PGlite integration tests | GoTrue, Realtime, Storage, cron transport |
| Import XLSX | 3 Python tests; không nhập workbook thật | Mapping và tuần của snapshot được đối soát |
| Build | TypeScript và Vite thành công | Wrangler bundle/deploy staging |
| Bí mật | Source secret scan thành công | Secret provisioning và rotation quy trình |

Review độc lập phát hiện và đã sửa: quyền đọc dữ liệu tính tiền của finance delegate; lý do chỉnh sửa bị bỏ khỏi audit; thiếu items/null version vượt validation; rollback import ngăn nhập bản đã sửa. Regression tests xác minh các trường hợp này. Finance reopen lỗi tên cột không rõ nghĩa cũng đã được sửa.

Khác biệt với kế hoạch: SQL gộp trong migration ban đầu và dispatcher chung; dùng advisory transaction lock cho nhóm nhỏ. Chưa có Docker/Postgres server nên test RLS bằng PostgreSQL WASM, không tuyên bố tương đương Supabase end-to-end. CLI tạo migration trước đó; migration được điền từ schema đã test, unit test đảm bảo hai bản giống nhau. Playwright pinned 1.51.1 vì browser package mới không tải được trong môi trường. Auth login audit riêng, audit pagination, tự động xoay master key và staging gates vẫn chưa hoàn thành; xem deployment.md.

Không gửi tin nhắn tới Google Chat thật trong kiểm thử. Không dùng test data làm dữ liệu thật. Không merge main hoặc triển khai production trong bước này.
