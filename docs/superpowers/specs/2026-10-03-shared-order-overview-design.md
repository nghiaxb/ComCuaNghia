# Tổng quan đơn và bill chung realtime

## Mục tiêu đã chốt

Nhân viên có cùng góc nhìn về bữa ăn như Google Sheet: biết ai đã đặt, ai chưa đặt, món/số lượng/ghi chú và người thao tác hộ để tránh đặt trùng, nhận nhầm và chủ động nhắc đồng nghiệp. Mọi thao tác đặt, sửa, huỷ, đặt hộ và điều chỉnh menu ảnh hưởng đến đơn phải cập nhật bảng chung, tổng tiền và phần chia tiền cho các phiên đang mở, không phụ thuộc việc quản lý lưu bill.

Đơn vẫn được chỉnh sau mốc 17h hôm trước; chỉ khoá thủ công hoặc kỳ đã quyết toán mới chặn. Lịch sử tuần được giữ. Google login rivercrane.vn và quyền thay đổi dữ liệu hiện có tiếp tục áp dụng.

## Giao diện

Mở trang Tổng hợp đơn cho mọi thành viên active. Người dùng chọn tuần/ngày và xem bảng: tên, trạng thái (đã đặt/chưa đặt/đã huỷ), món, ghi chú, số suất, tiền món, phần phải trả và người đặt/chỉnh hộ gần nhất. Hiển thị toàn bộ roster active, không chỉ người có đơn. Người đã nghỉ vẫn xuất hiện nếu có đơn lịch sử ở ngày đang xem. Có lọc trạng thái và tìm tên.

Ngay dưới danh sách món ở trang Đặt cơm, thêm tóm tắt chung đã đặt/chưa đặt, bill dự kiến và lối mở tổng quan ngày đó. Liên kết đặt hộ mở đúng người/ngày và tải đơn hiện có, dùng luồng đặt hộ đã có thay vì form thay đơn bằng một món ở Summary. Người được đặt hộ nhìn thấy đơn cập nhật trong giỏ của mình.

Khối bill chung gồm tiền món gốc, giảm giá thực áp dụng, phí phát sinh, tổng sau giảm và phần chia mỗi người. Phân biệt Dự kiến với Đã quyết toán. Nhân viên xem; chỉ admin/người có quyền tài chính sửa giảm giá, phí và cấu hình tài trợ. Khoá/mở ngày vẫn chỉ dành cho người điều phối/admin; quyết toán vẫn chỉ dành cho tài chính.

## Realtime — không chờ lưu bill

Mỗi command thành công là một thay đổi đã được lưu: order.save, order.cancel, thao tác hộ, menu.publish/withdraw làm đổi đơn, day.lock, sửa cấu hình bill, quyết toán/mở lại kỳ. Các phiên khác nhận sự kiện và tải lại dữ liệu chung; cả bảng đơn, người chưa đặt, tổng bill và từng phần chia cập nhật cùng snapshot. Mục tiêu dưới 1 giây trong điều kiện kết nối bình thường; không cam kết thời gian tuyệt đối khi mất mạng.

Tiền món luôn tính từ đơn active hiện tại; phần giảm/phí và phần chia được tính lại tự động khi đơn thay đổi. Không có bước quản lý xác nhận/lưu bill để kích hoạt việc cộng lại đơn. Sửa giảm giá/phí chỉ cần thiết khi các thông số đó thực sự thay đổi.

Ở chế độ tự lưu, lựa chọn món/số lượng/ghi chú được tự gửi sau khi người dùng ngừng thao tác 700ms; ở chế độ bấm lưu, giỏ chưa submit là bản nháp riêng. Realtime chia sẻ thay đổi đã lưu thành công, không phát từng phím gõ. Nếu người khác sửa đúng đơn đang chỉnh, dừng tự lưu, báo xung đột và cho tải bản mới; không âm thầm ghi đè bản nháp hay lưu với version cũ.

Tái sử dụng bộ gom sự kiện 300ms và hàng đợi refresh hiện có; không quay lại gọi snapshot một lần cho mỗi hàng Postgres. Tự tải bản mới khi reconnect/focus. Khi mất kết nối giữ bản cuối, hiển thị trạng thái, không giả lập đã đồng bộ. Không thêm Chat cho sự kiện chỉ đọc/refresh.

## Tự động lưu theo từng người

Thêm Chế độ lưu đơn trong Cài đặt → Thông tin cá nhân, gồm Tự động lưu (mặc định) và Bấm lưu đơn. Hiển thị chế độ ngay tại giỏ. Tuỳ chọn lưu theo tài khoản ở database, dùng lại trên các thiết bị; chỉ chủ tài khoản thay đổi được. Luồng profile.save giữ tương thích khi client cũ không gửi tuỳ chọn. Cài đặt này không thay quyền đặt hộ, quyền khoá hoặc quyền tài chính.

