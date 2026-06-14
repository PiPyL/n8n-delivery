# ST-012b-fix-fb-smart-publisher-issues Story

## Status

implemented

## Lane

normal

## Parent Story

ST-012-facebook-smart-publisher

## Goal

Fix 4 P0 bugs + 1 P1 refactor trong `12_Facebook_Smart_Publisher.json` để đảm bảo workflow hoạt động đúng với 4 happy case cơ bản.

## Diagnosed Bugs (từ review với awesome-n8n-templates)

| # | Bug | Severity | Mô tả |
|---|---|---|---|
| 1 | Dead node `Has Image?` | P0 | Node có 0 input, 0 output → không bao giờ chạy |
| 2 | Race condition `Store Approval` | P0 | `writeFileSync` không atomic → concurrent request ghi đè nhau |
| 3 | `approval_id` collision risk | P0 | `Date.now().toString(36)` collide nếu 2 request cùng millisecond |
| 4 | No TTL cho `pendingApprovals` | P0 | File JSON phình to vĩnh viễn, không có cơ chế prune |
| 5 | No guard trước `Get Photo/Video File Info` | P0 | Nếu `photo_file_id=''` → Telegram API 400 |
| 6 | DRY violation: 3× Call Gemini + 3× Parse gần giống hệt | P1 | ~150 lines JSON trùng lặp |
| 7 | MarkdownV2 escape thiếu backslash | P2 | Error message chứa `\` → Telegram 400 |

## Implemented Fixes

### Fix 1: Xóa dead node `Has Image?`
Đã xóa node và orphan references trong connections.

### Fix 2+3+4: Rewrite `Store Approval & Build Preview`
- Dùng `crypto.randomUUID().slice(0,8)` thay vì `Date.now()` cho approval_id (format mới: `FSP-XXXXXXXX`)
- Atomic write: ghi `.tmp` rồi `renameSync` (POSIX atomic rename)
- Thêm `TTL_MS = 24h` + `expiry_at` field + auto-prune khi load
- Backup file corrupt thành `.corrupt.{timestamp}` thay vì crash
- Thêm `chat_id` ownership field cho cross-check tại `06_Social_Publisher`

### Fix 5: Thêm `If Has Photo File Id?` / `If Has Video File Id?` guards
- Check `exists` operator trước khi gọi `Get Photo/Video File Info`
- Nếu false → `Build Photo/Video Missing Error` (Code node) → return `success: false` với message Tiếng Việt rõ ràng → flow đi qua `Store Approval` → `Is Success?` (false branch) → `Send Error Telegram`

### Fix 6: DRY - Merge 3 `Call Gemini 3.1 Flash Lite (X)` → 1 `Call Gemini 3.1 Flash Lite`
- 3 builder nodes (Image/Video/Text) giữ nguyên vì payload khác nhau
- 1 unified `Call Gemini` với `retryOnFail: true, maxTries: 3, waitBetweenTries: 2000`
- 1 unified `Parse Gemini Response` handle cả 3 mode (lấy builder từ `$('Build Gemini Vision Body (Image), Build Gemini Vision Body (Video), Build Gemini Text Body').first()`)

### Fix 7: MarkdownV2 backslash escape
Thêm `.replace(/\\/g, '\\\\')` ở đầu chain trong `Send Error Telegram`.

### Bonus: 
- Thêm `Workflow Overview` sticky note mô tả tổng quan
- Thêm tags: `facebook`, `ai`, `approval`, `telegram`

## Files Changed

- `workflows/12_Facebook_Smart_Publisher.json` (37,904 → 37,331 bytes, -1.5%)
- Backup tại: `workflows/12_Facebook_Smart_Publisher.json.bak.fix12.1781435915`

## Verification

### 13 Static Checks (script verify_wf12.py)

| Check | Result |
|---|---|
| 1. JSON parse | ✓ |
| 2. Node inventory (23 nodes) | ✓ |
| 3. No dead nodes | ✓ |
| 4. All connection targets exist | ✓ |
| 5. Trigger integrity (1 trigger, not a target) | ✓ |
| 6. Trigger has 1 downstream | ✓ |
| 7. Store Approval: UUID + TTL + atomic + prune + ownership | ✓ |
| 8. Unified Call Gemini has retry policy | ✓ |
| 9. MarkdownV2 backslash escape | ✓ |
| 10. If guards use 'exists' check | ✓ |
| 11. Tags + sticky note present | ✓ |
| 12. All 4 happy case paths terminate correctly | ✓ |
| 13. n8n workflow structure (executionOrder: v1) | ✓ |

### 4 Happy Case Path Trace

```
ai|image (true):   If Has Photo File Id? -> Get Photo File Info -> Download Photo -> Build Gemini Vision Body (Image) -> Call Gemini -> Parse -> Store -> Is Success? -> Send Preview Telegram
ai|video (true):   If Has Video File Id? -> Get Video File Info -> Download Video -> Build Gemini Vision Body (Video) -> Call Gemini -> Parse -> Store -> Is Success? -> Send Preview Telegram
ai|text:           Build Gemini Text Body -> Call Gemini -> Parse -> Store -> Is Success? -> Send Preview Telegram
manual:            Build Manual Preview Payload -> Store -> Is Success? -> Send Preview Telegram
```

### 2 Error Case Path Trace

```
If Has Photo File Id? [false] -> Build Photo Missing Error -> Store -> Is Success? [false] -> Send Error Telegram
Manual + empty caption: Normalize returns success:false -> If Valid Request [false] -> Send Error Telegram
```

### Existing Test Suite

| Test | Result |
|---|---|
| `npm run test:unit` | 146/146 PASS (5 Code nodes mới, 0 fail) |
| `npm run test:workflows` | 45/46 PASS (1 pre-existing fail ở wf09 Veo, không liên quan wf12) |

## Acceptance Criteria

- [x] Workflow chạy đúng 4 happy case: ai+image, ai+video, ai+text, manual
- [x] Race condition fix: atomic write
- [x] approval_id dedup: crypto.randomUUID
- [x] TTL 24h cho approval
- [x] If guard chặn empty file_id
- [x] DRY: 3 Call Gemini → 1
- [x] MarkdownV2 escape backslash
- [x] Sticky note + tags

## Out of Scope (chuyển sang P2/ST-016)

- Telegram inline keyboard (Duyệt/Sửa/Huỷ) thay vì gõ code
- `outputParserStructured` native node
- chat_id ownership check trong 06_Social_Publisher
- Sticky notes cho từng section
- Refactor `Normalize` 4461 chars thành Set+If chain

## Lessons Learned (từ awesome-n8n-templates review)

- Repo chuyên gia thường dùng `outputParserStructured` thay parse JSON thủ công
- `sendAndWait` cho human-in-loop (chỉ áp dụng Gmail; Telegram phải tự build)
- Sticky notes làm tài liệu inline → dễ bảo trì
- `crypto.randomUUID` là best practice cho approval code
- Atomic write (`.tmp` + rename) là baseline cho persistence layer
