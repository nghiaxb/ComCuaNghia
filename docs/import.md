# Nhập dữ liệu từ workbook

Giữ nguyên workbook gốc và Apps Script ngoài repository: chúng có thể chứa dữ liệu cá nhân và webhook. Công cụ chỉ đọc giá trị cache của XLSX, không chạy macro/script, bỏ qua sheet webhook. Đối soát lại workbook trong Google Sheets trước export nếu công thức chưa có cache.

1. Trong Cài đặt tạo hồ sơ cũ và gán đúng email công ty nếu biết; không đoán email từ tên. Tải mapping, đối chiếu từng tên và UUID. Email chính xác sẽ liên kết hồ sơ cũ khi Google login.
2. Chọn ngày thứ Hai thực tế của snapshot và UUID người thu. Chạy:

```sh
python3 scripts/import-workbook.py /private/source.xlsx --mapping /private/mapping.json --week YYYY-MM-DD --collector-id UUID --output /private/review.json
```

3. Kiểm tra errors, tổng từng ngày và số dư từng người, trường hợp thiếu mapping, trùng tên hoặc số không hợp lệ. Công cụ chỉ dry-run, không gọi mạng. Không commit report. Tải JSON vào Cài đặt, xem phần đối soát và xác nhận nhập.
4. Import lưu lịch sử đơn khóa, snapshot đã quyết toán và **chỉ số dư đầu kỳ**, không ghi thêm phí cơm lịch sử. Fingerprint và batch ID chống nhập hai lần.

Nếu chưa phát sinh hoạt động sau nhập: admin gọi command `import.rollback` với `{batchId,reason}`, request UUID mới và expectedVersion 0. Hệ thống đảo số dư, giữ bản nhập/audit để truy vết, gỡ các ngày lịch sử chưa thay đổi, đánh dấu snapshot đã hoàn tác. Bản đã sửa cần batch UUID mới; không được dùng lại UUID cũ. Nếu đã có hoạt động công nợ hoặc thay đổi lịch sử, rollback bị chặn; dùng bút toán điều chỉnh với lý do và đối soát thay vì xóa lịch sử.
