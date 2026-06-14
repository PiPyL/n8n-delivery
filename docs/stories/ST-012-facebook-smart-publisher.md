# ST-012-facebook-smart-publisher Story

## Status

implemented

## Lane

normal

## Product Contract

Workflow mới `12_Facebook_Smart_Publisher` là **TOOL DUY NHẤT** trong AI Agent (wf01) để xử lý đăng bài Facebook. Workflow thay thế hoàn toàn `wf06_Social_Publisher` cho luồng Facebook (vẫn giữ `wf06` cho các nơi khác như `01_Telegram_Gateway`).

**Hỗ trợ 2 mode**:
- **`mode='ai'`** — Gemini 3.1 Flash Lite sinh caption Tiếng Việt từ:
  - `media_kind='image'`: Vision phân tích ảnh + viết caption
  - `media_kind='video'`: Vision phân tích video + viết caption
  - `media_kind='text'`: chỉ từ `user_prompt` (chủ đề)
- **`mode='manual'`** — giữ nguyên `user_caption` do user nhập.

**Workflow tự xử lý TỪ A-Z**: sinh caption → preview Telegram với mã `FSP...` → chờ duyệt → đăng/lên lịch Facebook. AI Agent KHÔNG cần gọi thêm tool khác.

## Relevant Product Docs

- `docs/workflows/12_Facebook_Smart_Publisher.md` (mới)
- `workflows/12_Facebook_Smart_Publisher.json` (mới, 22 nodes, 19 connections)
- `workflows/01_Telegram_AI_Agent.json` (sửa: xóa tool `social_publisher`, thêm tool `facebook_smart_publisher`, cập nhật system message)

## Acceptance Criteria

- Workflow nhận đúng 2 mode (`ai` / `manual`) từ input JSON.
- 3 nhánh AI hoạt động độc lập: image (resolve `photo_file_id` → download → base64 → Gemini Vision), video (tương tự), text (chỉ text prompt).
- Manual mode validate `user_caption` không rỗng.
- Gemini parse response với safety check + fallback khi không phải JSON.
- Preview Telegram hiển thị mã duyệt `FSP...`, caption, mode, media_kind.
- Approval ID lưu vào file `pending_smart_publish.json` (cùng pattern với wf06).
- Tool `social_publisher` đã **loại bỏ hoàn toàn** khỏi wf01 (clean node + clean connections + clean system message + clean tool description).
- 23 unit tests pass cho 5 Code nodes mới.
- Workflow structure test: 0 fail, 61 pass.
- AI Agent wf01 có tool `facebook_smart_publisher` thay thế vị trí `social_publisher`.

## Design Notes

### Workflow structure (22 nodes, 19 connections)

```text
Execute Workflow Trigger
  → Normalize Smart Publish Request (Code: validate input, fallback image→text khi thiếu file)
  → If Valid Request
      ├─ false → Send Error Telegram
      └─ true  → Switch Mode
                    ├─ ai|image  → Get Photo File Info → Download Photo → Build Gemini Vision Body (Image) → Call Gemini 3.1 Flash Lite (Image) → Parse Gemini Vision Response (Image)
                    ├─ ai|video  → Get Video File Info → Download Video → Build Gemini Vision Body (Video) → Call Gemini 3.1 Flash Lite (Video) → Parse Gemini Vision Response (Video)
                    ├─ ai|text   → Build Gemini Text Body → Call Gemini 3.1 Flash Lite (Text) → Parse Gemini Text Response
                    └─ manual    → Build Manual Preview Payload
                    ↓
                  Store Approval & Build Preview (Code: tạo approval_id FSPxxx, lưu pending_smart_publish.json)
                    ↓
                  Send Preview Telegram
```

### Gemini 3.1 Flash Lite call

- **Endpoint**: `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent`
- **Auth**: header `x-goog-api-key: $env.GEMINI_API_KEY`
- **Body cho Vision**: `contents[].parts[]` gồm `{ text: <system prompt> }` + `{ inlineData: { mimeType, data: <base64> } }`
- **Body cho Text**: chỉ `{ text: <system prompt> }`
- **Response schema**: JSON `{ caption, hashtags[], cta, tone }` — dùng `responseSchema` + `responseMimeType: application/json`

### AI Agent wf01 updates (2 lần)

**Lần 1 (ST-012 gốc)**: Thêm tool `facebook_smart_publisher`, thêm capability line + rule 3b + rule 5 update.

**Lần 2 (cleanup)**: Xóa tool `social_publisher` (trùng chức năng):
- Xóa node `Tool: Social Publisher`
- Xóa orphan connection entry `"Tool: Social Publisher"` trong `connections`
- Xóa capability line `- Đăng/lên lịch bài Facebook, TikTok (Tool: social_publisher)`
- Update rule 3b: "Workflow này tự xử lý TỪ A-Z (sinh caption + preview + duyệt + đăng), KHÔNG cần gọi tool khác."
- Update rule 5: thay 2 nhánh (smart+social) thành 1 nhánh duy nhất "LUÔN gọi facebook_smart_publisher"
- Update rule 3: bỏ "đăng bài" khỏi danh sách cần hỏi xác nhận (vì wf12 có preview+approval built-in)
- Update tool description: "TOOL DUY NHẤT xử lý đăng bài Facebook. Tự xử lý TỪ A-Z"
- Update `test-workflows.mjs` `expectedTools`: `'social_publisher'` → `'facebook_smart_publisher'`

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `node scripts/unit-tests.mjs` — 143/143 pass (23 mới cho WF12) |
| Integration | `node scripts/test-workflows.mjs` — 0 fail, 61 pass, 45 warn |
| E2E | None (cần Telegram bot + Facebook page thật) |
| Platform | None |
| Release | None |

## Harness Delta

- Added story ST-012-facebook-smart-publisher.
- Implemented and verified ST-012 (2 lần: lần 1 scaffold, lần 2 cleanup wf06 khỏi wf01).
- Added 1 new workflow (`12_Facebook_Smart_Publisher.json`).
- Modified `01_Telegram_AI_Agent.json`: removed `social_publisher` tool, added `facebook_smart_publisher` tool, updated system message (capability, rules 3/3b/5).
- Added 23 new unit tests covering 5 Code nodes (normalize, build-text-body, parse-gemini, build-manual, approval-id).
- Updated `test-workflows.mjs` `expectedTools` to reflect new tool name.
- All workflow structure checks pass (61 pass / 0 fail).
- `wf06_Social_Publisher` vẫn giữ nguyên cho `01_Telegram_Gateway` (chưa cleanup vì ngoài scope ST-012).

## Evidence

- `node scripts/unit-tests.mjs` → `✅ Passed: 143, ❌ Failed: 0`
- `node scripts/test-workflows.mjs` → `Summary: 0 fail, 45 warn, 61 pass`
- `harness-cli story verify ST-012-facebook-smart-publisher` → `verification: pass`
- Workflow JSON: `workflows/12_Facebook_Smart_Publisher.json` (valid, 22 nodes, 19 connections)
- `grep -c "social_publisher" workflows/01_Telegram_AI_Agent.json` → `0` (clean)
