# Đánh giá UI/UX — 2026-10-04

Giao diện hiện tại có nền tảng tốt để tiếp tục dùng: shadcn/Tailwind nhất quán,
danh sách món gọn, desktop có giỏ bên cạnh, mobile dùng một giỏ trong Sheet.
Nên cải thiện một số điểm về thao tác và mật độ thông tin; chưa thấy lý do để
thay hệ thống giao diện hoặc làm lại toàn bộ thiết kế.

Đánh giá trên commit ứng dụng `ec813a13138ac9b3a36f3b4bf1b3790fb0a8f74f`,
sau khi push và deploy staging. Áp dụng skill `ui-ux-pro-max` tại
`C:/Users/nghia/.agents/skills/ui-ux-pro-max/SKILL.md`: checklist web và tìm kiếm
tập trung về touch target, keyboard focus, reduced motion. Giữ thiết kế đã duyệt
và các hợp đồng nghiệp vụ hiện tại.

## Phạm vi và bằng chứng

- Chụp lại 35 trạng thái local ở 320/390/1440px: đăng nhập, sáu route, đặt hộ,
  giỏ, nháp bill và OCR preview/lỗi. Không có tràn ngang hoặc JavaScript page error.
- Xem ảnh đại diện desktop/mobile và đối chiếu code; đo DOM/computed style bằng
  Chromium. Kiểm tra picker bằng bàn phím, Escape trả focus về nút mở giỏ,
  giữ ghi chú khi mở lại giỏ, giữ nháp bill khi fixture cập nhật từ phiên khác.
- OCR fixture: ảnh hiện trước khi submit, không gửi khi vừa chọn; ảnh còn sau lỗi.
- Trên staging thực, trang đăng nhập ở 390px render được, không có page error.
  Chỉ kiểm tra trang công khai; chưa đăng nhập hoặc thay đổi dữ liệu thật.
- Bằng chứng local nằm trong thư mục ignored `.superpowers/local-qa/`:
  `results.json`, `ux-measurements.json` và ảnh chụp. Đây là fixture, không phải
  bằng chứng hai tài khoản thật nhận Supabase Realtime.

## Những điểm nên cải thiện

P1 là cải thiện nên làm trước trong đợt UI tiếp theo; P2 là tối ưu sau đó.
Các mục dưới đây là đề xuất, chưa được triển khai trong lần đánh giá này.

| Ưu tiên | Phát hiện và bằng chứng                                                                                                                                                                                               | Hướng cải thiện                                                                                                                                                                                                | Vị trí                                                   |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| P1      | Nút X của Sheet chỉ 16×16 CSS px ở 320/390px; tên truy cập là tiếng Anh `Close`. Khó chạm chính xác trên mobile.                                                                                                      | Mở vùng bấm thành 44×44px, giữ icon nhỏ và đổi tên thành `Đóng`; bảo đảm không đè tiêu đề và không ảnh hưởng busy guard/focus restore.                                                                         | `src/components/ui/sheet.tsx:77`                         |
| P1      | Khi bật `prefers-reduced-motion: reduce`, Sheet vẫn có animation `enter`, duration và transition 0,5s.                                                                                                                | Bổ sung `motion-reduce` cho Sheet/overlay và kiểm tra dialog/popover cùng nhóm; giữ trình tự mở/đóng và focus.                                                                                                 | `src/components/ui/sheet.tsx:35`, `:62`                  |
| P1      | Tab Cá nhân của quản trị đồng thời hiển thị `Lưu hồ sơ` và `Lưu cài đặt hệ thống`; nút thứ hai nằm ngoài nội dung tab. Có thể nhầm nút lưu cho dữ liệu vừa chỉnh.                                                     | Đặt nút lưu hệ thống cạnh các trường hệ thống, hiển thị rõ phạm vi/thay đổi cần lưu; giữ riêng lưu hồ sơ và consent của cách lưu đơn.                                                                          | `src/features/Settings.tsx:353`                          |
| P1      | Trang Công nợ mẫu dài 8.015px ở 320px và 7.780px ở 390px. Cả năm cấu hình bill đều mở; nút quyết toán nằm ở y≈6.980/6.824px khi trang ở đầu.                                                                          | Tóm tắt từng ngày, mở cấu hình theo nhu cầu; giữ trạng thái nháp khi thu gọn, original expected version và cảnh báo xung đột. Đưa tổng quan tuần gần hành động quyết toán, vẫn giữ xác nhận và điều kiện khóa. | `src/features/Finance.tsx:234`                           |
| P2      | Trong fixture đặt cơm không có banner preview, đầu danh sách món ở y≈647px tại 320px và 623px tại 390px (viewport cao 900px). Tuần hiện cả trong select lẫn dòng bên dưới; nhóm điều hướng tuần/ngày dùng nhiều hàng. | Gọn nhóm chọn tuần/ngày, bỏ thông tin lặp; giữ 44px cho thao tác chính, người nhận/lý do đặt hộ luôn rõ và dirty guard khi đổi ngày/tuần.                                                                      | `src/features/WeekPicker.tsx`, `src/features/Orders.tsx` |
| P2      | BillEditor dùng Card nhưng các trường và nút sát cạnh ngang trong ảnh Summary/mobile. Nhịp padding khác các panel còn lại.                                                                                            | Thêm padding ngang thống nhất và nhóm trường rõ hơn; không sửa cách tính/phân bổ bill.                                                                                                                         | `src/features/BillEditor.tsx:57`                         |

