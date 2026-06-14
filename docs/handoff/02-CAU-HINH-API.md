# 02 - CẤU HÌNH API KEYS

Tài liệu này hướng dẫn **lấy từng API key** cần thiết cho hệ thống. Tất cả key cần paste vào `.env.local` (KHÔNG commit file này).

---

## TÓM TẮT NHANH

| Service | Key/Token cần lấy | File env | Độ khó | Chi phí |
|---------|-------------------|----------|--------|---------|
| Google AI Studio (Gemini) | API Key | `GEMINI_API_KEY` | ⭐ Dễ | Free tier có, **Veo 3.1 cần paid** |
| Telegram | Bot Token | `TELEGRAM_BOT_TOKEN` | ⭐ Dễ | Free |
| Telegram | Admin Chat ID | `ADMIN_TELEGRAM_CHAT_ID` | ⭐ Dễ | Free |
| Facebook | Page Access Token | `FACEBOOK_PAGE_ACCESS_TOKEN` | ⭐⭐ TB | Free |
| Facebook | Page ID | `FACEBOOK_PAGE_ID` | ⭐ Dễ | Free |
| Facebook | Webhook Verify Token | `FACEBOOK_WEBHOOK_VERIFY_TOKEN` | ⭐ Dễ | Free (tự đặt) |
| TikTok | Client Key | `TIKTOK_CLIENT_KEY` | ⭐⭐ TB | Free (sandbox) |
| TikTok | Client Secret | `TIKTOK_CLIENT_SECRET` | ⭐⭐ TB | Free |
| TikTok | Refresh Token | `TIKTOK_REFRESH_TOKEN` | ⭐⭐⭐ Khó | Cần app review cho public |
| Google | OAuth2 (Sheets/Drive/Calendar/Gmail) | (qua UI n8n) | ⭐⭐ TB | Free |
| Google Drive | Folder ID | `COMMENT_BOT_DRIVE_FOLDER_ID` | ⭐ Dễ | Free |
| Google Sheets | Document ID | `GOOGLE_SHEETS_DOCUMENT_ID` | ⭐ Dễ | Free |

---

## 1. GEMINI API KEY (Google AI Studio)

Hệ thống dùng cho: AI Agent (Workflow 01, 02, 12, 13, 14), Media Generator (04), Video Generator (09), Fashion Image (07), Gmail Sender (08).

