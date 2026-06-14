# 03 - CẤU HÌNH CREDENTIALS TRONG UI N8N

Sau khi đã có API keys (xem `02-CAU-HINH-API.md`), bước tiếp theo là **tạo credentials trong UI n8n** và gán vào đúng node.

---

## BƯỚC 0: KHỞI ĐỘNG N8N

```bash
# Đảm bảo .env.local đã điền
cat .env.local  # check N8N_ENCRYPTION_KEY đã có

# Import workflows
npm run n8n:import

# Start
npm run n8n:start
# → Mở http://127.0.0.1:5678
# → Lần đầu: tạo owner account
# → Sau đó vào màn hình chính
```

---

## BƯỚC 1: TẠO TELEGRAM CREDENTIAL

1. Menu **Credentials** (biểu tượng chìa khóa) → **New** → search "Telegram"
2. Chọn **Telegram API**
3. **Access Token:** paste `TELEGRAM_BOT_TOKEN` từ `.env.local`
4. **Name:** đặt tên gợi nhớ, vd: "Telegram Bot - Shop Main"
5. Click **Save**
6. Test: mở credential vừa tạo → click **Test** → phải trả về "Connection tested successfully"

---

## BƯỚC 2: TẠO GOOGLE OAUTH2 CREDENTIALS (4 service)

### 2.1 Google Sheets OAuth2
1. **Credentials** → **New** → search "Google Sheets"
2. Chọn **Google Sheets OAuth2 API**
3. **OAuth2** section:
   - **Authentication:** OAuth2
   - **Grant Type:** Authorization Code
   - **Authorization URL:** `https://accounts.google.com/o/oauth2/auth`
   - **Access Token URL:** `https://oauth2.googleapis.com/token`
   - **Client ID:** paste từ Google Cloud Console
   - **Client Secret:** paste từ Google Cloud Console
4. **Scope:** `https://www.googleapis.com/auth/spreadsheets`
5. **Auth URI Query Parameters:** `access_type=offline&prompt=consent`
6. Click **Connect my account** → đăng nhập Google → authorize
7. **Name:** "Google Sheets OAuth2 - Shop"
8. Save

### 2.2 Google Drive OAuth2
- Tương tự Sheets, chọn **Google Drive OAuth2 API**
- **Scope:** `https://www.googleapis.com/auth/drive`
- **Name:** "Google Drive OAuth2 - Shop"

### 2.3 Google Calendar OAuth2
- Chọn **Google Calendar OAuth2 API**
- **Scope:** `https://www.googleapis.com/auth/calendar`
- **Name:** "Google Calendar OAuth2 - Shop"

### 2.4 Gmail OAuth2
- Chọn **Gmail OAuth2 API**
- **Scope:** `https://www.googleapis.com/auth/gmail.send` (chỉ cần send)
- **Name:** "Gmail OAuth2 - Shop"

---

## BƯỚC 3: TẠO FACEBOOK CREDENTIAL (nếu dùng Meta Graph API trực tiếp)

Một số workflow (02, 12) dùng HTTP Request gọi Meta Graph API với Page Access Token trong header — không cần tạo credential trong n8n. Chỉ cần paste token vào Header Auth của node HTTP Request.

Nếu muốn tạo credential tái sử dụng:
1. **Credentials** → **New** → search "Facebook"
2. **Facebook Graph API**
3. **Access Token:** paste `FACEBOOK_PAGE_ACCESS_TOKEN`
4. Save

---

## BƯỚC 4: TẠO GENERIC HTTP HEADER AUTH (cho Google Drive)

Workflow 15 dùng HTTP Request với Bearer Token:
1. **Credentials** → **New** → search "Header Auth"
2. Chọn **Header Auth**
3. **Name:** "Authorization"
4. **Value:** `Bearer {GOOGLE_DRIVE_ACCESS_TOKEN}` (paste token thật)
5. Save

> ⚠️ Token này có hạn ~1h. Cần refresh thủ công hoặc refactor workflow dùng OAuth2 credential.

---

## BƯỚC 5: GÁN CREDENTIALS VÀO WORKFLOW

Sau khi tạo xong credentials, cần **gán vào đúng node** trong từng workflow.

### Workflow 01: Telegram AI Agent
- Mở workflow → click node **TelegramTrigger** → chọn credential "Telegram Bot - Shop Main"
- Click node **AI Agent** → **Language Model** sub-node **Gemini 3.1 Flash Lite** → chọn credential Google Gemini (xem bước 6)
- Click node **Send Reply** (Telegram) → chọn credential Telegram
- Click node **Window Buffer Memory** → không cần credential
- Các **Tool: ...** nodes → đã trỏ vào sub-workflow, không cần credential riêng

### Workflow 02: Facebook Gateway
- Webhook node: không cần credential
- HTTP Request nodes (Facebook Graph API): dùng Header Auth với Page Access Token
- AI Agent node: gán Gemini credential