Nút X nhỏ là vấn đề sử dụng đã đo được, chưa tự kết luận vi phạm WCAG AA:
[WCAG 2.2 Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
có ngưỡng 24 CSS px cùng ngoại lệ khoảng cách. Đề xuất 44px nhằm dễ chạm và
nhất quán với thao tác mobile của dự án. Reduced motion là cải thiện accessibility;
[Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
là tiêu chí AAA, không nên trình bày như lỗi AA đã được chứng nhận.

## Những điểm đang tốt và cần giữ

- Các nút chính/điều hướng và trường đã đo cao ít nhất 44px; tab Cài đặt đã wrap
  đúng trong thanh tab và không chồng nội dung ở cả ba kích thước.
- Token màu chính `#17634a` trên trắng có tương phản khoảng 7,19:1. Chữ muted
  `#61716a` đạt khoảng 5,15:1 trên trắng và 4,68–4,83:1 trên các nền secondary/muted.
  Đây là đo token, chưa phải audit tất cả trạng thái màu hoặc chứng nhận accessibility.
- Tên món/giá/quantity rõ, không cần thêm hình món trang trí. Preview có nhãn chỉ xem;
  OCR tách chọn ảnh, xem trước và gửi; báo lỗi giữ nội dung đang nhập.
- Giỏ mobile và desktop dùng chung controller. Không đổi sang hai nguồn draft hoặc
  thêm thư viện state/data fetching chỉ để chỉnh trình bày.
- Các regression hiện đạt: 52 unit, 34 integration, 3 Python, 56 Playwright.

## Cần kiểm tra tiếp trên thiết bị và tài khoản thật

- NativeSelect mobile hiện 14px; input thông thường đo được 16px. Cần iOS Safari
  thật để kiểm tra zoom/focus, bàn phím mềm, safe area và nút lưu/Retry. Chưa kết luận
  có lỗi bàn phím chỉ từ Chromium desktop. Kiểm tra thêm landscape, zoom 200% và screen reader.
- Cần hai tài khoản công ty active, dữ liệu staging dùng riêng và kịch bản được thống nhất
  để kiểm tra Realtime, đặt hộ, conflict, nháp và reconnect. Không dùng đơn thật để phá hủy thử.
- Cần ảnh menu được phép gửi OCR, tuần đích và phòng/nội dung Chat được phép trước khi
  kiểm tra luồng tích hợp thật. Lần này không gọi OCR thật hoặc gửi Chat.
- Build JS là 830.190 bytes, gzip khoảng 248KB; có thể cân nhắc lazy-load các route quản trị.
  Đây là số đo bundle, chưa đo Core Web Vitals trên thiết bị/mạng thật.

Thứ tự đề xuất: nút đóng và reduced motion → phạm vi nút lưu Cài đặt → thu gọn
bill theo ngày với bảo toàn nháp → gọn phần chọn tuần/ngày và padding bill.

## Styling đã duyệt và triển khai — 2026-10-04

Sau phần đánh giá trên, người dùng duyệt sáu cải thiện styling: spacing/padding,
chiều cao card thực đơn desktop, phân cấp nút quantity/lưu, roster mobile gọn,
tổng tiền nổi bật và lưới tab Cài đặt. Commit ứng dụng `cff86ee` đã push và deploy
staging. Các phát hiện UX khác phía trên vẫn là đề xuất riêng.

| Chi tiết                                     | Trước    | Sau                        |
| -------------------------------------------- | -------- | -------------------------- |
| Khoảng cách tiêu đề roster → bộ lọc          | 52px     | 16px                       |
| Khoảng cách bộ lọc → bảng                    | 36px     | 16px                       |
| Tiêu đề bill → số liệu                       | 56px     | 16px                       |
| Lề ngang form bill, tính cả border 1px       | 1px      | 17px mobile / 21px desktop |
| Khoảng trống dưới món cuối ở desktop         | 106,25px | 21px padding/border        |
| Card người chưa đặt trên mobile, dữ liệu mẫu | 365,81px | 70px                       |

Nút quantity dùng outline và giữ 44×44px; nút lưu giữ màu primary. Tổng bill có
nền xanh nhạt, chữ lớn hơn, các số liệu chính dùng tabular numerals. Tab quản trị
mobile dùng hai cột, Import trải cả hàng; nhân viên dùng một cột.

Roster mobile gom tên/trạng thái cạnh thao tác; món/ghi chú, tiền chia và người
thao tác tiếp tục hiển thị. Chỉ bỏ các ô rỗng của người chưa đặt. Mọi share có trong
snapshot, kể cả 0, vẫn được giữ. Regression bổ sung đã thất bại do share bị ẩn rồi
đạt sau sửa selector. Fixture này là projection tổng hợp để bảo vệ hiển thị, không
khẳng định allocator backend hỗ trợ sponsor chưa đặt cơm.

Kiểm chứng: 52 unit, 34 integration, 3 Python, 57 Playwright đạt; lint, format,
typecheck, secret scan, build và dry-run đạt. Review độc lập cuối không còn vấn đề.
35 trạng thái local ở 320/390/1440px không tràn ngang/page error; kiểm tra thêm
tên/ghi chú dài, đơn hủy, tiền chia, nháp bill và phím ArrowRight/End trong tab.
Ảnh/số đo mới ở ignored `.superpowers/style-qa/`.

## Thu gọn đặt cơm theo phản hồi — 2026-10-04

Đã triển khai yêu cầu tiếp theo ở commit `95fa37e`: gom điều hướng tuần, bỏ
thông tin ngày tuần lặp, đưa người nhận vào toolbar desktop, chỉ hiện ô lý do
khi đặt hộ, thu gọn đầu trang/danh sách/giỏ và bỏ selector cách lưu khỏi từng đơn.
Cách lưu chỉ chỉnh trong Cài đặt cá nhân; trạng thái lưu, consent và nháp giữ nguyên.
Mục P2 về phần chọn tuần/ngày ở bảng đánh giá ban đầu đã được xử lý.

Tại 1440×800 với AppShell, năm món và hai món cũ trong giỏ, đáy danh sách món
y=653px và đáy nút lưu y=746,25px nằm trong khung nhìn đầu. Mobile có năm ngày
trên một hàng và thao tác giỏ cố định; ô ngày tuần trống và refresh header đăng nhập
được sửa sau khi tái hiện lỗi ở 320px. Không tràn ngang tại 320/390/1440px.
35 trạng thái local và preview staging đạt; 62 Playwright cùng baseline còn lại
đạt. Chi tiết release và giới hạn kiểm chứng ở mục mới nhất trong
[staging](staging.md#thu-gọn-màn-hình-đặt-cơm-và-cài-đặt-cách-lưu--2026-10-04).

## Review bổ sung đã xử lý — 2026-10-04

Đối chiếu review agent khác, đã sửa mục P1 về phạm vi nút lưu Cài đặt ở commit
`532a6ef`: nút lưu hệ thống chỉ hiện ở Vận hành/Google Chat; Cá nhân chỉ có
Lưu hồ sơ. Giữ payload/expected version và cfg chung giữa hai tab. Đây là lỗi
có thể khiến lựa chọn cá nhân chưa lưu mất khi Settings dựng lại theo version.

Lý do đặt hộ chuyển ngay dưới người nhận trước dãy ngày. Bảng shared mobile dùng
semantic `data-cell`, giữ đúng layout và phần chia khi đổi thứ tự cột. Fixture
autosave bỏ `any`. Năm regression bổ sung và 67 Playwright toàn bộ đạt, cùng
baseline khác. 18 trạng thái local và năm tab preview staging tại 320/390/1440px
không tràn ngang/page error; các phát hiện còn lại chưa triển khai vẫn như trên.
Xem bằng chứng release tại mục mới nhất trong [staging](staging.md).

## Styling sáng/tối theo thiết bị đã triển khai — 2026-10-04

Người dùng chọn đề xuất xanh lá đậm, nền sáng ấm và nền tối màu than xanh.
Commit `f0ddabf` cập nhật semantic tokens, sidebar, phân cấp chữ/card, shadow
nhẹ, số món và tổng tiền; giữ bố cục đặt cơm gọn cùng shadcn/Tailwind hiện có.
Không thêm ảnh món, framework hoặc thay đổi nghiệp vụ.

Nút header và Cài đặt → Cá nhân → Giao diện có `Theo thiết bị` (mặc định),
`Sáng`, `Tối`. Lựa chọn áp dụng ngay và lưu trên trình duyệt; chế độ thiết bị
theo OS khi thay đổi, cả trước khi React tải. Đổi theme không ghi hồ sơ/đơn,
không dựng lại controller và không làm mất nháp; đồng bộ giữa các tab.

Mục P1 về vùng bấm đóng Sheet và reduced motion đã xử lý: đóng 44×44px,
nhãn tiếng Việt, giảm animation/transition theo thiết bị. NativeSelect mobile
đổi từ 14px sang 16px; kiểm tra bàn phím/zoom Safari thật vẫn cần thực hiện.
Review tái hiện theme trigger cao 36px do PopoverTrigger đổi data-slot;
đã sửa lên 44px trực tiếp và kiểm tra regression tại 320px. Đo 28 cặp token
chữ/nền cho hai chế độ đạt tối thiểu 4,63:1, không khẳng định audit toàn UI.

Baseline đạt: 52 unit, 34 integration, 3 Python, 71 Playwright, cùng lint,
format, typecheck, secret scan, configured build và Worker dry-run. Local
kiểm tra 70 trạng thái sáng/tối tại 320/390/1440px không tràn ngang/page error;
picker bàn phím, focus/nháp giỏ, nháp bill và OCR preview/lỗi bằng fixture đạt.
Fixture desktop 1440×800 giữ đáy danh sách món 653px và nút lưu 746,25px.
Preview staging kiểm tra sáu màn hình và năm tab Cài đặt ở cả hai chế độ,
cả ba kích thước, default theo OS/override/reload và vùng bấm 44px đều đạt.

Build JS 833.982 bytes (gzip 249,92KB), cảnh báo chunk và hai high Playwright
vẫn còn. Thu gọn cấu hình bill theo ngày ở trang Công nợ vẫn là đề xuất riêng;
đợt này không đổi hành vi form/nháp bill. Hai tài khoản Realtime thật, bàn phím
mobile và OCR/Chat thật chưa được kiểm chứng. Xem release tại mục mới nhất
trong [staging](staging.md).

## Select mở ra ở chế độ tối đã sửa — 2026-10-04

Phản hồi ảnh người dùng và Chromium local xác nhận popup native select có chữ
sáng trên nền xám nhạt. Đã đặt nền đặc/chữ theo token cho mọi option/optgroup
ở commit `6a931fa`, giữ native select và thao tác bàn phím. Popup dark hiện có
chữ #e9f1e9 trên nền #19271f; popup light có chữ #20352b trên nền #fffefa.
Tương phản chữ/nền lần lượt 13,49:1 và 12,96:1. Không khẳng định audit toàn UI
hay kiểm chứng native picker trên Safari thật.

Regression đã RED rồi GREEN; toàn bộ 72 Playwright và baseline khác đạt.
Preview staging kiểm tra popup mở/đóng bằng bàn phím, giữ focus và không tràn
ngang ở cả sáng/tối × 320/390/1440px. Chi tiết tại mục mới nhất trong
[staging](staging.md).
