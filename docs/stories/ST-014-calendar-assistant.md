# US-014 Calendar Assistant Story

## Status

implemented

## Lane

normal

## Product Contract

Thêm 1 sub-workflow `14_Calendar_Assistant` cho phép admin chat với Telegram bot bằng tiếng Việt tự nhiên để:

1. **CREATE** — Tạo sự kiện mới trên Google Calendar `primary` (validate `title`, `start`, `end` theo ISO 8601 +07:00).
2. **READ** — Liệt kê sự kiện trong khoảng thời gian (mặc định 7 ngày tới).
3. **DELETE** — Tìm và xóa sự kiện theo `title` + khoảng thời gian.

Sub-workflow này được tích hợp làm tool mới trong `01_Telegram_AI_Agent` (AI Agent với Window Buffer Memory).

## Relevant Product Docs

- `docs/workflows/01_Telegram_Gateway.md`
- `docs/workflows/13_NhatKyHoaDon_Assistant.md` (pattern tham chiếu)
- `workflows/13_NhatKyHoaDon_Assistant.json` (pattern copy y nguyên cho Extract Input + If Empty)
- `workflows/01_Telegram_AI_Agent.json` (sẽ patch)
- `plans/2026-06-13-calendar-assistant/plan.md`
- `scratch/calendar-research.md` (research note về `n8n-nodes-base.googleCalendar`)

## Acceptance Criteria

1. Workflow 14 được tạo tại `workflows/14_Calendar_Assistant.json`, JSON hợp lệ, có 23 node theo kiến trúc đã chốt.
2. `workflows/01_Telegram_AI_Agent.json` có thêm 1 tool node `Tool: Calendar Assistant` với description tiếng Việt rõ ràng.
3. System message của AI Agent có thêm 1 dòng mô tả Calendar capability.
4. CREATE case 1 - đủ field: "Đặt lịch họp team từ 10h đến 11h sáng mai, tại phòng họp A" → event xuất hiện trên Google Calendar `primary`, bot reply preview với link.
5. CREATE case 2 - thiếu field: "Đặt lịch họp nhóm" → bot hỏi lại `title`, `start`, `end`, KHÔNG tạo event rác.
6. READ case: "Tuần này có những lịch hẹn nào?" → bot trả về danh sách event trong 7 ngày tới, format bảng Markdown.
7. READ filter: "Lịch họp team tháng này" → bot chỉ liệt kê event match keyword.
8. DELETE case 1 - 1 match: "Hủy lịch họp team lúc 10h sáng mai" → nếu 1 event match, bot confirm.
9. DELETE case 2 - 0 match: "Hủy lịch XYZ" → bot reply "Không tìm thấy sự kiện nào khớp".
10. `npm run test:workflows` pass, `expectedTools` array có `calendar_assistant`.
11. Doc `docs/workflows/14_Calendar_Assistant.md` có sơ đồ mermaid + mô tả từng node.
12. README được cập nhật workflow 14.
13. `config/workflow-capabilities.json` có intent `LỊCH_HẸN`.

## Design Notes