### Workflow 03: Task Scheduler
- Cron node: không cần
- Google Sheets node: gán Google Sheets OAuth2 credential
- Telegram node: gán Telegram credential

### Workflow 04: Media Generator
- HTTP Request node (Gemini API): Header Auth `Authorization: Bearer {GEMINI_API_KEY}` — KHÔNG dùng Gemini credential có sẵn vì dùng custom URL
- Telegram node: gán Telegram credential

### Workflow 05: TikTok Token Refresher
- HTTP Request node: không cần credential (token trong body)
- Google Sheets node: gán Google Sheets OAuth2

### Workflow 06 / 06-Worker
- HTTP Request nodes (Facebook Graph, TikTok API): dùng Header Auth hoặc truyền token trong URL
- Telegram node: gán Telegram credential

### Workflow 07, 09: Fashion/Video Generator
- HTTP Request nodes (Gemini/Veo API): Header Auth với API key
- Telegram node: gán Telegram

### Workflow 08: Gmail Sender
- HTTP Request node (Gmail API): Google OAuth2 credential
- Google Sheets node (DanhBa): Google Sheets OAuth2

### Workflow 10: GDrive Reader
- HTTP Request node: Header Auth với Google Drive Access Token
- Telegram node: Telegram

### Workflow 11: Workspace Assistant
- Google Sheets/Docs nodes: Google Sheets OAuth2
- Gemini HTTP Request: Header Auth

### Workflow 12: Facebook Smart Publisher
- HTTP Request (Telegram getFile): Telegram credential
- HTTP Request (Gemini Vision): Header Auth với API key
- Telegram node (Send Preview): Telegram credential

### Workflow 13: NhatKy Hoa Don
- Gemini HTTP Request: Header Auth
- Google Sheets node: Google Sheets OAuth2

### Workflow 14: Calendar Assistant
- Google Calendar node: Google Calendar OAuth2
- Gemini HTTP Request: Header Auth
- Telegram node: Telegram

### Workflow 15: Product Image Lookup
- HTTP Request (Drive API): Header Auth với Google Drive Access Token

---

## BƯỚC 6: TẠO GEMINI CREDENTIAL (cho LangChain nodes)

Một số workflow dùng LangChain AI Agent với node `@n8n/n8n-nodes-langchain.lmChatGoogleGemini`:
- Workflow 01 (sub-node của AI Agent)
- Workflow 02 (sub-node của AI Agent)

### Cách tạo
1. **Credentials** → **New** → search "Google Gemini"
2. Chọn **Google Gemini (PaLM) API** (nếu có) hoặc **Google Gemini API**
3. **API Key:** paste `GEMINI_API_KEY`
4. Save

> ⚠️ **Lưu ý:** Hiện tại workflow 01 dùng model `gemini-3.1-flash-lite-preview` (preview model). Nếu n8n UI không có sẵn, có thể phải chỉnh sửa node để trỏ đúng model name.

---

## BƯỚC 7: ACTIVE WORKFLOWS

Sau khi gán xong credentials:

1. Mở từng workflow
2. Toggle **Active** (góc trên phải) = ON
3. Workflow phải có background màu xanh
4. Có thể dùng CLI:
   ```bash
   npm run n8n:import
   # Script này sẽ auto-publish tất cả workflows
   ```

---

## BƯỚC 8: TEST CREDENTIALS

```bash
# Test workflow chạy được CLI
N8N_EXECUTE_TIMEOUT_MS=15000 npm run n8n:execute:all
# → Test 6 workflow chính (01, 02, 03, 04, 05, 06)
# → Log ghi vào .n8n/test-runs/

# Smoke test API
npm run test:live-api
# → Test Gemini, Telegram, Facebook, TikTok, Google Sheets
```

Xem kết quả:
- ✅ Tất cả "Connection tested successfully" → OK
- ❌ Có lỗi → xem `06-FAQ-XU-LY-SU-CO.md` mục tương ứng

---

## TIPS QUẢN LÝ CREDENTIALS

### Backup credentials
- Credentials được mã hóa lưu trong `.n8n/.n8n/database.sqlite`
- Backup = copy cả folder `.n8n/`
- Cần backup cùng `N8N_ENCRYPTION_KEY` trong `.env.local`
- ⚠️ KHÔNG commit folder `.n8n/` (đã có trong `.gitignore`)

### Share credentials giữa nhiều workflow
- Một credential có thể dùng cho nhiều node
- vd: "Google Sheets OAuth2 - Shop" dùng cho 5 workflow khác nhau

### Rotate credentials
- Khi token hết hạn / bị lộ, tạo credential mới trong UI
- Click **Update** trên từng node đang dùng credential cũ → chọn credential mới
- Hoặc dùng **Replace all** để thay hàng loạt

### Multi-environment
- Có thể tạo credentials khác nhau cho dev/staging/prod
- vd: "Telegram Bot - Dev", "Telegram Bot - Prod"
- Workflow nào dùng env nào thì gán credential tương ứng
