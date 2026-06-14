# 06 - FAQ & XỬ LÝ SỰ CỐ

Tài liệu này tổng hợp **15 lỗi phổ biến nhất** khi vận hành hệ thống và cách xử lý. Nếu lỗi không có ở đây, xem `05-VAN-HANH-DEBUG.md` để debug chi tiết hơn.

---

## MỤC LỤC
1. [Lỗi import workflow](#1-lỗi-import-workflow)
2. [Bot Telegram không phản hồi](#2-bot-telegram-không-phản-hồi)
3. [AI Agent không gọi được tool](#3-ai-agent-không-gọi-được-tool)
4. [Tạo ảnh/video lỗi Gemini API](#4-tạo-ảnhvideo-lỗi-gemini-api)
5. [Veo 3.1 lỗi PERMISSION_DENIED](#5-veo-31-lỗi-permission_denied)
6. [TikTok token hết hạn](#6-tiktok-token-hết-hết-hạn)
7. [Facebook webhook không nhận event](#7-facebook-webhook-không-nhận-event)
8. [Google OAuth token expire](#8-google-oauth-token-expire)
9. [Workflow chạy chậm](#9-workflow-chạy-chậm)
10. [Lỗi "Mismatching encryption keys"](#10-lỗi-mismatching-encryption-keys)
11. [Không save được vào Google Sheets](#11-không-save-được-vào-google-sheets)
12. [Image Drive không public](#12-image-drive-không-public)
13. [Video polling timeout](#13-video-polling-timeout)
14. [Workflow 14 Calendar parse sai](#14-workflow-14-calendar-parse-sai)
15. [Workflow 13 NhatKy validation fail](#15-workflow-13-nhatky-validation-fail)

---

## 1. LỖI IMPORT WORKFLOW

**Triệu chứng:** `npm run n8n:import` báo lỗi, workflow không xuất hiện trong UI.

**Nguyên nhân & Fix:**

| Lỗi | Nguyên nhân | Fix |
|-----|-------------|-----|
| `Mismatching encryption keys` | `N8N_ENCRYPTION_KEY` trong `.env.local` khác key đã tạo credentials cũ | Xem [mục 10](#10-lỗi-mismatching-encryption-keys) |
| `Workflow with ID wf01... already exists` | Workflow đã import từ trước | Xóa workflow trong UI → import lại, hoặc dùng `--force` |
| `Cannot find module 'n8n'` | Chưa `npm install` | Chạy `npm install` |
| `EACCES: permission denied .n8n/` | Không có quyền ghi folder | `sudo chown -R $USER:$USER .n8n/` |
| `SQLITE_CANTOPEN: no such file` | n8n chưa start lần nào | Chạy `npm run n8n:start` 1 lần trước → tạo DB → stop → import |

**Lệnh debug:**
```bash
# Force re-import
rm -rf .n8n/import-ready
npm run n8n:import

# Hoặc manual
node node_modules/.bin/n8n import:workflow --input=.n8n/import-ready/01_Telegram_AI_Agent.json
```

---

## 2. BOT TELEGRAM KHÔNG PHẢN HỒI

**Triệu chứng:** Gửi `/start` cho bot, không có phản hồi nào.

**Check theo thứ tự:**

### 2.1 Workflow có active không?
- UI: Workflow 01 → toggle Active = ON
- Nếu OFF → click toggle, save

### 2.2 Credential Telegram có đúng không?
- UI: Credentials → chọn Telegram credential → **Test**
- Nếu fail: token sai → paste lại `TELEGRAM_BOT_TOKEN` từ `.env.local`

### 2.3 n8n có nhận webhook từ Telegram không?
```bash
# Check webhook hiện tại
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```
**Output mong đợi:**
```json
{
  "url": "https://your-n8n-url/webhook/telegram/...",
  "pending_update_count": 0,
  "last_error_date": 0
}
```

**Nếu `url` sai:**
- N8n tự động set webhook khi workflow 01 activate
- Nếu dùng cloudflared, URL thay đổi mỗi lần restart → phải restart workflow 01

**Nếu `last_error_date > 0`:**
- Có lỗi gọi webhook → check n8n log

### 2.4 ADMIN_TELEGRAM_CHAT_ID có đúng không?
- Workflow 01 có thể check `chat_id` → nếu không match admin → ignore
- Verify: gửi message từ đúng tài khoản Telegram admin

### 2.5 Network issue
- Nếu n8n chạy local, Telegram cần truy cập được → dùng cloudflare tunnel hoặc ngrok
- Test: `curl -X POST "https://api.telegram.org/bot<TOKEN>/sendMessage" -d '{"chat_id": <ADMIN_ID>, "text": "test"}'`

---

## 3. AI AGENT KHÔNG GỌI ĐƯỢC TOOL

**Triệu chứng:** User: "Tạo ảnh váy đỏ" → AI reply "Tôi không thể tạo ảnh" thay vì gọi tool.

**Nguyên nhân & Fix:**

### 3.1 Sub-workflow chưa active
- Mở workflow 04 (Media Generator) → toggle Active
- Tương tự cho 07, 09, 12, 13, 14, 15

### 3.2 Tool node trong 01 trỏ sai workflow ID
- Mở workflow 01 → click "Tool: Media Generator" → check **Workflow ID** = `wf04mediagenerator`
- Nếu sai → chọn lại từ dropdown

### 3.3 Sub-workflow yêu cầu input khác format
- Tool node có field **Input** (JSON) — vd: `{"user_message": "..."}`
- Sub-workflow trigger node đọc field này
- Nếu đổi tên field → phải update cả 2 bên

### 3.4 Gemini model không khả dụng
- Workflow 01 dùng `gemini-3.1-flash-lite-preview` (preview)
- Nếu Google thay đổi model → AI Agent fail
- Fix: đổi sang `gemini-1.5-flash` stable trong node `lmChatGoogleGemini`

**Debug:**
- Mở execution của workflow 01
- Xem node "AI Agent" → tab "Logs" → tìm dòng `Tool call: Tool:Media Generator` hoặc lỗi
- Nếu không có log "Tool call" = AI không quyết định gọi tool → có thể do:
  - Prompt không rõ ràng → AI không hiểu nên gọi tool
  - Tool description không match intent
  - Memory context bị nhiễu

---

## 4. TẠO ẢNH/VIDEO LỖI GEMINI API

**Triệu chứng:** Workflow 04, 07, 09 trả về lỗi HTTP 4xx/5xx.

### 4.1 Lỗi 401 Unauthorized
- **Nguyên nhân:** `GEMINI_API_KEY` sai hoặc bị revoke
- **Fix:**
  ```bash
  # Test key
  curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_KEY"
  # → Nếu 401, lấy key mới từ https://aistudio.google.com/app/apikey
  ```
  Sau đó update HTTP Request node → Header Auth value

### 4.2 Lỗi 403 PERMISSION_DENIED
- **Nguyên nhân:** API key không có quyền với model cụ thể (vd: Veo 3.1)
- **Fix:** Xem [mục 5](#5-veo-31-lỗi-permission_denied)

### 4.3 Lỗi 429 RESOURCE_EXHAUSTED
- **Nguyên nhân:** Quota exceeded
- **Fix:**
  - Free tier: 60 req/min → đợi 1 phút
  - Paid tier: check [quota](https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas)
  - Thêm retry logic: HTTP Request node → Settings → **Retry on fail** = ON, Max retries = 3

### 4.4 Lỗi 400 INVALID_ARGUMENT
- **Nguyên nhân:**
  - Prompt chứa nội dung bị filter (NSFW, violence, hate speech)
  - Image input sai format (phải là base64 hoặc URL)
  - Parameter không hợp lệ (vd: aspect ratio không support)
- **Fix:** Đơn giản hóa prompt, check image format

### 4.5 Lỗi 500 Internal Server Error
- **Nguyên nhân:** Google server issue
- **Fix:** Retry sau vài phút, hoặc check [Google Cloud Status](https://status.cloud.google.com/)

---

## 5. VEO 3.1 LỖI PERMISSION_DENIED

**Triệu chứng:** Workflow 09 (Video Generator) fail với lỗi:
```
{
  "error": {
    "code": 403,
    "message": "Permission denied for veo-3.1-generate-preview",
    "status": "PERMISSION_DENIED"
  }
}
```

**Nguyên nhân:** Veo 3.1 chỉ chạy với paid tier Google AI Studio.

**Fix:**

1. **Enable billing cho Google Cloud project:**
   - Vào [Google Cloud Console](https://console.cloud.google.com/)
   - **Billing** → **Link a billing account** → thêm thẻ Visa/Master
   - Enable billing

2. **Verify model access:**
   ```bash
   curl "https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview?key=YOUR_KEY"
   ```
   → Nếu 200 OK = OK
   → Nếu 403 = billing chưa enable

3. **Lưu ý:** Veo 3.1 là **preview API** — có thể bị Google thay đổi bất kỳ lúc nào. Cần theo dõi [Gemini API changelog](https://ai.google.dev/gemini-api/docs/changelog).

4. **Fallback:** Nếu Veo 3.1 không khả dụng, có thể tạm tắt workflow 09 hoặc dùng model khác (vd: `veo-2.0-generate-001` nếu còn).

---

## 6. TIKTOK TOKEN HẾT HẠN

**Triệu chứng:** Workflow 06-Worker (Social Publisher) fail khi đăng video TikTok với lỗi 401.

**Nguyên nhân:**
- Access token TikTok sống 24h
- Refresh token sống 365 ngày (cần refresh thủ công trước khi hết hạn)

**Fix:**

### 6.1 Access token hết hạn (bình thường)
- Workflow 05 (Token Refresher) chạy mỗi 12h → tự động refresh
- Nếu workflow 05 không chạy → check cron
- Nếu vẫn lỗi → chạy thủ công workflow 05

### 6.2 Refresh token hết hạn (sau 365 ngày)
- Phải re-authorize thủ công
- Bước:
  1. Truy cập [TikTok Developer Portal](https://developers.tiktok.com/) → App của bạn
  2. **OAuth flow** lấy authorization code mới (xem `02-CAU-HINH-API.md` mục 4)
  3. Đổi code lấy `refresh_token` mới
  4. Update Google Sheet `Tokens` row "tiktok" → paste refresh_token mới vào column C
  5. Chạy workflow 05 → sẽ tự refresh access_token

### 6.3 App bị revoke
- Nếu TikTok review và reject app → tất cả token invalid
- Phải tạo app mới

---

## 7. FACEBOOK WEBHOOK KHÔNG NHẬN EVENT

**Triệu chứng:** Comment trên fanpage nhưng workflow 02 không trigger.

### 7.1 Webhook URL không accessible
- Meta cần gọi được URL webhook từ internet
- Nếu n8n chạy local → dùng cloudflared tunnel
- Test: `curl "https://your-url/webhook/facebook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test"`
  → Phải trả về "test"

### 7.2 Verify token sai
- `FACEBOOK_WEBHOOK_VERIFY_TOKEN` trong `.env.local` phải khớp với Meta App
- Check Meta App Dashboard → Webhooks → Edit Subscription

### 7.3 Page chưa subscribe vào App
- Page Settings → Advanced Messaging → chọn App
- Hoặc: Page Settings → Webhooks → add subscription

### 7.4 Subscription fields chưa enable
- Meta App → Webhooks → Edit Subscription → chọn fields: `messages`, `feed`, `comments`
- Click **Verify and Save**

### 7.5 Webhook verify lúc đầu fail
- Meta gọi GET với `hub.verify_token` → workflow 02 node Webhook phải trả về `hub.challenge`
- Code trong workflow 02:
  ```javascript
  if ($json.query['hub.mode'] === 'subscribe' && 
      $json.query['hub.verify_token'] === $env.FACEBOOK_WEBHOOK_VERIFY_TOKEN) {
    return [{ json: { challenge: $json.query['hub.challenge'] } }];
  }
  ```

---

## 8. GOOGLE OAUTH TOKEN EXPIRE

**Triệu chứng:** Workflow Google Sheets/Drive/Calendar/Gmail fail với 401 "Invalid Credentials".

**Fix:**

### 8.1 Token hết hạn (7 ngày cho Testing app)
- Mở n8n UI → Credentials → chọn Google credential → **Reconnect**
- Hoặc xóa credential cũ → tạo mới

### 8.2 User revoke quyền
- User vào [Google Account Permissions](https://myaccount.google.com/permissions) → tìm app n8n → remove
- Sau đó tạo lại credential trong n8n

### 8.3 Scope thay đổi
- Nếu thêm scope mới vào OAuth consent screen → cần re-authorize
- Credential trong n8n tự động request scope mới khi reconnect

### 8.4 Publish app để có refresh token dài hạn
- App ở chế độ Testing → refresh token sống 7 ngày
- Submit app for verification → sau khi verify, refresh token không hết hạn
- Quy trình verify mất vài ngày đến vài tuần

**Tạm thời:** Có thể dùng **Service Account** thay vì OAuth2 user:
- Tạo Service Account trong Google Cloud Console
- Download JSON key
- Share Google Sheet/Drive/Calendar với email service account
- Trong n8n: chọn credential type "Google Service Account" → upload JSON

---

## 9. WORKFLOW CHẠY CHẬM

**Triệu chứng:** Workflow mất 30s+ mới hoàn thành (bình thường < 5s).

### 9.1 Gemini API chậm
- Flash Lite thường < 2s, nhưng nếu traffic cao → có thể 5-10s
- Check [Google Cloud Status](https://status.cloud.google.com/)

### 9.2 Veo 3.1 queue
- Video generation có thể mất 1-5 phút (LRO)
- Nếu > 5 phút → có thể queue → đợi

### 9.3 n8n database lock
- Quá nhiều execution đồng thời → SQLite lock
- Fix: xem [mục trong 05-VAN-HANH-DEBUG](#27-lỗi-sqlite-database-locked)

### 9.4 Network chậm
- Ping Google API: `ping generativelanguage.googleapis.com`
- Nếu > 200ms → network issue

### 9.5 Workflow có loop chậm
- Check workflow có Loop node không
- Nếu loop lớn (> 100 iterations) → chậm

### 9.6 Code node chạy lâu
- Code node với logic phức tạp
- Thêm `console.time()` để đo thời gian

---

## 10. LỖI "MISMATCHING ENCRYPTION KEYS"

**Triệu chứng:** `npm run n8n:import` báo:
```
There was a problem with decrypting the credentials. Likely cause: N8N_ENCRYPTION_KEY has changed since the credentials were last saved.
```

**Nguyên nhân:** `N8N_ENCRYPTION_KEY` trong `.env.local` khác với key đã mã hóa credentials trong `.n8n/.n8n/database.sqlite`.

**Fix (chọn 1 trong 2):**

### Option A: Giữ key cũ (khuyến nghị)
- Mở `.n8n/.n8n/config` (nếu có) hoặc tìm key cũ trong backup
- Paste vào `N8N_ENCRYPTION_KEY` trong `.env.local`
- Restart n8n

### Option B: Reset toàn bộ (MẤT CREDENTIALS)
```bash
# Backup trước
cp -r .n8n .n8n.broken

# Xóa credentials + database
rm -rf .n8n

# Generate key mới
openssl rand -hex 32
# → Paste vào .env.local

# Restart
npm run n8n:start
# → Setup lại owner account
# → Tạo lại tất cả credentials trong UI
```

> ⚠️ Option B sẽ mất TẤT CẢ credentials đã tạo (Telegram, Google, Facebook, TikTok). Phải tạo lại từ đầu.

**Best practice:**
- Backup `N8N_ENCRYPTION_KEY` ở nơi an toàn (password manager)
- KHÔNG bao giờ đổi key sau khi đã tạo credentials
- Nếu cần rotate → phải re-create all credentials

---

## 11. KHÔNG SAVE ĐƯỢC VÀO GOOGLE SHEETS

**Triệu chứng:** Workflow Google Sheets fail với lỗi 400/403.

### 11.1 Lỗi 400 "Unable to parse range"
- Sheet name sai hoặc range sai format
- Check: `DonHang!A:G` (phải có `!` và range)

### 11.2 Lỗi 403 "The caller does not have permission"
- Service account / OAuth user chưa được share Sheet
- Fix: mở Sheet → Share → thêm email của credential

### 11.3 Lỗi 404 "Requested entity was not found"
- Sheet ID sai → check `GOOGLE_SHEETS_DOCUMENT_ID` trong `.env.local`
- Format: `https://docs.google.com/spreadsheets/d/{ID}/edit`

### 11.4 Lỗi "Sheet not found"
- Tab name sai (vd: `DonHang` vs `donhang`)
- Tab name có space → phải escape: `'My Sheet'!A:G`

### 11.5 Data không insert đúng cột
- Workflow 01 (Save Order) expect columns: STT, Ngày, Tên KH, SĐT, Địa chỉ, Sản phẩm, Ghi chú
- Nếu Sheet KH tạo khác cấu trúc → data lệch
- Fix: tạo header đúng theo tài liệu

---

## 12. IMAGE DRIVE KHÔNG PUBLIC

**Triệu chứng:** Workflow 02 (Facebook) gọi tool 15, lấy được URL ảnh, nhưng Facebook từ chối với "URL không accessible".

**Nguyên nhân:** Folder `CommentBotImages/` chưa share "Anyone with the link".

**Fix:**

1. Mở Google Drive → folder `CommentBotImages/`
2. Click phải → **Share** → **General access**
3. Chọn **"Anyone with the link"** → role: **Viewer**
4. Click **Done**

**Test URL:**
- Lấy URL từ workflow output (có dạng `https://drive.google.com/uc?id=FILE_ID&export=download`)
- Mở trong incognito browser → phải xem được ảnh
- Nếu yêu cầu login → chưa share đúng

**Lưu ý:** Meta Graph API server (Facebook) cũng phải access được URL → public share là bắt buộc.

---

## 13. VIDEO POLLING TIMEOUT

**Triệu chứng:** Workflow 09 (Video Generator) chờ > 5 phút, sau đó fail với timeout.

**Nguyên nhân:** Veo 3.1 LRO (Long-Running Operation) chưa done.

**Có 2 trường hợp:**

### 13.1 Video queue quá tải
- Google Veo 3.1 đang xử lý nhiều request
- Giải pháp: đợi và retry, hoặc giảm prompt complexity

### 13.2 Polling logic sai
- Workflow 09 node "Poll Operation Status" check `done === true`
- Nếu sau 20 lần poll (5 phút) vẫn false → fail
- Fix: tăng max retry trong Wait node (từ 20 lên 40 → 10 phút)

**Cách tăng timeout:**
- Mở workflow 09 → tìm Wait node giữa POST và GET
- Tăng interval từ 15s lên 30s
- Tăng max lần poll từ 20 lên 40
- Hoặc đổi sang cron-based check

**Fallback:**
- Workflow 09 hiện tại fail cứng nếu timeout
- Có thể thêm node gửi Telegram "Video timeout, sẽ retry" + background retry job

---

## 14. WORKFLOW 14 CALENDAR PARSE SAI

**Triệu chứng:** Admin: "Đặt lịch mai 14h họp team" → workflow 14 fail với "Missing required field: title".

**Nguyên nhân:** Gemini parse text tiếng Việt tự nhiên ra JSON không đúng schema.

**Schema expected:**
```json
{
  "action": "CREATE",
  "title": "họp team",
  "start": "2026-06-15T14:00:00+07:00",
  "end": "2026-06-15T15:00:00+07:00",
  "location": "",
  "description": ""
}
```

**Fix:**

### 14.1 Prompt Gemini không đủ rõ
- Workflow 14 node "Gemini Intent Classifier" có system prompt
- Nếu parse sai → thêm examples vào prompt
- Sửa trong node → lưu

### 14.2 Thiếu thông tin bắt buộc
- Workflow 14 validate: phải có `title`, `start`, `end` với timezone `+07:00`
- Nếu thiếu → reply Telegram yêu cầu bổ sung
- Đây là fail-closed behavior → **đúng thiết kế**, không phải bug

### 14.3 Timezone issue
- Vietnam = `+07:00`
- Nếu Gemini trả về UTC → sai giờ
- Fix: thêm logic convert timezone trong Code node

### 14.4 Edge case: relative date
- "mai" = ngày mai
- "thứ 2 tuần sau" = thứ 2 tuần sau
- Gemini có thể hiểu sai → cần test nhiều case

---

## 15. WORKFLOW 13 NHATKY VALIDATION FAIL

**Triệu chứng:** Admin: "Ghi hóa đơn khách Trang mua váy 500k" → workflow 13 fail validation.

**Nguyên nhân:** Workflow 13 yêu cầu **6 trường bắt buộc**:
1. `ngay` (ngày)
2. `ten_khach` (tên khách)
3. `dia_chi` (địa chỉ)
4. `san_pham` (sản phẩm)
5. `so_tien` (số tiền)
6. `phuong_thuc_thanh_toan` (phương thức thanh toán)

**Nếu user không cung cấp đủ → workflow reply yêu cầu bổ sung (fail-closed đúng thiết kế).**

**Fix:**

### 15.1 User cần nói đầy đủ thông tin
Vd: "Ghi hóa đơn: hôm nay, khách Trang, Q1, váy đỏ, 500k, tiền mặt"

### 15.2 Gemini parse thiếu field
- Workflow 13 có logic retry: nếu thiếu → hỏi lại user qua Telegram
- User reply → AI parse lại → insert

### 15.3 Muốn bỏ validation
- KH có thể custom: mở workflow 13 → sửa Code node "Validate Required Fields" → comment out check
- ⚠️ Không khuyến nghị: mất đi tính năng fail-closed

### 15.4 Test với input đầy đủ
- Input mẫu: "Ghi hóa đơn: 14/06/2026, khách Nguyễn Trang, 123 Nguyễn Huệ Q1, váy lụa đỏ, 500000, chuyển khoản"
- → Phải insert được row mới

---

## KHI LỖI KHÔNG CÓ Ở ĐÂY

1. Check `05-VAN-HANH-DEBUG.md` để debug chi tiết
2. Check execution log trong n8n UI
3. Check log file:
   - Terminal output khi `npm run n8n:start`
   - `.n8n/test-runs/wf*.log`
4. Google search error message
5. Liên hệ dev để mở story packet

**Cung cấp khi liên hệ dev:**
- Workflow ID (vd: `wf09videogenerator`)
- Execution ID (từ UI)
- Error message đầy đủ (copy từ tab "Logs")
- Steps to reproduce
- Expected vs actual behavior

---

## CHANGELOG SỬA LỖI

### ✅ Đã sửa ngày 14/06/2026 (cleanup trước bàn giao)

| # | Lỗi | Workflow | Mô tả fix |
|---|------|----------|-----------|
| 1 | Veo 3.1 sai model name | 09_Video_Generator | Đổi URL từ `veo-3.1-lite-generate-preview` → `veo-3.1-generate-preview` (đúng tên model chính thức) |
| 2 | 33 placeholder credentials `temp-creds-*` | 12 workflow | Xóa `temp-creds-tele`, `temp-creds-gemini`, `temp-creds-sheets`, `temp-creds-docs` để KH tự tạo credential thật trong UI (tránh import với credential ảo) |
| 3 | Empty `pinData` / `staticData` | Một số workflow | Dọn các field rỗng |

### ⚠️ Cảnh báo thiết kế (KHÔNG phải lỗi, đã ghi nhận)

| Workflow | Cảnh báo | Lý do | Hành động KH |
|----------|----------|-------|--------------|
| 12_Facebook_Smart_Publisher | Không active sau import | Là template, cần activate thủ công sau khi cấu hình | Mở workflow → toggle Active = ON |
| 15_Product_Image_Lookup | Không active sau import | Là template, cần activate thủ công | Mở workflow → toggle Active = ON |
| 08_Gmail_Email_Sender | Nên notify Telegram sau khi gửi email | Improvement, không phải bug | Tùy chọn: thêm node "Send Telegram" sau node gửi email |

### Test kết quả sau fix
- `npm run test:workflows`: **0 fail, 3 warn (design only), 45 pass**
- `npm run test:unit`: **146/146 pass**