- **Architecture**: 23 node theo sơ đồ plan, 3 nhánh Switch (CREATE/READ/DELETE).
- **AI model**: `gemini-3.1-flash-lite` qua HTTP Request, dùng `responseMimeType: "application/json"` + `responseSchema` 8 field cho intent classifier.
- **Google Calendar node**: `n8n-nodes-base.googleCalendar` built-in (KHÔNG cần community node). 3 operation: `create`, `getAll` x2 (cho READ và DELETE search).
- **Calendar ID**: hardcode `primary` (admin's own calendar). Phase 2 có thể tham số hóa.
- **Timezone**: `Asia/Ho_Chi_Minh` (+07:00) mặc định. Code node `Parse Intent + Guards` có helper `ensureTimezone()` auto-add `+07:00` nếu Gemini output thiếu.
- **Credential mới**: `googleCalendarOAuth2Api` cần user tạo trong n8n UI với scope `calendar.events` (full access).
- **Fail-closed**: 2 Validate Code node (CREATE + DELETE) check required field, trả `{valid: false, missing: [...]}` → bot hỏi lại.
- **Multi-step dialog** (xóa trong nhiều match): YAGNI. Phase 2 có thể thêm state machine.
- **AI Agent tool description** (tiếng Việt):
  > "Tạo, xem hoặc hủy lịch hẹn trên Google Calendar của admin. Dùng khi user nói về lịch hẹn, cuộc họp, sự kiện, reminder theo giờ, hỏi 'tuần này có gì', 'mai có lịch gì', 'hủy lịch X'. Input: {user_message, chat_id}."

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `npm run test:workflows` pass với `calendar_assistant` trong `expectedTools` |
| Integration | `npm run n8n:execute:all` chạy workflow 14 (warn OK vì credential chưa thật) |
| E2E | Manual test 6 case qua Telegram (CREATE đủ/thiếu, READ có/không filter, DELETE có/không match) |
| Static | JSON validate, node/connection integrity, system message update |
| Story | `./scripts/bin/harness-cli story verify ST-014` |

## Harness Delta

- Tạo intake #22 (lane: normal, flags: External systems, Weak proof).
- Tạo plan trong `plans/2026-06-13-calendar-assistant/`.
- Tạo workflow 14 + doc.
- Patch `01_Telegram_AI_Agent.json` thêm 1 tool node.
- Patch `scripts/test-workflows.mjs` expectedTools.
- Patch `config/workflow-capabilities.json` thêm intent LỊCH_HẸN.
- Cập nhật README.

## Evidence

1. **Static test**: `npm run test:workflows` → kỳ vọng 0 fail, pass count tăng 1 (63 → 64).

2. **Workflow structure**:
   - `workflows/14_Calendar_Assistant.json`: 23 nodes, 18 connection groups, JSON hợp lệ.
   - Pattern match với `13_NhatKyHoaDon_Assistant.json` (Extract Input + If Empty Input + Send Empty).
   - Mở rộng Switch thành 3 outputs (CREATE/READ/DELETE).
   - 3 Google Calendar node (1 create + 2 getAll) đều có `calendar: primary` explicit.

3. **AI Agent tool wired**:
   - `01_Telegram_AI_Agent.json` patch thêm node `tool-calendar` (id: `tool-calendar`, type: `toolWorkflow`, workflowId: `wf14calendar`).
   - Connection: `Tool: Calendar Assistant → AI Agent` qua `ai_tool` type (khớp với 9 tools hiện có).
   - System message thêm 1 dòng về Calendar capability.
   - Description tiếng Việt rõ ràng cho Gemini hiểu khi nào gọi.

4. **Research verified với ground truth**:
   - Đọc trực tiếp `node_modules/n8n-nodes-base/dist/nodes/Google/Calendar/EventDescription.js` để verify schema.
   - 5 operations confirmed: `create`, `delete`, `get`, `getAll`, `update` (chỉ dùng 3 đầu).
   - `calendar` field type `resourceLocator` với `mode: 'id'` + `value: 'primary'`.
   - Research note: `scratch/calendar-research.md` (179 dòng, 10 sections).

5. **Docs created**:
   - `docs/workflows/14_Calendar_Assistant.md` (252 dòng, có mermaid + 8 sections).
   - `plans/2026-06-13-calendar-assistant/plan.md` + 3 phase files.
   - `scratch/calendar-research.md` (research note + ground truth).
   - `README.md` updated với workflow 14.

6. **Test workflow script updated**:
   - `scripts/test-workflows.mjs` thêm `calendar_assistant` vào `expectedTools` array.

7. **Config updated**:
   - `config/workflow-capabilities.json` thêm intent `LỊCH_HẸN` với examples + disambiguation rules.

8. **Open items**:
   - E2E manual test 6 case cần user chạy qua Telegram bot (cần Telegram credential thật + Gemini key thật + Google Calendar OAuth2 mới).
   - User cần tự tạo Google Calendar OAuth2 credential trong n8n UI (scope `calendar.events`).
   - Không thể tự verify E2E qua CLI vì workflow 14 là `executeWorkflowTrigger` (không có trigger ngoài từ AI Agent).
