# Thiết kế lại UI/UX Cơm Của Nghĩa

Ngày: 2026-10-04 (Việt Nam). Trạng thái: user đã duyệt thiết kế ngày 2026-10-04; kế hoạch triển khai chờ duyệt.

## Mục tiêu và phạm vi

Người dùng chọn tái thiết kế toàn bộ UI/UX bằng shadcn/ui + Tailwind.
Mục tiêu là đặt cơm nhanh, kiểm tra đơn của đồng nghiệp dễ như sheet, đặt hộ ít nhầm,
và quản trị menu/bill rõ ràng trên desktop lẫn mobile. Không chỉ thay màu và nút.

Chuyển toàn bộ shell, đăng nhập/xem thử và sáu route hiện có: Đặt cơm, Quản lý menu,
Tổng hợp đơn, Công nợ, Nhật ký, Cài đặt; bao gồm công cụ import trong Cài đặt.
Giữ URL và deep link hiện tại để thông báo Chat và điều hướng lịch sử tiếp tục hoạt động.
Giai đoạn này không bổ sung Redux, TanStack Query, thay schema/RLS, endpoint hay thuật toán chia tiền.

## Hướng thiết kế đã chọn

Một hệ giao diện thống nhất, tông trung tính sáng, xanh lá làm màu hành động chính.
Giữ tên Cơm Của Nghĩa, icon Lucide, ngôn ngữ Việt Nam và tiền VND.
Không dùng ảnh minh hoạ món ăn hoặc khối trang trí lớn. Định dạng ngày và giờ theo Việt Nam.
Màu đỏ dành cho lỗi, huỷ và thao tác xoá; trạng thái luôn có nhãn chữ bên cạnh màu.

Hai hướng khác đã cân nhắc: chỉ phủ theme lên CSS cũ ít công nhưng không giải quyết bố cục;
đổi cả giao diện và tầng dữ liệu cùng lúc tăng phạm vi và khó xác định hồi quy.
Chọn thay giao diện theo từng màn hình trên nền shadcn/ui + Tailwind, giữ tầng nghiệp vụ.

## Nền component và style

Dùng Tailwind v4 tích hợp build Vite và mã component shadcn/ui lưu trong repo.
Chọn nhất quán bộ primitive Radix cho component hỗ trợ; dùng pattern Command + Popover
cho tìm người, kiểm tra registry/version trước cài để tránh trộn API từ các bộ primitive.
Thêm components.json, alias @, helper cn, theme token màu/font/spacing/radius và dependency
thực sự được component sử dụng. Ghim phiên bản tương thích React/Vite hiện tại.

Component dùng chung: Button, Input, Textarea, Label, Checkbox, Switch, Badge, Card,
Table, Tabs, Separator, Select, Dialog/AlertDialog, Sheet, Popover/Command, Skeleton.
Chỉ thêm component dùng trong màn hình đã chuyển, không cài toàn bộ registry.
Wrapper nghiệp vụ dành cho WeekPicker, RecipientPicker, SaveStatus và BillSummary.
Các wrapper giữ API phù hợp logic cũ; ConfirmDialog bảo toàn busy/Escape/focus restoration.

Chuyển style của từng màn hình sang token/utilities; CSS cũ chỉ tồn tại trong thời gian
chuyển đổi và được bỏ khi không còn người dùng. Không duy trì hai hệ button/form/layout
trong sản phẩm cuối. Không đưa chi tiết kỹ thuật thư viện vào UI.

## Shell và điều hướng

Desktop: sidebar gọn với sáu mục theo quyền, header có tên trang, trạng thái kết nối,
refresh và tài khoản. Bỏ khối quảng bá/trang trí để dành chỗ cho công việc.
Mobile: header gọn và menu Sheet với đủ route; ngày/tuần và thao tác chính nằm trong nội dung.
Không thêm route giả hay mục chưa có chức năng. Bản xem thử có nhãn chỉ xem rõ ràng.
Đăng nhập Google công ty và lỗi đăng nhập có trạng thái tải, lỗi và thao tác thử lại.

