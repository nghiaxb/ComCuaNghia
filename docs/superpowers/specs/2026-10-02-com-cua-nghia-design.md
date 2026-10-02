# Cơm Của Nghĩa — Đặc tả webapp v1

Ngày: 2026-10-02  
Trạng thái: Phạm vi 6 màn hình đã được duyệt; đặc tả chi tiết này chờ chủ dự án review.  
Repository: nghiaxb/ComCuaNghia

## 1. Mục tiêu và căn cứ

Thay quy trình Google Sheet và Apps Script bằng ứng dụng tiếng Việt, dùng tốt trên điện thoại và desktop, có đăng nhập tài khoản công ty, realtime, tổng hợp đơn và công nợ. Giữ nghiệp vụ đặt cơm, bao cơm, OCR menu và Google Chat; loại bỏ phụ thuộc số dòng và tên hiển thị để ghép dữ liệu.

Nguồn phân tích: bản đính kèm Nghĩa Cơm.xlsx và Toan_Bo_Apps_Script.docx trong cuộc trao đổi. Đây là snapshot, không khẳng định phản ánh dữ liệu trực tiếp mới nhất. Repo được kiểm tra đang trống trước khi ghi tài liệu. Không đưa dữ liệu cá nhân, tài khoản nhận tiền, ảnh nguồn hoặc khóa tích hợp của file đính kèm vào repo công khai.

## 2. Quy tắc người dùng đã xác nhận

- Sáu màn hình: Đặt cơm, Quản lý menu, Tổng hợp đơn, Công nợ, Nhật ký, Cài đặt.
- Giới hạn đăng nhập bằng email thuộc rivercrane.vn.
- Mốc dự kiến là 17:00 ngày trước ngày ăn, múi giờ Asia/Ho_Chi_Minh.
- Qua 17:00 vẫn cho đặt, sửa và hủy. Thời gian không tự khóa đơn.
- Chỉ khóa khi người có quyền bấm khóa ngày đặt cơm, tương đương khóa sheet.
- Mọi hoạt động thay đổi nghiệp vụ được ghi nhật ký và đưa vào hàng đợi báo Google Chat.
- Cơm thứ Hai không có nhắc tự động theo giờ. Khi OCR và công bố menu, người quản lý chọn có thông báo Google Chat hay không.
- Checkbox thông báo menu không tắt nhật ký hoặc thông báo thay đổi đơn.
- Mặc định nhắc lúc 16:45 hôm trước cho ngày ăn thứ Ba đến thứ Sáu; sửa được trong Cài đặt.

## 3. Các lựa chọn thiết kế đề xuất trong bản review

Các mục dưới đây là lựa chọn triển khai đề xuất, chưa phải quy tắc có sẵn trong Sheet:
- Google OAuth cho Google Workspace; cần xác nhận tài khoản công ty hỗ trợ trước khi cấu hình thật. Không tự thêm đăng nhập mật khẩu hoặc domain khác.
- Nhân viên xem và sửa đơn của mình; điều phối quản lý đơn toàn nhóm và đặt hộ; quản trị quản lý cấu hình và quyền.
- Mỗi thành viên có một đơn mỗi ngày, đơn có thể có nhiều dòng món/ghi chú.
- Chỉ người có quyền quản trị tài chính mới xác nhận thanh toán và quyết toán; quản trị có quyền này mặc định.
- Không giới hạn số người theo 21/24/26 dòng của file cũ.
- Một nhóm đặt cơm và một quán mặc định trong v1; dữ liệu có định danh quán để có thể mở rộng sau.
- Chỉ ghi nhận thanh toán thủ công trong v1; QR không chứng minh đã nhận tiền.
- “Mọi hoạt động” bao gồm thay đổi dữ liệu, đăng nhập được ghi nhận bởi hệ thống, xuất dữ liệu và thao tác quản trị. Không phát Chat cho từng lần mở trang, đọc realtime hoặc nhấp chuột; các hoạt động này không thay đổi nghiệp vụ.
- Checkbox menu chỉ điều khiển thông báo công bố menu. OCR, lưu nháp và công bố vẫn được audit, nhưng không gửi thêm thông báo nội dung menu khi checkbox tắt.
- Nhắc là thông báo cho nhóm đã cấu hình, chưa tự nhắn riêng người chưa đặt.

## 4. Màn hình và luồng chính

### 4.1 Đặt cơm
Chọn tuần/ngày; xem món, giá, ghi chú và trạng thái mở/đã khóa. Tạo/sửa/hủy đơn của mình, số lượng nguyên dương. Hiển thị “Sau mốc 17h” khi phù hợp, không chặn lưu vì mốc thời gian. Chỉ báo lưu thành công sau khi server xác nhận. Hủy là trạng thái có lịch sử, không xóa vật lý.

