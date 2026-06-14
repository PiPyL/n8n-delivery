# US-013 NhatKy Hoa Don Assistant Story

## Status

implemented

## Lane

normal

## Product Contract

Thêm 1 sub-workflow `13_NhatKyHoaDon_Assistant` cho phép admin chat với Telegram bot để:

1. **READ** sheet `Nhật ký hóa đơn` (Google Sheet ID `1MzDQTCMIY2RdSOHwTKMM2y-BTlELIH9IuRLXE7s5lrQ`) trả lời câu hỏi về đơn hàng, khách thuê, sản phẩm VDxx, ngày thuê/trả, ...
2. **WRITE** (append) 1 row mới vào sheet `Nhật ký hóa đơn` bằng cách AI Gemini trích xuất 11 cột từ câu chat tự nhiên tiếng Việt.

Sub-workflow này được tích hợp làm tool mới trong `01_Telegram_AI_Agent` (AI Agent với Window Buffer Memory).

## Relevant Product Docs

- `docs/workflows/01_Telegram_Gateway.md`
- `docs/workflows/11_Workspace_Assistant.md`
- `workflows/01_Save_Order.json` (pattern tham chiếu)
- `workflows/01_Telegram_AI_Agent.json` (sẽ patch)
- `plans/2026-06-13-nhatky-hoadon-assistant/plan.md`

## Acceptance Criteria

1. Workflow 13 được tạo tại `workflows/13_NhatKyHoaDon_Assistant.json`, JSON hợp lệ, có 13 node theo kiến trúc đã chốt.
2. `workflows/01_Telegram_AI_Agent.json` có thêm 1 tool node `Tool: NhatKy Hoa Don` với description rõ ràng.
3. Câu hỏi READ: admin gửi "Cho tôi xem tất cả đơn của khách NGUYỄN THỊ A" → bot reply đúng các dòng khớp filter, format bảng Markdown tiếng Việt.
4. Câu hỏi READ không filter: "Tổng quan sheet này có bao nhiêu dòng?" → bot reply tổng số row + tab name.
5. Yêu cầu WRITE đủ field: "Thêm đơn: HĐ 999, SP VD28, khách LÊ VĂN E, SĐT 0912345678, thuê 20/06/2026 trả 25/06/2026" → row mới xuất hiện trong sheet, bot reply preview row vừa ghi kèm STT.
6. Yêu cầu WRITE thiếu field: "Thêm đơn khách A thuê VD01" → bot hỏi lại các field bắt buộc còn thiếu, KHÔNG ghi rác.
7. Required fields: `Số hóa đơn, Mã Sản phẩm, Tên khách, SĐT khách, Ngày thuê, Ngày trả`. Optional: `Địa chỉ, Nhân viên, Hoa hồng, E mail của KH, STT (auto-gen)`.
8. `npm run test:workflows` pass.
9. Doc `docs/workflows/13_NhatKyHoaDon_Assistant.md` có sơ đồ mermaid + mô tả từng node.
10. README được cập nhật workflow 13.

## Design Notes

- **Architecture**: 13 node theo sơ đồ plan, 2 nhánh Switch (READ/WRITE).
- **AI model**: `gemini-3.1-flash-lite` qua HTTP Request, dùng `responseMimeType: "application/json"` + `responseSchema` cho 2 prompt (intent + extract).
- **Google Sheet ID env**: `GOOGLE_SHEETS_DOCUMENT_ID` sẽ được set thành `1MzDQTCMIY2RdSOHwTKMM2y-BTlELIH9IuRLXE7s5lrQ` trong `.env.local`.
- **Sheet name**: hardcode `Nhật ký hóa đơn` trong Google Sheets node. Có thể tham số hóa sau.
- **STT auto-gen**: Gemini không tự điền STT; node `Validate` hoặc `Append` tự lấy `MAX(STT) + 1` từ Read Range trước đó.
- **Append policy**: append luôn + reply preview (không hỏi lại từng field). Trùng `Số hóa đơn` cho phép.
- **Multi-tab handling**: mặc định 1 tab, code có helper list tabs qua Drive API để mở rộng.
- **AI Agent tool description** (tiếng Việt):
  > "Đọc thông tin từ Google Sheet 'Nhật ký hóa đơn' hoặc thêm 1 dòng mới. Dùng khi user hỏi về đơn hàng, khách thuê, sản phẩm VDxx, hoặc muốn ghi nhận đơn mới. Input: {user_message, chat_id}."

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `npm run test:workflows` pass |
| Integration | `npm run n8n:execute:all` chạy clean cho workflow 13 |
| E2E | Manual test 4 case qua Telegram (READ no-filter, READ filter, WRITE đủ field, WRITE thiếu field) |
| Platform | None |
| Release | None |

## Harness Delta

- Tạo intake #20 (lane: normal, flags: External systems, Public contracts, Existing behavior).
- Tạo plan trong `plans/2026-06-13-nhatky-hoadon-assistant/`.
- Tạo workflow 13 + doc.
- Patch `01_Telegram_AI_Agent.json` thêm 1 tool.
- Cập nhật README.

## Evidence

1. **Static test**: `npm run test:workflows` → 0 fail, 48 warn (all expected - temp credentials), 63 pass (tăng 1 từ 62 sau khi thêm tool mới).

2. **Workflow structure**:
   - `workflows/13_NhatKyHoaDon_Assistant.json`: 16 nodes, 14 connections, JSON hợp lệ.
   - Pattern match với `01_Save_Order.json` (append+confirm) + `11_Workspace_Assistant.json` (Gemini intent + Switch).
   - Credentials: `temp-creds-tele` (Telegram), `gcgn9fUriMr0ZO6s` (Google Sheets OAuth2) - khớp với repo convention.

3. **AI Agent tool wired**:
   - `01_Telegram_AI_Agent.json` patch thêm node `Tool: NhatKy Hoa Don` (id: `tool-nhatky`, type: `toolWorkflow`, workflowId: `wf13nhatkyass`).
   - Connection: `Tool: NhatKy Hoa Don → AI Agent` qua `ai_tool` type (giống 8 tools hiện có).
   - Description tiếng Việt rõ ràng cho Gemini hiểu khi nào gọi.

4. **Gemini API verified live**:
   - Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`
   - Auth: header `x-goog-api-key` (verified với key thật từ `.env.local`).
   - Schema `responseMimeType: "application/json"` + `responseSchema` (flat) đã work với cả intent classification (3 field) và row extraction (10 field, 6 required).
   - Token cost: ~600-700/turn WRITE, ~500/turn READ. Chi tiết: `scratch/gemini-research.md`.

5. **Docs created**:
   - `docs/workflows/13_NhatKyHoaDon_Assistant.md` (188 dòng, có mermaid + 8 section).
   - `plans/2026-06-13-nhatky-hoadon-assistant/` (plan.md + 3 phase files).
   - `scratch/gemini-research.md` (research note + curl reproducible).
   - `README.md` updated với workflow 13.

6. **Test workflow script updated**:
   - `scripts/test-workflows.mjs` thêm `nhatky_hoadon_assistant` vào `expectedTools` array.

7. **Open items**:
   - E2E manual test 4 case cần user chạy qua Telegram bot (cần Telegram credential thật + Gemini key thật đang chạy n8n local).
   - Không thể tự verify qua CLI test vì workflow 13 là executeWorkflowTrigger (không có trigger ngoài từ AI Agent).

