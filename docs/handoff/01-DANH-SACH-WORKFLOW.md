# 01 - DANH SÁCH 16 WORKFLOWS

Hệ thống gồm **16 workflows** chia thành 4 nhóm chức năng. Workflow nào đã có tài liệu chi tiết (`docs/workflows/XX_Name.md`) sẽ có link kèm theo.

---

## A. ENTRY POINTS (4 workflows) — Kích hoạt bởi event bên ngoài

| # | Workflow | Trigger | Mục đích | Tài liệu |
|---|----------|---------|----------|----------|
| 01 | `01_Telegram_AI_Agent` | Telegram message | AI Agent chính cho admin: hiểu intent tiếng Việt, tự gọi sub-workflow | [docs/workflows/01_Telegram_Gateway.md](workflows/01_Telegram_Gateway.md) (legacy) |
| 02 | `02_Facebook_Gateway` | Webhook Facebook | Webhook fanpage: verify Meta, auto-reply Messenger/comment, AI Agent xử lý | [docs/workflows/02_Facebook_Gateway.md](workflows/02_Facebook_Gateway.md) |
| 03 | `03_Task_Scheduler` | Cron hàng ngày | Đọc Google Sheets `CongViec` → nhắc việc Telegram | [docs/workflows/03_Task_Scheduler.md](workflows/03_Task_Scheduler.md) |
| 05 | `05_TikTok_Token_Refresher` | Cron mỗi 12h | Refresh TikTok access token, lưu vào Google Sheets `Tokens` | [docs/workflows/05_TikTok_Token_Refresher.md](workflows/05_TikTok_Token_Refresher.md) |

---

## B. AI CAPABILITIES (4 workflows) — Sub-workflow sinh nội dung

| # | Workflow | Trigger | Mục đích | Tài liệu |
|---|----------|---------|----------|----------|
| 04 | `04_Media_Generator` | Từ AI Agent | Sinh ảnh từ prompt bằng **Gemini 3.1 Flash Image (Imagen 3)** | [docs/workflows/04_Media_Generator.md](workflows/04_Media_Generator.md) |
| 07 | `07_Fashion_Image_Generator` | Từ AI Agent | Ghép ảnh sản phẩm thời trang lên mẫu (Vision + Imagen) | (xem workflows/07) |
| 09 | `09_Video_Generator` | Từ AI Agent | Sinh video 8-10s từ ảnh sản phẩm bằng **Veo 3.1** (LRO polling) | (xem workflows/09) |
| 12 | `12_Facebook_Smart_Publisher` | Từ AI Agent | AI Content Studio cho Facebook: caption Tiếng Việt từ ảnh/video/topic, duyệt qua Telegram | [docs/workflows/12_Facebook_Smart_Publisher.md](workflows/12_Facebook_Smart_Publisher.md) |

---

## C. COMMUNICATION (2 workflows) — Gửi/nhận kênh ngoài

| # | Workflow | Trigger | Mục đích | Tài liệu |
|---|----------|---------|----------|----------|
| 06 | `06_Social_Publisher` | Từ AI Agent / 12 | Tạo hàng chờ đăng bài, gọi Worker thực thi | [docs/workflows/06_Social_Publisher.md](workflows/06_Social_Publisher.md) |
| 06-W | `06_Social_Publisher_Worker` | Từ 06 (Execute Workflow) | Worker: đợi tới lịch → đăng Facebook + direct-post TikTok | (xem workflows/06_Social_Publisher_Worker) |
| 08 | `08_Gmail_Email_Sender` | Từ AI Agent | Tra cứu danh bạ Sheets → soạn email Gemini → gửi Gmail | (xem workflows/08) |

---

## D. PRODUCTIVITY (6 workflows) — Trợ lý nội bộ

| # | Workflow | Trigger | Mục đích | Tài liệu |
|---|----------|---------|----------|----------|
| 10 | `10_Telegram_GDrive_Reader` | Từ AI Agent | Tìm & đọc file Google Drive qua Telegram | (xem workflows/10) |
| 11 | `11_Workspace_Assistant` | Từ AI Agent | Thao tác Google Sheets/Docs nâng cao (format, lọc, kẻ bảng) | (xem workflows/11) |
| 13 | `13_NhatKyHoaDon_Assistant` | Từ AI Agent | Đọc/ghi Google Sheet "Nhật ký hóa đơn" qua Telegram | [docs/workflows/13_NhatKyHoaDon_Assistant.md](workflows/13_NhatKyHoaDon_Assistant.md) |
| 14 | `14_Calendar_Assistant` | Từ AI Agent | Tạo lịch Google Calendar từ chat tiếng Việt | [docs/workflows/14_Calendar_Assistant.md](workflows/14_Calendar_Assistant.md) |
| 15 | `15_Product_Image_Lookup` | Từ AI Agent (02) | Tra cứu ảnh sản phẩm theo SKU từ Google Drive | [docs/workflows/15_Product_Image_Lookup.md](workflows/15_Product_Image_Lookup.md) |