### 4.2 Quản lý menu
Upload/dán ảnh → OCR → bản nháp theo ngày → sửa tên món/giá/ngày → công bố. Giá OCR thiếu hoặc không hợp lệ phải được sửa trước khi công bố. Người quản lý chọn tuần cụ thể; không suy ra ngày chỉ từ nhãn T2.
Checkbox “Thông báo Google Chat” mặc định bật và hiển thị rõ nơi nhận. Chỉ gửi khi công bố thành công.
Nhập menu không xóa đơn đã đặt. Menu được lưu phiên bản; món đã có đơn không xóa vật lý. Thay giá không tự thay giá đơn cũ. Khi thay món đang được đặt, hiển thị ảnh hưởng để điều phối xử lý đơn một cách tường minh.

### 4.3 Tổng hợp đơn
Xem số suất, món và ghi chú đã gom; xuất/sao chép nội dung gửi quán. Điều phối đặt hộ và chỉnh đơn với lý do. Khóa/mở khóa ngày kèm người thao tác và thời gian.
Ngày khóa từ chối mọi tạo/sửa/hủy đơn kể cả của quản trị. Muốn thay đổi phải mở khóa trước. Đơn và thao tác khóa dùng cùng cơ chế khóa giao dịch ở database để có thứ tự xác định.
Trạng thái khóa đơn độc lập với quyết toán tài chính. Khóa ngày không tự xác nhận đã thanh toán.

### 4.4 Công nợ
Theo ngày và tuần: tiền món, tổng thực trả cho quán, phần sau giảm giá, bao cơm, khoản khác, số dư đầu kỳ, số đã trả và số còn nợ.
Cơ chế tương đương Sheet: phân bổ tổng tiền quán theo tỷ lệ giá gốc; phần của người được bao được chia đều cho nhóm người trả thay; người trả thay trả thêm phần này ngoài phần riêng. Hai nhóm không giao nhau; có người được bao mà không có người trả thay thì không cho quyết toán.
Tiền lưu số nguyên VND. Phân bổ bằng phần nguyên rồi chia phần dư theo phần lẻ lớn nhất, hòa thì theo ID ổn định. Tổng phân bổ phải bằng tổng tiền cần phân bổ.
Người thu tiền vẫn có phần ăn nhưng phần tự trả không được tính vào phải thu người khác. Chọn người thu theo ID, không hardcode tên.
Công nợ dùng bút toán: phí cơm, điều chỉnh, thanh toán, hoàn/đảo bút toán; không cộng dồn rồi xóa tuần cũ. Khoản điều chỉnh có lý do và người tạo.
Trạng thái thanh toán: chưa trả → người dùng báo đã chuyển → người có quyền xác nhận. Báo đã chuyển không trừ nợ cho đến khi xác nhận.
Tuần quyết toán có snapshot và phiên bản, không ghi đè. Nếu cần sửa đơn liên quan, người có quyền mở lại kỳ với lý do, giữ phiên bản cũ, thực hiện điều chỉnh và quyết toán phiên bản mới. Việc mở lại kỳ không tự mở khóa ngày.
QR chứa số tiền phải trả và mã tham chiếu; chỉ tạo khi số tiền dương. Tài khoản nhận tiền cấu hình trong hệ thống.

### 4.5 Nhật ký
Lọc theo ngày, người, loại thao tác, đối tượng và trạng thái gửi Chat. Lưu actor, người được đặt hộ, server timestamp, before/after, request ID, lý do, cờ sau mốc 17h.
Người dùng không sửa/xóa nhật ký. Nhân viên chỉ xem lịch sử của mình, điều phối xem đơn trong nhóm; nhật ký tài chính và cấu hình giới hạn theo quyền.
Không ghi giá trị secret, token hoặc mật khẩu vào before/after. Thay khóa chỉ ghi loại khóa, người thay và thời gian.

### 4.6 Cài đặt
- Đặt cơm: múi giờ, mốc dự kiến, giờ nhắc, ngày nghỉ. V1 cố định không nhắc tự động cơm thứ Hai; đổi giờ không thêm lịch thứ Hai.
- Thành viên: email, tên hiển thị, vai trò, trạng thái hoạt động; ánh xạ thành viên cũ sang tài khoản.
- Thanh toán: người thu, ngân hàng, tài khoản, mẫu nội dung QR, cấu hình bao cơm và quy tắc làm tròn.
- Google Chat: nơi nhận, bật/tắt thông báo theo loại, trạng thái gửi, gửi thử do người quản trị chủ động bấm. Thay đổi cấu hình cũng có audit.
- OCR: cấu hình phía server, giới hạn upload, giá mặc định và luồng duyệt.
- Cá nhân: tên hiển thị, ghi chú mặc định và tùy chọn nhắc cá nhân nếu được bổ sung.
Thay đổi cài đặt không viết lại lịch sử; giá/thuật toán mới áp dụng cho dữ liệu mới, hoặc qua điều chỉnh tường minh ở kỳ đang mở.
Khóa tích hợp chỉ nhập/thay mới, không trả giá trị về browser. Thay nơi nhận thông báo phải lưu ảnh chụp danh sách đích tại thời điểm tạo sự kiện.