## Đặt cơm

Phần đầu: chọn tuần có khoảng ngày, ngày trong tuần, trạng thái mở/khoá và chọn người nhận.
RecipientPicker tìm theo tên, mặc định bản thân; đặt hộ hiện tên người nhận nổi bật và ô lý do.
Đổi người/ngày/tuần vẫn đi qua guard bản nháp. Không đọc/hiển thị email riêng ngoài quyền hiện có.

Desktop: cột menu dạng list gọn với tên, giá và nút tăng/giảm; cột giỏ cơm sticky với
số lượng, ghi chú, tổng tiền, chế độ lưu và trạng thái lưu. Mỗi món có hit target rõ ràng.
Mobile: list toàn chiều rộng; thanh giỏ cơm cố định phía dưới hiện số suất, tổng,
trạng thái lưu và thao tác cần thiết. Nút Xem đơn mở vùng giỏ bằng Sheet;
Retry và trạng thái lỗi không bị giấu trong vùng cuộn. Chừa khoảng cuối trang và safe area.

Giữ hai chế độ autosave/manual. Manual có nút Gửi đơn; autosave hiện Chờ lưu/Đang lưu/Đã lưu.
Khi mất kết nối hoặc conflict, giữ giỏ và thông báo; không coi cập nhật lạc quan là lưu thành công.
Người dùng được sửa sau 17h hôm trước; chỉ khoá thủ công hoặc tuần đã quyết toán mới chặn.

Tổng quan đồng nghiệp và bill được đặt sau khu vực chọn món, có tab rõ ràng giữa
Đơn mọi người và Bill & chia tiền. Tab chỉ điều khiển trình bày, không thay quyền.

## Tổng hợp đơn và bill

Chọn tuần/ngày thống nhất với Đặt cơm. Tổng số người đã đặt/chưa đặt, số suất và tổng bill
hiển thị gọn. Danh sách gửi quán có thao tác sao chép và thông báo lỗi rõ ràng.
Bảng đồng nghiệp: tìm tên, lọc Tất cả/Đã đặt/Chưa đặt/Đã huỷ, tên người nhận,
món/ghi chú, tiền món/phần chia, người thao tác gần nhất và Đặt/chỉnh hộ.
Desktop dùng bảng; mobile trình bày hàng dạng thẻ gọn với cùng nội dung, tránh cuộn ngang
cả trang. Trạng thái realtime và dữ liệu đang tải không làm mất bộ lọc.

Bill: phân biệt tiền món, giảm giá, phí, tài trợ và tổng sau điều chỉnh.
Người có quyền thấy form sửa bill và quyết toán; nhân viên thấy số tiền/phần chia được phép.
Nêu rõ bản tạm tính hay đã quyết toán. Xác nhận quyết toán/huỷ quyết toán bằng modal.

## Quản lý menu và OCR

Luồng ba bước trong cùng màn hình: Chọn tuần và ảnh → Đọc/soát bản nháp → Công bố.
Kéo thả, chọn file và Ctrl+V tạo preview ngay; chỉ nút Đọc menu gửi OCR.
Ảnh và nháp được giữ khi lỗi. Khi OCR chạy, khoá các điều khiển đổi tuần liên quan.
Preview ảnh không lấn hết màn hình mobile. Kết quả theo ngày là list món sửa tên/giá.

Menu đã công bố, bản nháp đã lưu và bản nháp đang sửa phân biệt rõ.
Chọn tuần luôn hiện khoảng ngày; cuối tuần mặc định tuần sau như logic hiện có.
Checkbox xoá các đơn toàn tuần khi ghi đè mặc định tắt và có cảnh báo số đơn bị ảnh hưởng.
Đổi tên/bỏ món huỷ phần đặt liên quan; đổi giá cập nhật đơn, mọi thay đổi có Chat như hiện có.
Gỡ menu và các xác nhận phá huỷ mở modal, không yêu cầu cuộn xuống để xác nhận.