---

## E. SAVE ORDER (1 workflow) — Inline sub-workflow

| # | Workflow | Trigger | Mục đích | Tài liệu |
|---|----------|---------|----------|----------|
| 01-S | `01_Save_Order` (inline) | Từ 01 AI Agent | Lưu đơn hàng từ Telegram → Google Sheets `DonHang` + gửi xác nhận | (xem config/workflow-capabilities.json) |

---

## CHI TIẾT TỪNG WORKFLOW

### 01_Telegram_AI_Agent
- **ID n8n:** `wf01telegramagent`
- **Trigger:** Telegram message
- **AI Model:** Gemini 3.1 Flash Lite (LangChain Agent)
- **Memory:** Window Buffer Memory (10 messages)
- **Tools (sub-workflows):** Media Generator, Fashion Image, Video Generator, FB Smart Publisher, Gmail, GDrive, Workspace, Save Order, NhatKy, Calendar
- **Lệnh mẫu:**
  - "Tạo ảnh: váy đỏ lụa tơ tằm"
  - "Dựng video catwalk từ ảnh đính kèm"
  - "Lưu đơn anh Nam 0901234567 mua áo thun"
  - "Đặt lịch mai 14h họp team"
  - "Ghi hóa đơn: váy đỏ 500k khách Trang"

### 02_Facebook_Gateway
- **ID n8n:** `wf02facebookgateway`
- **Trigger:** Facebook Webhook (Messenger + Comments)
- **Verify Token:** `FACEBOOK_WEBHOOK_VERIFY_TOKEN`
- **AI Model:** Gemini 3.1 Flash Lite
- **Tools:** Product Image Lookup, AI auto-reply
- **Tính năng:** verify webhook, parse event, AI reply, lưu tín hiệu chốt đơn

### 03_Task_Scheduler
- **ID n8n:** `wf03taskscheduler`
- **Trigger:** Cron (mặc định: 8h sáng hàng ngày)
- **Input:** Google Sheet `CongViec`
- **Output:** Gửi Telegram cho admin

### 04_Media_Generator
- **ID n8n:** `wf04mediagenerator`
- **Trigger:** Từ 01 (Execute Workflow)
- **Input:** `{prompt: string}`
- **AI Model:** Gemini 3.1 Flash Image (Imagen 3)
- **Output:** Telegram photo message

### 05_TikTok_Token_Refresher
- **ID n8n:** `wf05tiktoktokenrefresher`
- **Trigger:** Cron mỗi 12h
- **API:** TikTok OAuth `/oauth/token/`
- **Output:** Cập nhật Google Sheet `Tokens`

### 06_Social_Publisher
- **ID n8n:** `wf06socialpublisher`
- **Trigger:** Từ 01, 12 (Execute Workflow)
- **Input:** `{title, content, image_url, video_url, publish_at, platform}`
- **Output:** Lưu pending post → gọi Worker

### 06_Social_Publisher_Worker
- **ID n8n:** `wf06socialpublisherworker`
- **Trigger:** Từ 06 (Execute Workflow)
- **Input:** Pending post từ `.n8n/pending_posts.json`
- **Output:** Đăng Facebook Scheduled Post + TikTok Direct Post

### 07_Fashion_Image_Generator
- **ID n8n:** `wf07fashionimagegenerator`
- **Trigger:** Từ 01
- **Input:** `{photo_file_id: Telegram file_id}`
- **AI Model:** Gemini Vision + Imagen
- **Output:** Ảnh thời trang đã ghép mẫu

### 08_Gmail_Email_Sender
- **ID n8n:** `wf08gmailemailsender`
- **Trigger:** Từ 01
- **Input:** `{recipient_name, subject_hint, body_hint}`
- **Output:** Email Gmail đã gửi

### 09_Video_Generator
- **ID n8n:** `wf09videogenerator`
- **Trigger:** Từ 01
- **Input:** `{photo_file_id, motion_preset}`
- **AI Model:** Veo 3.1 Generate Preview (LRO + polling 15s)
- **Output:** Video MP4 gửi Telegram

