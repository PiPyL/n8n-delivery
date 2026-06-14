# 05 - VẬN HÀNH & DEBUG HÀNG NGÀY

Tài liệu này hướng dẫn **vận hành hệ thống hàng ngày** và **debug lỗi thường gặp** trong quá trình sử dụng.

---

## 1. VẬN HÀNH HÀNG NGÀY

### 1.1 Khởi động hệ thống

```bash
# Terminal 1: n8n server
cd /path/to/n8nDemo
npm run n8n:start
# → Background, có thể dùng pm2 hoặc systemd để auto-restart
```

**Auto-restart với pm2 (khuyến nghị cho production):**
```bash
npm install -g pm2
pm2 start npm --name "n8n-shop" -- run n8n:start
pm2 save
pm2 startup
```

**Nếu cần public URL (cho Facebook webhook):**
```bash
# Dùng cloudflare tunnel (free)
npm run n8n:start:cloudflare
# → Output URL: https://xxxx.trycloudflare.com
# → Paste URL này vào Facebook App Webhook Callback
```

### 1.2 Monitoring hàng ngày

#### Check executions trong UI
1. Mở `http://127.0.0.1:5678`
2. Tab **Executions** (sidebar)
3. Lọc theo:
   - **Status:** Error (xem lỗi)
   - **Workflow:** chọn workflow cụ thể
   - **Time:** 24h qua
4. Click execution → xem chi tiết node nào fail

#### Check log file
- **n8n log:** in ra terminal khi chạy `npm run n8n:start`
- **Test run log:** `.n8n/test-runs/wf*.log`
- **Cloudflared log:** (nếu dùng tunnel) — tự sinh trong folder log