## 5. Kiến trúc và dữ liệu

React + TypeScript + Vite phục vụ từ Cloudflare Workers Static Assets. Supabase cung cấp Auth, Postgres, Realtime và Storage riêng tư. Worker xử lý tích hợp OCR, Google Chat và tác vụ theo lịch. Không bổ sung D1/Durable Objects hoặc hai database làm nguồn chuẩn trong v1.

Các miền dữ liệu:
- profiles, memberships: tài khoản, vai trò và trạng thái.
- vendors, menu_weeks, menu_versions, menu_items, meal_days: menu theo ngày thực, lịch và khóa.
- orders, order_items: chủ đơn, actor đặt hộ, giá snapshot, số lượng, version.
- settlements, settlement_lines, ledger_entries, payment_reports: quyết toán, công nợ và thanh toán.
- audit_events, notification_outbox, notification_deliveries: nhật ký và giao nhận thông báo.
- settings, integration_destinations, import_batches: cấu hình và dấu vết nhập dữ liệu.
Tên bảng là thiết kế logic; migration chi tiết được lập ở giai đoạn triển khai.

Ghi nghiệp vụ, audit và outbox trong cùng một transaction. Browser không tự tạo audit làm bằng chứng. Hạn chế quyền ghi trực tiếp; các lệnh nghiệp vụ phải đi qua giao dịch có kiểm tra quyền, ngày khóa, version và request ID. Worker tích hợp dùng quyền tối thiểu cần thiết.

Realtime chỉ cập nhật dữ liệu người nhận được phép xem. Tiền riêng của người khác và secret không có trong payload dùng chung. Kết nối lại phải tải snapshot mới; hiển thị trạng thái mất kết nối và không khẳng định đơn đã lưu khi chưa có xác nhận.

## 6. Auth, phân quyền và bí mật

Chỉ chấp nhận email đã được nhà cung cấp xác thực, domain so khớp chính xác rivercrane.vn. Kiểm tra server-side khi cấp quyền, không dựa trên bộ lọc giao diện hoặc tham số gợi ý domain.
Không dùng user_metadata tự sửa được để xác định vai trò. Vai trò và active membership do quản trị quản lý trong database. Mọi truy cập dữ liệu phải kiểm tra membership đang hoạt động; token cũ không được tiếp tục thao tác sau khi tài khoản bị vô hiệu.
Bật RLS cho mọi bảng/schema được expose; kiểm tra cả quyền truy cập bảng và policy. View dùng security_invoker hoặc chỉ nằm trong schema riêng. Hàm nâng quyền phải thu hẹp quyền gọi, search_path và xác thực actor.
Frontend chỉ chứa publishable key, không chứa service-role, OAuth client secret, webhook hoặc OCR API key. Bí mật nằm phía server; endpoint đọc cấu hình không trả secret.
Ảnh menu lưu riêng tư. Thông báo Chat mặc định gửi nội dung chữ và link ứng dụng cần đăng nhập; không tự công khai ảnh để nhúng.
Không chuyển nguyên Apps Script sang repo vì nguồn có credential. Thay webhook cũ là công việc cấu hình triển khai, không thực hiện ngầm trong giai đoạn đặc tả.

## 7. Nhắc lịch và giao nhận Google Chat

Scheduler dùng thời gian UTC nhưng xác định ngày nghiệp vụ theo Asia/Ho_Chi_Minh. Chỉ tạo sự kiện nhắc cho ngày ăn thứ Ba–thứ Sáu có menu đã công bố, không phải ngày nghỉ và chưa khóa. Cơm thứ Hai chỉ có thông báo công bố menu được chọn.
Mỗi lần nhắc có khóa duy nhất theo ngày ăn, loại nhắc và nơi nhận để scheduler chạy lại không tạo hàng đợi trùng.
Thay đổi sau 17h có nhãn rõ ràng. Mọi actor, kể cả chủ hệ thống, đều được audit; không giữ ngoại lệ bỏ qua email chủ trong script cũ.
Thông báo lưu trạng thái pending/sending/sent/failed theo từng đích. Thử lại lỗi tạm thời với backoff, giới hạn số lần và giao diện thử lại có quyền; không hủy đơn khi Chat hỏng.
Webhook không bảo đảm exactly-once: nếu phía Chat nhận nhưng phản hồi bị mất, retry có thể gửi trùng. Giữ event ID trong nội dung và delivery log để nhận biết. Không hứa tuyệt đối không trùng.
Thông báo vận hành không chứa số dư công nợ cá nhân hay bí mật trong nhóm chung; thông báo sao kê dẫn tới trang có phân quyền.

