# US-014b Simplify Calendar Assistant (CREATE-only)

## Status

implemented

## Lane

normal

## Product Contract

Thu hẹp scope của `14_Calendar_Assistant` chỉ còn **CREATE** event, loại bỏ READ/DELETE branches.
Workflow phải đơn giản, dễ maintain, dễ debug, fail-closed khi thiếu field.

## Background

Sau khi xem execution log #480 và review workflow hiện tại (23 nodes, 3 actions), nhận thấy:

- YAGNI: READ/DELETE chưa có use case thực tế (admin dùng Google Calendar UI)
- Complexity không tạo value: 23 nodes cho 1 task đơn giản (tạo event)
- Gemini Intent Classifier tốn 1 round-trip thừa (chỉ cần parse fields, không cần classify action)
- 3 nhánh Switch + 2 Validate code nodes là overkill

## Relevant Product Docs

- `workflows/14_Calendar_Assistant.json` (đã đơn giản hóa)
- `workflows/01_Telegram_AI_Agent.json` (tool description updated)
- `plans/2026-06-13-calendar-assistant/plan.md` (Simplification Log 2026-06-13)
- `plans/2026-06-13-calendar-assistant/phase-02-build-sub-workflow-14-calendar-assistant.md`

## Acceptance Criteria

1. Workflow `14_Calendar_Assistant.json` có **12 nodes** (giảm từ 23, -48%):
   - Execute Workflow Trigger → Extract Input → If Empty Input
   - Empty branch: Empty Input Reply → Send Telegram (Empty Input)
   - Main branch: Gemini Extract Fields → Validate Required Fields → If Valid
     - Valid: Create Event (Google Calendar) → Prepare Success Reply → Send Telegram (Result)
     - Invalid: Prepare Missing Reply → Send Telegram (Result)
2. Bỏ hoàn toàn: Switch Action, Parse Intent + Guards, Build Time Range, List Events, Gemini Compose Answer, Find Delete Candidates, Validate Delete Filter, 3 node Telegram riêng (gộp thành 1).
3. `If Valid` output: true=Create Event, false=Prepare Missing Reply (fail-closed nếu thiếu title/start/end hoặc end <= start).
4. Google Calendar node: `calendar: {mode: "name", value: "primary"}` (alias cho main calendar của admin), `operation: create`.
5. `01_Telegram_AI_Agent.json` tool `calendar_assistant` description updated:
   - Bỏ "xem hoặc hủy"
   - Thêm "wf14 sẽ tự parse thời gian từ text"
   - Note rõ "KHÔNG dùng tool này để xem/hủy lịch"
6. README.md updated: scope thu hẹp CREATE-only, bỏ "tạo/xem/hủy".
7. `plans/2026-06-13-calendar-assistant/plan.md` có **Simplification Log** ở cuối giải thích lý do + trade-offs.
8. Workflow published lên n8n (`active: true`) — verified qua API.

## Design Notes

- **Pattern copy từ ST-013** (`13_NhatKyHoaDon_Assistant`):
  - Extract Input (7 input patterns)
  - If Empty Input + Empty Reply guard (`return []` khi không có chat_id)
  - Gemini Extract Fields (parse NL → fields với `responseSchema`)
  - Validate Required Fields + return `{valid, missing, ...data}`
- **Timezone**: Mặc định `Asia/Ho_Chi_Minh` (+07:00). Code node `Validate Required Fields` có helper `ensureTimezone()` auto-add `+07:00` nếu Gemini output thiếu offset.
- **Credentials**:
  - `telegramApi` → `temp-creds-tele` (Telegram Bot Token)
  - `googleCalendarOAuth2Api` → `OwwGxyeK5fUpUSRk` (Google Calendar account)
- **Fail-closed guards**:
  - `Empty Input Reply`: `if !chat_id return []` (không gọi Telegram API với empty chat_id)
  - `Validate Required Fields`: nếu `end <= start` hoặc thiếu title/start/end → `{valid: false, missing: [...]}`
  - `Gemini parse fail`: default về `{valid: false, missing: [...required]}` (không tạo event rác)
- **AI Agent tool description** (tiếng Việt mới):
  > "Tạo lịch hẹn/sự kiện mới trên Google Calendar của admin (primary). Dùng khi user nói về lịch hẹn, cuộc họp, sự kiện mới, reminder, 'đặt lịch X lúc Y', 'hẹn gặp khách ngày mai'. Input: {user_message: <câu chat của user bằng tiếng Việt>, chat_id: <ID chat Telegram>}. wf14 sẽ tự parse thời gian từ text (hỗ trợ 'mai 10h', '14h chiều thứ 6 tuần sau', 'ngày 2026-06-15') và hỏi lại nếu thiếu title/thời gian. KHÔNG dùng tool này để xem/hủy lịch."

## Validation

| Layer | Expected proof | Status |
| --- | --- | --- |
| Static | JSON validate, node/connection integrity | ✅ 12 nodes, 10 connections, all targets exist |
| Integration | Workflow publish lên n8n | ✅ `active: true`, versionId `01474366-a93e-4167-acd6-f4a88b286794` |
| E2E | Test qua webhook runner (3 case) | ⚠️ Cloudflare tunnel không pick up webhook mới; workflow call trigger verified từ API |
| Unit | `npm run test:workflows` với `calendar_assistant` | ⚠️ Chưa chạy (do permission wf1 update) |

## Harness Delta

- Cập nhật `01_Telegram_AI_Agent.json` tool description (local file, chưa PUT được lên n8n do permission — user sẽ import lại qua UI).
- Tạo story mới `ST-014b-calendar-assistant-simplify.md` (story này).
- Cập nhật `README.md` workflow 14 description.
- Cập nhật `plans/2026-06-13-calendar-assistant/plan.md` với Simplification Log.
- Không tạo workflow mới trong n8n — chỉ update existing `wf14calendar` qua PUT API.

## Out of Scope (deferred)

- ❌ READ events / List events — user dùng Google Calendar UI
- ❌ DELETE events — user dùng Google Calendar UI
- ❌ Update/Edit event
- ❌ Recurring events (RRULE)
- ❌ Multi-user / OAuth per-user
- ❌ Attendees/RSVP
- ❌ Conflict check tự động
- ❌ Free/Busy query

Khi cần READ/DELETE sau, sẽ tạo workflow `15_Calendar_Query` riêng để giữ separation of concerns.

## Evidence

- Execution #480 review: `https://detect-expression-cases-middle.trycloudflare.com/workflow/wf14calendar/executions/480` (manual test, success, fail-closed OK)
- Execution #475: Empty input → Telegram 400 (root cause: Empty Reply return [] không stop n8n) — fixed trong design mới với explicit `If Valid` switch
- Workflow published: n8n API `PUT /api/v1/workflows/wf14calendar` (versionId `01474366-...`)
