# Nhật ký Codex — CSDL Bảo tàng Hải dương học

## 2026-09-04 — Khởi tạo tích hợp Codex

- Thêm `AGENTS.md` gốc dự án để Codex tự nạp hướng dẫn bền vững.
- Chuyển context không nhạy cảm từ `Memory.md` và `.agents/memory/` thành `.codex/PROJECT_CONTEXT.md` và `.codex/SESSION_STATE.md`.
- Giữ `.agents/` nguyên trạng, vì đây là kho lịch sử cũ đang bị Git ignore; Codex dùng các tệp `.codex/` đã được theo dõi từ đây về sau.
- Không sao chép mật khẩu, token, secret hoặc nội dung `.env.admin.local`.