#### Check quota API
- **Gemini:** [Google AI Studio Usage](https://aistudio.google.com/app/apikey) → xem usage
- **Facebook:** [Facebook App Dashboard](https://developers.facebook.com/apps) → Analytics
- **TikTok:** [TikTok Developer Portal](https://developers.tiktok.com/) → App Analytics
- **Google Cloud:** [Console](https://console.cloud.google.com/) → APIs & Services → Dashboard

### 1.3 Backup dữ liệu

#### Backup credentials & workflows
```bash
# Backup .n8n/ folder
tar -czf backup-$(date +%Y%m%d).tar.gz .n8n/

# Backup .env.local (QUAN TRỌNG chứa N8N_ENCRYPTION_KEY)
cp .env.local .env.local.bak
```

#### Backup Google Sheets
- Mở Google Sheets → **File** → **Version history** → có sẵn
- Hoặc export CSV: **File** → **Download** → **Comma-separated values**

#### Backup Google Drive
- Folder `CommentBotImages/`: download zip từ Drive UI

### 1.4 Update workflow

Khi cần sửa workflow:

1. **Trước khi sửa:** export workflow hiện tại làm backup
   ```bash
   # Lấy workflow từ n8n UI
   # Workflow → 3 dots → Download
   # → Save vào workflows/_backup/
   ```

2. **Sửa trong UI:** mở workflow → sửa node → Save

3. **Sync về file JSON trong workflows/:**
   ```bash
   # Download workflow từ UI về
   # Replace file trong workflows/
   # Commit vào git
   ```

4. **Test lại:**
   ```bash
   npm run test:workflows
   ```

5. **Re-import nếu cần:**
   ```bash
   npm run n8n:import
   ```

### 1.5 Rotate API keys (định kỳ 3-6 tháng)

- **Gemini API Key:** revoke + create mới trong Google AI Studio
- **Telegram Bot Token:** @BotFather → /revoke
- **Facebook Page Token:** generate lại trong Graph API Explorer
- **Google OAuth:** refresh token tự động (nếu app verified)
- **N8N_ENCRYPTION_KEY:** KHÔNG rotate (sẽ phá vỡ credentials)

---

## 2. DEBUG LỖI THƯỜNG GẶP

### 2.1 Workflow không trigger

**Triệu chứng:** Gửi Telegram message nhưng bot không phản hồi.

**Check theo thứ tự:**

1. **Workflow có active không?**
   - UI: toggle Active = ON
   - CLI: `npm run n8n:import` (auto-publish)

2. **Telegram webhook có hoạt động không?**
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
   ```
   → Check `url` có trỏ về n8n không, `pending_update_count` bao nhiêu

3. **n8n có đang chạy không?**
   - Terminal: thấy "Editor is now accessible via: http://127.0.0.1:5678"
   - Nếu dùng cloudflared: URL còn live không

4. **Trigger node có credential đúng không?**
   - Mở workflow → click TelegramTrigger → check Credential
   - Test credential: Credentials → chọn credential → Test

5. **Xem execution log:**
   - UI: Executions tab → tìm execution gần nhất
   - Nếu không có execution = trigger không fire → check webhook

### 2.2 Lỗi AI Agent không gọi được tool

**Triệu chứng:** AI reply "Tôi không thể..." khi user yêu cầu tool cụ thể.

**Nguyên nhân thường gặp:**

1. **Tool sub-workflow chưa active:**
   - Workflow 04, 07, 09, 12, 13, 14 phải active
   - Mở từng workflow → toggle Active

2. **Tool name không khớp với AI Agent:**
   - Tool node trong 01 có field **"Name"** (vd: "Tool: Media Generator")
   - Sub-workflow có field **"Workflow ID"** (vd: `wf04mediagenerator`)
   - Nếu đổi name sub-workflow → phải update tool node trong 01

3. **Sub-workflow ID sai:**
   - Tool node trỏ vào ID không tồn tại → AI gọi fail
   - Check: mở tool node → **Workflow ID** dropdown → chọn lại

4. **Sub-workflow yêu cầu input khác:**
   - Tool node có field **"Input"** (JSON) — phải khớp với sub-workflow
   - vd: `{"user_message": "..."}` → sub-workflow 14 expect `user_message`
   - Sửa trong tool node của workflow 01

### 2.3 Lỗi tạo ảnh (Workflow 04, 07, 09)

**Triệu chứng:** HTTP Request tới Gemini/Veo trả về 4xx/5xx.

**Debug:**

1. **Lỗi 401 Unauthorized:**
   - GEMINI_API_KEY sai hoặc hết hạn
   - Check key trong `.env.local`
   - Test key: `curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_KEY"`

2. **Lỗi 403 PERMISSION_DENIED (Veo 3.1):**
   - Billing chưa enable cho project
   - Vào [Google Cloud Console](https://console.cloud.google.com/) → Billing → link account → enable

3. **Lỗi 429 RESOURCE_EXHAUSTED:**
   - Quota exceeded → đợi 1 phút hoặc upgrade tier
   - Hoặc thêm retry logic trong HTTP Request node

4. **Lỗi 400 INVALID_ARGUMENT:**
   - Prompt chứa nội dung bị filter (NSFW, violence)
   - Image input không hợp lệ format

5. **Lỗi timeout Veo 3.1:**
   - Default timeout 5 phút có thể không đủ
   - Workflow 09 dùng LRO polling → check log node "Poll Operation Status"
   - Nếu quá 10 phút → fail → admin nhận Telegram "Video timeout"

### 2.4 Lỗi Facebook Webhook

**Triệu chứng:** Comment trên fanpage nhưng bot không reply.

**Debug:**

1. **Webhook verify fail:**
   - Meta gọi GET kèm `hub.verify_token` → workflow 02 phải trả về `hub.challenge`
   - Check `FACEBOOK_WEBHOOK_VERIFY_TOKEN` trong `.env.local` khớp với Meta App
   - Test: `curl "https://your-url/webhook/facebook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=12345"`

2. **Webhook nhận event nhưng không reply:**
   - Xem execution log workflow 02
   - Check switch node có route đúng event không
   - Comment thường đi qua path `entry.changes[0].value` → check parse code

3. **Reply bị Facebook reject:**
   - Lỗi 400: kiểm tra `attachment_url` có public không
   - Workflow 15: Drive folder phải share "Anyone with link"
   - URL ảnh phải accessible từ Facebook server (không bị block)

### 2.5 Lỗi Google OAuth expire

**Triệu chứng:** Workflow Google Sheets/Drive/Calendar fail với "Invalid credentials".

**Nguyên nhân:**

1. **App ở chế độ Testing:**
   - Token hết hạn sau 7 ngày
   - Fix: Publish app (cần verify với Google) hoặc dùng service account

2. **Refresh token bị revoke:**
   - User đã revoke quyền trong Google Account
   - Fix: tạo lại credential trong n8n UI

3. **Scope thay đổi:**
   - Thêm scope mới cần re-authorize
   - Fix: mở credential → Reconnect

**Debug:**
```bash
# Test access token
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://www.googleapis.com/oauth2/v1/tokeninfo"
```

### 2.6 Lỗi Memory leak / n8n chậm

**Triệu chứng:** n8n chạy chậm dần sau vài ngày.

**Nguyên nhân:**

1. **Execution log tích lũy:**
   - Mỗi execution tạo row trong SQLite
   - Sau 10K+ executions, query chậm
   - Fix: **Settings** → **Executions** → **Prune executions older than 7 days**

2. **n8n Event Log files lớn:**
   - Check `.n8n/.n8n/n8nEventLog*.log`
   - Nếu > 100MB → xóa thủ công (n8n sẽ tạo file mới)

3. **Workflow 09 (Video) hang:**
   - LRO polling không timeout đúng
   - Restart n8n nếu cần

### 2.7 Lỗi SQLite database locked

**Triệu chứng:** Workflow chạy báo lỗi "database is locked".

**Nguyên nhân:** nhiều process n8n cùng truy cập SQLite.

**Fix:**
```bash
# Kill tất cả process n8n
pkill -f n8n

# Xóa WAL files (cẩn thận, có thể mất data chưa commit)
rm -f .n8n/.n8n/database.sqlite-shm
rm -f .n8n/.n8n/database.sqlite-wal

# Restart
npm run n8n:start
```

### 2.8 Lỗi import workflows

**Triệu chứng:** `npm run n8n:import` báo lỗi.

**Lỗi thường gặp:**

1. **"Mismatching encryption keys":**
   - `.env.local` có `N8N_ENCRYPTION_KEY` khác với key đã tạo credentials cũ
   - Fix: giữ nguyên key, hoặc xóa `.n8n/` để tạo mới

2. **"Workflow already exists":**
   - Workflow đã import rồi, muốn update
   - Fix: trong UI, mở workflow → xóa → import lại

3. **"Cannot find module":**
   - `npm install` chưa chạy
   - Fix: `npm install`

---

## 3. LOGS VÀ DEBUGGING TOOLS

### 3.1 n8n Debug Mode
```bash
# Set log level = debug
export N8N_LOG_LEVEL=debug
npm run n8n:start
# → Log chi tiết hơn (đầy đủ HTTP request/response)
```

### 3.2 Execution trong UI
- Click execution → tab **"Logs"** → xem log real-time
- Tab **"Input" / "Output"** của từng node → xem data passed
- Nút **"Retry"** trên node fail → chạy lại từ node đó

### 3.3 Code node debugging
- Trong Code node, thêm:
  ```javascript
  console.log('DEBUG:', JSON.stringify($input.all(), null, 2));
  console.log('ENV:', process.env.GEMINI_API_KEY?.slice(0, 10));
  ```
- Xem log trong tab "Logs" của execution

### 3.4 Test workflow độc lập
```bash
# Test 1 workflow cụ thể
node node_modules/.bin/n8n execute --id=wf01telegramagent

# Test tất cả
N8N_EXECUTE_TIMEOUT_MS=15000 npm run n8n:execute:all
```

### 3.5 Live API smoke test
```bash
npm run test:live-api
# → Test Gemini, Telegram, Facebook, TikTok, Google Sheets
# → Output: pass/fail cho từng API
```

---

## 4. MAINTENANCE ĐỊNH KỲ

### Hàng tuần
- [ ] Check executions có error không (UI → Executions)
- [ ] Check quota API (Gemini, Facebook, TikTok)
- [ ] Backup `.n8n/` folder

### Hàng tháng
- [ ] Review Google Sheets data (orders, contacts) — xóa row cũ nếu cần
- [ ] Update Gemini/Facebook/TikTok nếu có API mới
- [ ] Test smoke test (`npm run test:live-api`)

### Hàng quý
- [ ] Rotate API keys (nếu cần)
- [ ] Update n8n version (sau khi test trên staging)
- [ ] Review workflow có cần tối ưu không
- [ ] Backup toàn bộ project + `.env.local` ra nơi an toàn