## 8. Chuyển dữ liệu

Import riêng tư, có dry-run và báo cáo đối chiếu trước khi áp dụng. Không import webhook từ workbook vào bảng dữ liệu công khai.
Ánh xạ người theo ID/email do quản trị duyệt; không tự đoán email từ tên. Người chưa ánh xạ có hồ sơ legacy chưa được phép đăng nhập.
Yêu cầu chọn tuần thực cho các tab T2–T6. Không suy đoán ngày từ tên tab. Đối soát giá gốc, tổng sau phân bổ, phần người thu tự trả, khoản khác và nợ đầu kỳ.
Các giá trị xuất Excel có công thức Google không tương thích chỉ dùng làm bằng chứng đối chiếu; không chạy lại DUMMYFUNCTION như công thức nghiệp vụ.
Import có batch ID chống lặp và rollback theo batch khi chưa phát sinh sử dụng tiếp. Chạy đối chiếu một tuần thử trước khi ngừng dùng Sheet. Không đồng bộ hai chiều tự động trong v1.

## 9. Kiểm chứng và điều kiện nghiệm thu

- Sai domain, chưa xác thực hoặc membership bị khóa đều không truy cập được dữ liệu.
- Nhân viên không sửa đơn người khác, tự nâng quyền hoặc xem công nợ riêng của người khác, kể cả qua API/Realtime.
- Đơn trước và sau 17h đều sửa được khi ngày mở; ngày khóa từ chối mọi ghi. Kiểm thử sửa và khóa đồng thời.
- Gửi lặp một request không tạo hai đơn/bút toán; version cũ trả xung đột rõ ràng.
- Mọi thay đổi thành công có audit và outbox tương ứng; thao tác thất bại không phát thông báo thành công.
- OCR lỗi/sai cấu trúc không công bố hoặc xóa đơn. Checkbox tắt không gửi thông báo công bố menu.
- Thứ Hai không nhận nhắc lịch; thứ Ba–thứ Sáu nhận đúng ngày/giờ cấu hình và không bị scheduler tạo lặp.
- Kiểm tra tỷ lệ giảm giá, bao cơm, không có người trả thay, số tiền bằng 0, phần dư làm tròn và tổng phải thu loại phần tự trả.
- QR/báo đã chuyển không tự xác nhận thanh toán; quyết toán giữ phiên bản lịch sử.
- Chat lỗi, timeout và reconnect không làm mất đơn, audit hay gửi realtime vượt quyền.
- Kiểm tra upload riêng tư, secret không xuất hiện trong bundle/log/API/repo.
- UI tiếng Việt dùng được trên điện thoại và desktop, có trạng thái tải/rỗng/lỗi/lưu/xung đột.
- Unit tests cho quy tắc tiền và lịch; integration tests cho RLS, transaction và outbox; E2E cho đặt cơm, khóa ngày, OCR và thanh toán.

## 10. Ranh giới và đầu vào triển khai

V1 không gồm thanh toán ngân hàng tự động, app native, bán hàng công khai, nhiều tổ chức, đồng bộ hai chiều Sheet hoặc chat riêng từng nhân viên.
Để chạy thật cần project Supabase, tài khoản Cloudflare, Google OAuth client, tài khoản quản trị ban đầu, webhook mới và quyền truy cập nhà cung cấp OCR. Không yêu cầu dán secret vào chat; nhập qua cấu hình bảo mật khi triển khai.
Mã nguồn OCR Worker hiện tại chưa được cung cấp. Bản mới dùng adapter cùng hợp đồng ảnh → danh sách món theo ngày; lựa chọn nhà cung cấp/model và kiểm chứng thực tế thực hiện trước khi bật OCR production.
Trước khi triển khai Supabase phải kiểm tra changelog và tài liệu phiên bản hiện tại, pin dependency, tạo migration và xác minh RLS. Đặc tả này không tự tạo project, gửi Google Chat hoặc triển khai production.

## 11. Tài liệu tham chiếu

- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/realtime/postgres-changes
- https://developers.cloudflare.com/workers/static-assets/
- https://developers.cloudflare.com/workers/configuration/cron-triggers/

## 12. Bước tiếp theo

Chủ dự án review đặc tả này. Sau khi duyệt, viết kế hoạch triển khai với thứ tự dữ liệu/phân quyền → đặt cơm/khóa/realtime → OCR/Chat → công nợ/cài đặt → kiểm thử/import/triển khai, rồi thống nhất phương thức thực thi. Chưa viết code sản phẩm trong bước đặc tả.