## Công nợ, Nhật ký và Cài đặt

Công nợ: giữ tổng nợ toàn cục và lịch sử tuần phân biệt, bảng số tiền căn phải,
chi tiết/QR thanh toán và form ghi nhận thanh toán chỉ theo quyền hiện có.
Không diễn giải dữ liệu import thiếu chi tiết ngày thành số tiền 0.

Nhật ký: bảng thời gian, người thao tác và nội dung hiện có; đọc tốt trên mobile,
không công khai audit quản trị cho nhân viên. Không tạo bộ lọc giả chưa có dữ liệu hỗ trợ.

Cài đặt chia nhóm: Cá nhân (tên/chế độ lưu), Vận hành, Tích hợp Chat,
Thành viên & quyền, Import dữ liệu. Nhóm quản trị chỉ xuất hiện theo quyền hiện tại.
Webhook là input bí mật, không hiển thị lại. Form có nhãn, trạng thái lưu và lỗi rõ ràng.
Setting autosave theo người thao tác, giữ consent khi đổi chế độ từ phiên khác.

## Trạng thái, accessibility và bảo toàn nghiệp vụ

Loading ban đầu dùng Skeleton; refresh nền giữ nội dung cũ với trạng thái nhỏ.
Empty state nêu hành động phù hợp quyền. Lỗi actionable hiển thị inline;
thông báo thành công ngắn, không che nội dung hoặc phụ thuộc riêng toast.
Keyboard: tab theo thứ tự, focus-visible, modal có tên và focus restoration,
không đóng modal đang thực hiện thao tác bằng Escape. Screen reader nhận aria-live trạng thái lưu.

Bảo toàn hàng đợi autosave serial, requestId idempotent, expectedVersion,
retry request bất định, conflict giữ nháp và guard route/day/week/recipient/Back/logout.
Realtime vẫn dùng createRefresh gom sự kiện 300ms, một request in-flight, trailing refresh,
fallback poll 60s và focus/reconnect hiện có. Không reset lý do đặt hộ hoặc form đang sửa
khi snapshot cập nhật. Khoá/quyền là server authoritative.

## Kiểm chứng và rollout

Kiểm tra trước cài: registry component và peer compatibility; sau cài chạy npm ci,
lint, format, typecheck, unit/integration/Python tests và configured build.
Cập nhật Playwright theo semantics hành động mới, không chỉ đổi selector để bỏ kiểm tra.
Bảo toàn các kịch bản proxy, realtime, OCR, historical week, bill allocation,
autosave uncertain/conflict, consent, busy modal, navigation guard và focus.

QA trực quan các route với dữ liệu mẫu desktop 1440px và mobile 390px/320px;
không tràn ngang toàn trang, không che thao tác bằng thanh cố định, nút chạm ít nhất 44px
ở thao tác chính trên mobile, form và bảng đọc được bằng bàn phím.
Review độc lập trước triển khai. Sau hoàn tất chuyển cả sáu màn hình, deploy staging,
kiểm tra HTML/JS/CSS đúng MIME và build, health/auth, bảo toàn env/secret/compatibility flags.
Cập nhật draft PR, không merge main. Không gửi thử thông báo Google Chat thật.

## Tiêu chí nghiệm thu

- Toàn bộ route dùng cùng hệ shadcn/ui + Tailwind và theme token.
- Menu dạng list không ảnh minh hoạ; đặt hộ dễ tìm và luôn biết người nhận.
- Mobile thấy trạng thái lưu/Retry và mở giỏ mà không tìm trong vùng cuộn.
- Tổng quan mọi người, bill/chia tiền và lịch sử vẫn đầy đủ theo quyền.
- OCR, chọn tuần, xác nhận xoá và form setting dễ thao tác hơn.
- Các test nghiệp vụ đang có tiếp tục qua; QA keyboard/mobile/desktop đạt yêu cầu.