### 10_Telegram_GDrive_Reader
- **ID n8n:** `wf10telegramgdrivereader`
- **Trigger:** Từ 01
- **Input:** `{query: string}`
- **Output:** Nội dung file Google Drive

### 11_Workspace_Assistant
- **ID n8n:** `wf11workspaceassistant`
- **Trigger:** Từ 01
- **Input:** `{action: format|filter|create_doc, sheet_or_doc_id, ...}`
- **Output:** Sheet/Doc đã chỉnh sửa

### 12_Facebook_Smart_Publisher
- **ID n8n:** `wf12facebooksmartpublisher`
- **Trigger:** Từ 01
- **Input:** `{mode: ai|manual, photo_file_id?, video_file_id?, topic?, caption?}`
- **AI Model:** Gemini 3.1 Flash Lite (Vision + Text)
- **Output:** Preview Telegram → duyệt → gọi 06

### 13_NhatKyHoaDon_Assistant
- **ID n8n:** `wf13nhatkyass`
- **Trigger:** Từ 01
- **Input:** `{user_message: string}`
- **AI Model:** Gemini 3.1 Flash Lite
- **Output:** Google Sheet "Nhật ký hóa đơn" (11 cột, 6 trường bắt buộc)

### 14_Calendar_Assistant
- **ID n8n:** `wf14calendar`
- **Trigger:** Từ 01
- **Input:** `{user_message: string}`
- **AI Model:** Gemini 3.1 Flash Lite
- **Scope:** Chỉ CREATE (READ/DELETE out-of-scope)
- **Output:** Google Calendar event trên `primary`

### 15_Product_Image_Lookup
- **ID n8n:** `wf15productimagelookup`
- **Trigger:** Từ 02
- **Input:** `{user_message, chat_id, source}`
- **Logic:** Regex parse SKU `VDxx` + variation → query Drive `name contains`
- **Output:** Image URLs (tối đa 3) để AI reply Facebook comment kèm ảnh

### 01_Save_Order (inline)
- **ID n8n:** inline trong 01
- **Trigger:** Từ 01 AI Agent
- **Output:** Google Sheet `DonHang` + Telegram confirmation

---

## TEST NHANH TỪNG WORKFLOW

Xem chi tiết từng workflow trong `docs/workflows/`. Một số test nhanh:

```bash
# Test 1: Tạo ảnh
Gửi Telegram: "Tạo ảnh: váy lụa đỏ"
→ Mong đợi: bot reply kèm ảnh trong 10-20s

# Test 2: Lưu đơn
Gửi Telegram: "Lưu đơn anh Nam 0901234567 Q1 mua áo thun"
→ Mong đợi: bot confirm + row mới trong Google Sheet DonHang

# Test 3: Facebook comment
Comment "Cho xem ảnh VD01 đen" trên Fanpage
→ Mong đợi: tự động reply comment kèm ảnh sản phẩm

# Test 4: Calendar
Gửi Telegram: "Đặt lịch mai 14h-15h họp team"
→ Mong đợi: event mới trong Google Calendar primary

# Test 5: Nhat ky hoa don
Gửi Telegram: "Ghi hóa đơn: khách Trang, váy đỏ 500k, tiền mặt"
→ Mong đợi: row mới trong Google Sheet "Nhật ký hóa đơn"
```

---

## DEPENDENCIES GIỮA CÁC WORKFLOW

```
01_Telegram_AI_Agent
├── 04_Media_Generator (tool)
├── 07_Fashion_Image_Generator (tool)
├── 09_Video_Generator (tool)
├── 12_Facebook_Smart_Publisher (tool)
│   └── 06_Social_Publisher (tool)
│       └── 06_Social_Publisher_Worker (execute workflow)
├── 08_Gmail_Email_Sender (tool)
├── 10_Telegram_GDrive_Reader (tool)
├── 11_Workspace_Assistant (tool)
├── 01_Save_Order (inline tool)
├── 13_NhatKyHoaDon_Assistant (tool)
└── 14_Calendar_Assistant (tool)

02_Facebook_Gateway
├── 01_Save_Order (khi có deal)
└── 15_Product_Image_Lookup (tool)

03_Task_Scheduler (độc lập)
05_TikTok_Token_Refresher (độc lập)
```

**Lưu ý:** Workflow 01 phụ thuộc vào 10 sub-workflow. Nếu KH muốn tắt 1 sub-workflow, phải xóa tool tương ứng trong 01 để tránh lỗi.
