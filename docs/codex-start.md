# Prompt to start in Codex

Open the cloned repo on `feat/webapp-v1`, then paste the following prompt:

```text
Tiếp quản dự án Cơm Của Nghĩa trong repository hiện tại.

Đọc AGENTS.md, docs/handoff.md, README.md và phần mới nhất trong docs/staging.md;
sau đó đọc spec/plan redesign ngày 2026-10-04 và shared overview/autosave ngày 2026-10-03.
Không cần cuộc trò chuyện cũ để bắt đầu. Kiểm tra code hiện tại khi tài liệu lịch sử mâu thuẫn.

Bắt đầu bằng kiểm tra git status/branch, tool và môi trường local; giữ mọi thay đổi đang có.
Tiếp tục latest feat/webapp-v1 / draft PR #1, không reset về baseline và không merge main.
Chạy baseline lint/format/typecheck/secret scan, unit/integration/Python/Playwright theo AGENTS.md.
Báo kết quả thực chạy và lỗi setup nếu có; không coi test fixture là live Supabase Realtime.

Giữ quy tắc đã chốt: sau17h hôm trước vẫn được sửa đến khi khóa/quyết toán;
mọi nhân viên được đặt hộ có lý do/audit; OCR preview rồi bấm submit mới gửi;
shared orders và bill realtime; không làm mất nháp, requestId/version/retry/consent.
UI dùng shadcn source + Tailwind; chưa có nhu cầu thêm Redux/TanStack Query/UI framework.

Sau baseline, kiểm tra UI local desktop/mobile và chỉ sửa lỗi đã tái hiện.
Liệt kê những gì còn cần tôi hỗ trợ để test hai tài khoản thật, bàn phím mobile và OCR/Chat thật.
Không tự dùng dữ liệu thật để thử phá hủy, gửi Chat hay deploy production.
Trao đổi bằng tiếng Việt, tiếp tục công việc local đã được yêu cầu mà không hỏi lại xác nhận thường xuyên.
```

Useful first commands (run from the repo root):

```sh
git status --short
git branch --show-current
npm ci
npx playwright install chromium
npm run lint
npm run format:check
npm run typecheck
npm run check:secrets
npm test
npm run test:integration
python3 -m unittest discover -s tests -p '*_test.py'
npm run test:e2e
npm run build
```

Use `docs/handoff.md` for setup and external verification limits. Credentials belong in environment/credential configuration, not this prompt.