Chế độ theo người thao tác: A bật tự lưu đặt hộ B thì dùng chế độ của A; B vẫn được thông báo realtime dù chọn bấm lưu. Đặt hộ yêu cầu chọn đúng người và điền lý do trước khi bắt đầu tự lưu; chưa đủ lý do hiển thị Chưa lưu — cần lý do, không gửi command lỗi lặp lại.

Tự lưu gom thao tác 700ms, gửi giỏ cuối cùng; mỗi đơn/người/ngày chỉ có một command đang chạy. Người dùng vẫn được chỉnh giỏ trong lúc gửi. Thành công cập nhật version ngay từ response, rồi gửi thay đổi tiếp theo nếu còn; không chờ snapshot cũ và không dùng expected version cũ. Không gửi khi giỏ không thay đổi, khi chỉ load đơn, refresh, đổi ngày/người hoặc mount component. Trạng thái rõ: Chưa lưu, Đang lưu, Đã lưu, Lưu thất bại, Xung đột, Mất kết nối.

Giảm hết số lượng về 0 sẽ tự huỷ đơn active bằng order.cancel sau debounce; giỏ rỗng chưa có đơn không gửi gì. Nút Huỷ đơn chủ động vẫn có xác nhận và dừng hàng đợi lưu trước khi huỷ. Mọi thay đổi đã lưu/huỷ giữ audit actor/subject/lý do và Google Chat outbox theo cấu hình, với idempotency cho request. Preview chỉ hiển thị dữ liệu, không tự lưu.

Chuyển ngày/người/tuần hoặc rời màn hình khi đang chờ lưu: giữ bản nháp của đúng chủ thể, hiển thị lựa chọn lưu xong rồi chuyển hoặc bỏ thay đổi. Không gửi giỏ cũ sang người/ngày mới; không mất bản nháp âm thầm. Khi đóng tab có pending, cảnh báo của trình duyệt khi được hỗ trợ; không dùng keepalive để bỏ qua version/quyền. Khi bật tự lưu với bản nháp chưa gửi, cần xác nhận lưu bản nháp đó, không tự tạo đơn bất ngờ chỉ do đổi preference.

Lỗi validation/khoá/quyết toán/xung đột dừng hàng đợi, giữ bản nháp và hướng dẫn xử lý. Lỗi mạng không báo Đã lưu, không retry vô hạn. Thử lại cùng nội dung dùng cùng request ID nếu chưa biết kết quả, để command idempotent không ghi đơn/audit/Chat trùng; thay đổi mới chỉ gửi sau khi đã xác định trạng thái của request trước. Snapshot realtime không được thay mất giỏ đang chỉnh. Không tự ghi đè đơn mà người khác vừa sửa; cho tải bản mới rồi chỉnh lại hoặc lưu lại với xác nhận và version mới.

Chế độ Bấm lưu giữ nút lưu/submit hiện tại, cùng validation/phiên bản/xung đột như tự lưu. Thanh mobile hiển thị trạng thái và nút Thử lại khi lỗi; chế độ tự lưu không bắt người dùng bấm Lưu để hoàn tất thao tác bình thường.

## Dữ liệu và quyền đọc

Cho thành viên active đọc orders chung qua RLS; chỉ mở SELECT, không mở quyền UPDATE/INSERT/DELETE trực tiếp. Command vẫn kiểm tra actor, lý do thao tác hộ, expected version, khoá và idempotency. Mở quyền đọc đơn là thay đổi có chủ đích theo yêu cầu; không mở ledger_entries, payments, destination secrets hay nội dung audit đầy đủ.

Tên roster lấy từ nguồn proxy_recipients/roster đã giới hạn tên và ID. Snapshot bổ sung phần thông tin chung tối thiểu: thông số bill, tổng/chi tiết chia và người thao tác đơn gần nhất. Metadata thao tác trả tên/ID/thời điểm và nhãn thao tác; không trả email, lý do tài chính hoặc toàn bộ before/after audit. Nếu dữ liệu cũ thiếu người thao tác, hiển thị Không có thông tin, không suy đoán.

RLS orders và bảng bill chung cho phép Realtime truyền sự kiện tới nhân viên. Audit không có quyền đọc chung: metadata người thao tác đi cùng snapshot sau sự kiện orders. Không dựa vào sự kiện audit mà nhân viên không được đọc.

## Bill dự kiến và quyết toán

Thêm bản cấu hình bill theo ngày: day_id, kiểu giảm (không giảm/số tiền/phần trăm), giá trị giảm, phí VND, danh sách được tài trợ/người tài trợ, version và thời điểm cập nhật. Mặc định không giảm, không phí, không tài trợ; chưa có bản cấu hình thì tự tính từ đơn, không yêu cầu tạo/lưu bill trước.