### Bước 1: Tạo project Google Cloud (nếu chưa có)
1. Truy cập [Google AI Studio](https://aistudio.google.com/)
2. Đăng nhập bằng tài khoản Google
3. Click **"Get API key"** ở menu trái
4. Click **"Create API key"** → chọn project có sẵn hoặc tạo mới

### Bước 2: Bật billing (BẮT BUỘC cho Veo 3.1)
1. Vào [Google Cloud Console](https://console.cloud.google.com/)
2. Chọn project vừa tạo
3. Menu **Billing** → **Link a billing account**
4. Thêm thẻ Visa/Master, enable billing

> ⚠️ **Veo 3.1 Generate Preview** chỉ chạy với paid tier. Nếu không enable billing, Workflow 09 sẽ lỗi `403 PERMISSION_DENIED`.

### Bước 3: Copy API key
- Key có dạng: `AIzaSy...` (39 ký tự)
- Paste vào `.env.local`:
  ```
  GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>
  ```

### Test
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```
→ Mong đợi: JSON response có `candidates[0].content.parts[0].text`

---

## 2. TELEGRAM BOT TOKEN

Hệ thống dùng cho: tất cả workflow Telegram (01, 03, 06, 08, 09, 10, 11, 12, 13, 14).

### Bước 1: Tạo bot
1. Mở Telegram, tìm [@BotFather](https://t.me/BotFather)
2. Gửi `/newbot`
3. Đặt tên bot (vd: "My Shop AI Bot")
4. Đặt username (vd: `myshop_ai_bot`) — phải kết thúc bằng `bot`
5. BotFather reply token, vd: `<YOUR_TELEGRAM_BOT_TOKEN>`

### Bước 2: Lấy Chat ID của admin
1. Mở bot vừa tạo, gửi `/start`
2. Truy cập: `https://api.telegram.org/bot<TOKEN>/getUpdates`
3. Tìm field `chat.id` trong response → đó là admin chat ID
4. Hoặc dùng [@userinfobot](https://t.me/userinfobot) để lấy chat ID

### Bước 3: Paste vào .env.local
```
TELEGRAM_BOT_TOKEN=<YOUR_TELEGRAM_BOT_TOKEN>
ADMIN_TELEGRAM_CHAT_ID=670923744
```

---

## 3. FACEBOOK PAGE ACCESS TOKEN

Hệ thống dùng cho: Workflow 02 (Facebook Gateway), 06, 12.

### Bước 1: Tạo Facebook App
1. Truy cập [Facebook Developer](https://developers.facebook.com/)
2. **My Apps** → **Create App** → chọn **"Business"**
3. Đặt tên, email liên hệ
4. Trong dashboard, thêm product **"Webhooks"** và **"Facebook Login for Business"**

### Bước 2: Thêm Page & lấy Page Access Token
1. **Tools** → **Graph API Explorer**
2. Chọn app vừa tạo
3. **User or Page** → chọn Page của bạn
4. **Permissions** cần có:
   - `pages_manage_posts`
   - `pages_read_engagement`
   - `pages_manage_engagement`
   - `pages_messaging`
   - `pages_read_user_content`
5. Click **Generate Access Token**
6. Copy token, vd: `<YOUR_FACEBOOK_PAGE_ACCESS_TOKEN>`

### Bước 3: Extend token (long-lived)
- Page Access Token mặc định chỉ sống 1-2 giờ. Cần extend:
```bash
curl "https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=APP_ID&client_secret=APP_SECRET&fb_exchange_token=SHORT_LIVED_TOKEN"
```
- Long-lived token sống 60 ngày

### Bước 4: Lấy Page ID
- Vào Page → **About** → **Page ID** (số)
- Hoặc: `https://graph.facebook.com/v18.0/me?access_token=TOKEN` → `id`

### Bước 5: Đặt Webhook
> [!NOTE]
> **Yêu cầu cài đặt `cloudflared` (Cloudflare Tunnel CLI) nếu chạy local:**
> *   **macOS:** `brew install cloudflared`
> *   **Linux:** `sudo apt-get install cloudflared`
> *   **Windows:** Tải file `cloudflared.exe` từ trang chủ Cloudflare và cấu hình biến PATH.
>
> Kiểm tra bằng lệnh: `cloudflared --version`

1. **App Dashboard** → **Webhooks** → **Edit Subscription**
2. **Callback URL:** URL webhook Workflow 02 (sẽ có sau khi chạy `npm run n8n:start:cloudflare`)
   - Vd local: `https://<cloudflare-tunnel>.trycloudflare.com/webhook/facebook`
3. **Verify Token:** tự đặt chuỗi bất kỳ, vd: `my_secret_verify_2026`
4. **Subscription Fields:** `messages`, `messaging_postbacks`, `feed` (cho comment), `comments`
5. Click **Verify and Save** → Meta sẽ gọi GET đến webhook URL, workflow 02 phải trả về `hub.challenge`

### Bước 6: Subscribe Page vào App
- Vào **Page Settings** → **Advanced Messaging** → chọn App vừa tạo

### Paste vào .env.local
```
FACEBOOK_PAGE_ACCESS_TOKEN=<YOUR_FACEBOOK_PAGE_ACCESS_TOKEN>
FACEBOOK_PAGE_ID=123456789
FACEBOOK_WEBHOOK_VERIFY_TOKEN=my_secret_verify_2026
```

---

## 4. TIKTOK API

Hệ thống dùng cho: Workflow 05 (refresh token), 06, 06-Worker (direct post video).

### Bước 1: Tạo TikTok Developer App
1. Truy cập [TikTok Developer Portal](https://developers.tiktok.com/)
2. **Apps** → **Create App** → chọn **"Content Posting API"**
3. Điền thông tin, scopes: `user.info.basic`, `video.publish`, `video.upload`
4. Submit để review (public post cần review; sandbox cho phép test)

### Bước 2: Lấy Client Key & Secret
- Trong App dashboard, tab **"Credentials"** → copy **Client Key** & **Client Secret**

### Bước 3: OAuth flow để lấy Refresh Token
1. Tạo URL authorize:
   ```
   https://www.tiktok.com/v2/auth/authorize?client_key=CLIENT_KEY&scope=user.info.basic,video.publish&response_type=code&redirect_uri=YOUR_REDIRECT_URI
   ```
2. Mở URL trong browser, đăng nhập TikTok, authorize
3. Redirect sẽ chứa `?code=AUTHORIZATION_CODE`
4. Đổi code lấy token:
   ```bash
   curl -X POST "https://open.tiktokapis.com/v2/oauth/token/" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "client_key=CLIENT_KEY&client_secret=CLIENT_SECRET&code=AUTHORIZATION_CODE&grant_type=authorization_code&redirect_uri=YOUR_REDIRECT_URI"
   ```
5. Response chứa `refresh_token` (sống 365 ngày) và `access_token` (sống 24h)

### Bước 4: Paste vào .env.local
```
TIKTOK_CLIENT_KEY=aw1234567890abcdef
TIKTOK_CLIENT_SECRET=abc123def456
TIKTOK_REFRESH_TOKEN=rft.1234567890...
```
*(Lưu ý: Không cần thiết lập biến TIKTOK_ACCESS_TOKEN tĩnh trong file env nữa vì hệ thống đã chuyển sang sử dụng token được lưu trữ động trong Google Sheet)*

---

## 5. GOOGLE OAUTH2 (Sheets, Drive, Calendar, Gmail)

Hệ thống dùng cho: Tất cả workflow Google (02, 03, 06, 08, 11, 13, 14, 15).

### Bước 1: Tạo Google Cloud Project
1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới (vd: `n8n-shop-automation`)

### Bước 2: Enable APIs
Vào **APIs & Services** → **Library**, enable các API sau:
- Google Sheets API
- Google Drive API
- Google Calendar API
- Gmail API

### Bước 3: Tạo OAuth 2.0 Client
1. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**
2. **Application type:** Web application
3. **Authorized redirect URIs:**
   - Local: `http://127.0.0.1:5678/rest/oauth2-credential/callback`
   - Production: `https://your-domain.com/rest/oauth2-credential/callback`
4. Click **Create** → copy **Client ID** & **Client Secret**

### Bước 4: Cấu hình OAuth Consent Screen
1. **OAuth consent screen** → **External** (chọn nếu chưa verify)
2. Điền app name, support email
3. **Scopes** thêm:
   - `https://www.googleapis.com/auth/spreadsheets`
   - `https://www.googleapis.com/auth/drive`
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.readonly`
4. **Test users:** thêm email admin (vd: admin@shop.com) — bắt buộc nếu chưa verify app
5. Save

### Bước 5: Authorize trong n8n UI
1. Mở n8n UI: `http://127.0.0.1:5678`
2. Vào **Credentials** → **New** → chọn **Google Sheets OAuth2**
3. Paste Client ID & Client Secret
4. Click **Connect my account** → đăng nhập Google → authorize
5. Tương tự cho Google Drive, Google Calendar, Gmail

> ⚠️ **Lưu ý:** Nếu app ở chế độ **Testing**, token chỉ sống 7 ngày. Để dùng lâu dài, cần **Publish App** (cần verify với Google, mất vài ngày).

---

## 6. GOOGLE SHEETS DOCUMENT ID

Hệ thống dùng cho: Workflow 03 (`CongViec`), 13 (`Nhật ký hóa đơn`), và các sheet khác.

### Bước 1: Tạo Google Sheet
1. Tạo spreadsheet mới, đặt tên (vd: "Shop Master Data")
2. Tạo các tab:
   - `DonHang` (workflow 01, 02) — A: STT, B: Ngày, C: Tên KH, D: SĐT, E: Địa chỉ, F: Sản phẩm, G: Ghi chú
   - `CongViec` (workflow 03) — A: STT, B: Ngày, C: Công việc, D: Trạng thái
   - `Tokens` (workflow 05) — A: Platform, B: Access Token, C: Refresh Token, D: Expires At
   - `DanhBa` (workflow 08) — A: Tên, B: Email, C: SĐT, D: Công ty
   - `NhatKyHoaDon` (workflow 13) — 11 cột theo tài liệu

### Bước 2: Lấy Document ID
- URL sheet có dạng: `https://docs.google.com/spreadsheets/d/1MzDQTCMIY2RdSOHwTKMM2y-BTlELIH9IuRLXE7s5lrQ/edit`
- ID là phần giữa `/d/` và `/edit`: `1MzDQTCMIY2RdSOHwTKMM2y-BTlELIH9IuRLXE7s5lrQ`

### Bước 3: Paste vào .env.local
```
GOOGLE_SHEETS_DOCUMENT_ID=1MzDQTCMIY2RdSOHwTKMM2y-BTlELIH9IuRLXE7s5lrQ
GOOGLE_ORDERS_SHEET_NAME=DonHang
GOOGLE_TASKS_SHEET_NAME=CongViec
GOOGLE_TOKENS_SHEET_NAME=Tokens
```

---

## 7. GOOGLE DRIVE FOLDER (cho Workflow 15)

### Bước 1: Tạo cấu trúc folder
```
CommentBotImages/                          ← COMMENT_BOT_DRIVE_FOLDER_ID
├── VD01-den/
│   ├── 01-front.jpg
│   ├── 02-back.jpg
│   └── 03-detail.jpg
├── VD01-trang/
│   └── 01-front.jpg
├── VD28/
│   ├── 01-front.jpg
│   └── 02-back.jpg
```

### Bước 2: Share folder
- Click phải folder cha **CommentBotImages** → **Share**
- **General access:** "Anyone with the link" → **Viewer**
- Copy link → lấy Folder ID từ URL

### Bước 3: Cấu hình Folder ID
- Copy Folder ID vừa lấy được (chuỗi ký tự ở cuối URL thư mục trên Drive).
- Paste vào `.env.local`:
  ```
  COMMENT_BOT_DRIVE_FOLDER_ID=1AbCdEfGhIjKlMnOpQrStUvWxYz
  ```

> [!NOTE]
> **Không cần sử dụng `GOOGLE_DRIVE_ACCESS_TOKEN`:**
> Workflow 15 đã được cập nhật để sử dụng trực tiếp Google Drive OAuth2 API Credential của n8n (được tạo ở Bước 5 mục 5 phía trên) để truy xuất ảnh sản phẩm, đảm bảo hệ thống tự động làm mới token và hoạt động liên tục 24/7 mà không cần cập nhật token thủ công qua `.env.local`.

---

## 8. N8N_ENCRYPTION_KEY

**BẮT BUỘC** cho mọi hệ thống. Dùng để mã hóa credentials lưu trong SQLite.

### Generate
```bash
openssl rand -hex 32
```
→ Output: 64 ký tự hex, vd: `<YOUR_N8N_ENCRYPTION_KEY>`

### Paste vào .env.local
```
N8N_ENCRYPTION_KEY=<YOUR_N8N_ENCRYPTION_KEY>
```

> ⚠️ **QUAN TRỌNG:** KHÔNG ĐỔI key sau khi đã tạo credentials thật trong UI n8n. Nếu đổi, tất cả credentials sẽ không decrypt được → phải tạo lại từ đầu.
>
> Nếu mất key → xóa thư mục `.n8n/` (chứa SQLite + credentials), chạy lại `npm run n8n:start` để tạo database mới.

---

## KIỂM TRA TỔNG HỢP

Sau khi điền xong `.env.local`, chạy:
```bash
# 1. Test n8n có load được env không
npm run n8n:start
# → Xem log: nếu có lỗi "Missing environment variable N8N_ENCRYPTION_KEY" → check lại

# 2. Test từng service
npm run test:live-api
# → Script này test Gemini, Telegram, Facebook, TikTok, Google Sheets API
```

Xem chi tiết test từng workflow trong `01-DANH-SACH-WORKFLOW.md` mục "TEST NHANH TỪNG WORKFLOW".