Tiền gốc là tổng quantity × unitPrice của đơn active. Giảm theo phần trăm làm tròn đến VND, hoặc theo số tiền. Tổng sau giảm = tiền gốc − giảm thực áp dụng + phí. Khi đơn thay đổi khiến mức giảm cố định vượt tiền gốc, giảm thực áp dụng tối đa bằng tiền gốc và giao diện hiển thị rõ mức hiệu lực; không để tổng âm.

Phần chia theo tỷ lệ tiền món, dùng cùng thuật toán private.allocate cho dự kiến và quyết toán, với phân bổ phần dư xác định để tổng các phần luôn bằng bill. Sau đó áp dụng tài trợ theo quy tắc hiện có. Nếu đơn huỷ khiến danh sách tài trợ không còn hợp lệ, hoặc không có tiền món làm trọng số nhưng bill vẫn dương, báo Cần kiểm tra bill và chặn quyết toán; không tự gán tiền sai người.

Command lưu cấu hình bill dùng version, validation, quyền tài chính, nhật ký và Chat outbox. Bản cấu hình được lưu khi người quản lý xác nhận thay đổi thông số; đơn của mọi người vẫn tự cập nhật bill dù không ai thao tác thông số này.

Quyết toán lấy cùng cấu hình và kết quả chia phía database trong transaction, không tin con số chia từ frontend. Snapshot quyết toán lưu từng ngày/đơn/tiền gốc/giảm/phí/phần chia; UI lịch sử dùng snapshot này, không tính lại từ menu mới. Công nợ chỉ ghi vào ledger khi quyết toán; bill dự kiến không tạo nợ. Kỳ cũ dùng tổng thực thu đã lưu trong settlement/ledger, không tự suy diễn toàn bộ chênh lệch là giảm giá khi thiếu chi tiết.

## Tương thích

Finance tiếp tục hiển thị công nợ/QR/thanh toán riêng. Các kiểm thử lịch sử nhân viên phải dùng bộ lọc chủ thể dù snapshot orders nay là chung. Luồng quyết toán chuyển sang cấu hình bill dùng chung, giữ khả năng đọc dữ liệu quyết toán cũ. Các command cũ không được bỏ qua số mới phía server hoặc âm thầm xoá cấu hình giảm giá; xử lý version/payload tương thích rõ ràng.

Không gửi nhắc nhở tự động cho người chưa đặt trong phạm vi này. Bảng chung hỗ trợ đồng nghiệp tự nhắc nhau; mọi gửi tin trực tiếp ngoài thông báo hệ thống phải có yêu cầu riêng.

## Kiểm chứng bắt buộc

- Hai phiên nhân viên độc lập: A đặt/sửa/huỷ/đặt hộ B; B và C thấy bảng chung, giỏ đơn B, bill và phần chia cập nhật mà không reload/lưu bill.
- Sửa giá/đổi tên/xoá menu cập nhật đơn, người chưa đặt và bill tương ứng; giữ audit/Chat và lịch sử.
- Nhân viên đọc được đơn, roster giới hạn và bill chung; không đọc nợ, chuyển khoản, email hay audit của người khác; không khoá ngày/sửa bill/quyết toán.
- Bill mặc định hoạt động không cần bản cấu hình; giá trị giảm/phí có sẵn được áp dụng lại khi số suất đổi; chia làm tròn, tài trợ và trường hợp trọng số 0 được kiểm tra.
- Tự lưu/bấm lưu lưu preference theo tài khoản; đặt hộ dùng preference người thao tác. Thao tác nhanh gom một request, sửa trong lúc request chạy không mất dữ liệu, version mới dùng ngay; giỏ về 0 huỷ đúng một lần.
- Tự lưu không chạy khi mount/load/refresh, không gửi khi thiếu lý do đặt hộ, không chạy ở preview/đã khoá/quyết toán. Đổi chủ thể/rời trang/đổi preference giữ hoặc xử lý bản nháp rõ ràng.
- Retry request không rõ kết quả không ghi audit/Chat trùng; hai người tự lưu cùng đơn có xung đột được giải quyết rõ ràng.
- Mất mạng/reconnect và burst sự kiện không tạo request storm. Bản nháp giỏ không bị thay mất khi refresh cùng version; có cảnh báo khi đơn đã thay đổi từ phiên khác.
- Lịch sử đã quyết toán giữ số chốt, mở lại có quyền và không ghi nợ trùng. Desktop/mobile không tràn ngang; nút thao tác theo quyền.
- Build, secret scan, unit/integration/browser tests, kiểm tra MIME/header live và migration rollback verification trước triển khai; không gửi Chat thử tới phòng thật.

## Ngoài phạm vi

Không phát từng phím gõ qua Realtime, không thêm chat nội bộ, không công khai công nợ tích luỹ, không đổi OAuth/hosting và không tự khoá theo ngày cũ.
