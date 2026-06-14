# 04 - KIẾN TRÚC HỆ THỐNG

Tài liệu này mô tả **kiến trúc tổng thể** của hệ thống n8n AI Automation, bao gồm: sơ đồ thành phần, luồng dữ liệu, nguyên tắc thiết kế, và các quyết định kỹ thuật chính.

---

## 1. KIẾN TRÚC TỔNG THỂ (4 LỚP)

```
┌────────────────────────────────────────────────────────────────────┐
│ LỚP 1: INTERFACE CHANNELS (Kênh giao tiếp bên ngoài)              │
│  - Telegram Bot (admin)                                             │
│  - Facebook Page (Messenger + Comments)                            │
│  - TikTok (Direct Post Video)                                      │
│  - Google Calendar / Sheets / Drive / Gmail                        │
└────────────────────────────────────────────────────────────────────┘
                                ↓↑
┌────────────────────────────────────────────────────────────────────┐
│ LỚP 2: AI GATEWAY (Điều phối AI)                                   │
│  - 01_Telegram_AI_Agent (LangChain Agent + Gemini Flash Lite)       │
│  - 02_Facebook_Gateway (Webhook + AI Agent)                        │
│  - 03_Task_Scheduler (Cron + AI nhắc việc)                        │
│  - 05_TikTok_Token_Refresher (Cron)                                 │
└────────────────────────────────────────────────────────────────────┘
                                ↓↑
┌────────────────────────────────────────────────────────────────────┐
│ LỚP 3: TOOL LAYER (Sub-Workflows - 10 cái)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │ AI Image │ │ AI Video │ │ AI Email │ │ AI Sheet │               │
│  │ Imagen 3 │ │ Veo 3.1  │ │ Gemini   │ │ Vision   │               │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │ Social   │ │ Calendar │ │ Product  │ │ Workspace│               │
│  │ Publisher│ │ Assistant│ │ Lookup   │ │ Assistant│               │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘               │
└────────────────────────────────────────────────────────────────────┘
                                ↓↑
┌────────────────────────────────────────────────────────────────────┐
│ LỚP 4: STORAGE & EXTERNAL APIs                                     │
│  - Google Sheets (data: orders, contacts, calendar, tokens)        │
│  - Google Drive (assets: product images)                            │
│  - Google Calendar (events)                                         │
│  - Gmail (sent emails log)                                          │
│  - Telegram Bot API                                                  │
│  - Facebook Graph API                                                │
│  - TikTok Content Posting API                                        │
│  - Google Gemini API                                                 │
│  - n8n SQLite (executions, credentials, workflows)                  │
└────────────────────────────────────────────────────────────────────┘
```

---

## 2. SƠ ĐỒ LUỒNG DỮ LIỆU CHI TIẾT

### 2.1 Luồng chính: Admin chat Telegram → AI xử lý → Reply

```
Admin (Telegram)
  │ "Tạo ảnh: váy đỏ lụa tơ tằm"
  ↓
[Telegram Bot API]
  ↓ Webhook POST
[01_Telegram_AI_Agent]
  ├─→ TelegramTrigger (nhận message)
  ├─→ Prepare Message (code node: extract user_message, chat_id)
  ├─→ AI Agent (LangChain + Gemini Flash Lite)
  │    ├─→ Window Buffer Memory (context 10 tin nhắn)
  │    ├─→ Tool: Media Generator (gemini-3.1-flash-image)
  │    │    └─→ [04_Media_Generator]
  │    │         ├─→ HTTP Request POST Gemini API
  │    │         ├─→ Parse response (base64 → binary)
  │    │         └─→ Telegram Send Photo
  │    └─→ Reply text + image
  └─→ Send Reply (Telegram)
  ↓
Admin nhận: ảnh + caption
```

### 2.2 Luồng Facebook: Khách comment → AI reply kèm ảnh

```
Khách (Facebook)
  │ Comment: "Cho xem ảnh VD01 đen"
  ↓
[Facebook Webhook]
  ↓ POST
[02_Facebook_Gateway]
  ├─→ Webhook (verify Meta)
  ├─→ Switch (route theo event: message vs comment)
  ├─→ AI Agent
  │    ├─→ Tool: Product Image Lookup
  │    │    └─→ [15_Product_Image_Lookup]
  │    │         ├─→ Extract SKU (regex parse VD01)
  │    │         ├─→ HTTP Request Drive API (name contains VD01-den)
  │    │         └─→ Return image_urls[]
  │    └─→ Reply comment kèm attachment_url
  └─→ HTTP Request Facebook Graph API (POST /{page-id}/comments)
  ↓
Khách nhận: comment reply + ảnh đính kèm
```

### 2.3 Luồng Video: Tạo video từ ảnh (long-running)

```
Admin (Telegram)
  │ Reply vào ảnh: "Dựng video catwalk"
  ↓
[01_Telegram_AI_Agent]
  └─→ Tool: Video Generator
       └─→ [09_Video_Generator]
            ├─→ Extract photo (Telegram getFile → binary)
            ├─→ Build Veo API request (multipart upload)
            ├─→ POST https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:generateVideo
            │   → Response: {operation: "projects/.../operations/abc"}
            ├─→ Wait 15s
            ├─→ GET .../operations/abc (poll status)
            │   → Response: {done: false}
            ├─→ Wait 15s
            ├─→ GET .../operations/abc
            │   → Response: {done: true, response.generatedVideo.uri}
            ├─→ HTTP GET video URI → binary
            └─→ Telegram Send Video
  ↓
Admin nhận: video MP4 (8-10s)
```

### 2.4 Luồng Social Publisher: Đăng bài Facebook + TikTok

```
Admin (Telegram qua 12 hoặc trực tiếp từ 01)
  │ "Đăng Facebook: ảnh váy đỏ với caption 'Sale 50%'"
  ↓
[01_Telegram_AI_Agent]
  └─→ Tool: Social Publisher
       └─→ [06_Social_Publisher]
            ├─→ Save pending post → .n8n/pending_posts.json
            └─→ Call [06_Social_Publisher_Worker] (Execute Workflow)
                 └─→ Worker:
                      ├─→ Wait until publish_at
                      ├─→ Expand targets (Facebook, TikTok, or both)
                      ├─→ For Facebook:
                      │    ├─→ POST /{page-id}/feed (with image_url)
                      │    └─→ Response: post_id
                      ├─→ For TikTok:
                      │    ├─→ Upload video binary
                      │    ├─→ POST /v2/post/publish/video/init/
                      │    └─→ Poll publish status
                      └─→ Telegram notify "Đã đăng thành công"
  ↓
Facebook Page: post mới
TikTok Page: video mới
Admin (Telegram): "Đã đăng thành công!"
```

---

## 3. NGUYÊN TẮC THIẾT KẾ (DESIGN PRINCIPLES)

### 3.1 KISS (Keep It Simple, Stupid)
- **Không over-engineer:** Workflow tra cứu SKU (15) dùng regex đơn giản, không cần LLM/vector search
- **Sub-workflow nhỏ:** Mỗi sub-workflow 5-20 nodes, dễ hiểu, dễ debug
- **Tool thay vì inline:** Tách logic phức tạp thành sub-workflow làm tool cho AI Agent

### 3.2 Fail-Closed
- Validate input **trước** khi xử lý: nếu thiếu field bắt buộc → fail sớm
- AI parse JSON output → validate schema → fail nếu sai
- Workflow 14 (Calendar): nếu thiếu `title`/`start`/`end` → reply Telegram "Vui lòng cung cấp đầy đủ" thay vì tạo event rỗng
- Workflow 13 (NhatKy): 6 trường bắt buộc, thiếu 1 → reply yêu cầu bổ sung

### 3.3 Modular & Composable
- Mỗi workflow là 1 module độc lập với input/output rõ ràng
- Sub-workflow có thể gọi từ nhiều nơi (vd: Save Order gọi từ cả 01 và 02)
- Tool nodes trong AI Agent cho phép LLM tự quyết định workflow nào cần gọi

### 3.4 Stateless Tools
- Sub-workflow tools **không lưu state** — chỉ nhận input → xử lý → return output
- State lưu ở: Google Sheets (orders, contacts, tokens), n8n SQLite (executions, credentials)
- Trừ workflow 06 (queue pending posts vào `.n8n/pending_posts.json`)

### 3.5 Observable
- Mỗi execution có execution_id trong n8n UI (Executions tab)
- Có thể xem log chi tiết từng node
- Code nodes có console.log để debug
- Error workflow có thể gửi Telegram alert

### 3.6 Source-of-Truth ở Storage
- Đơn hàng → Google Sheets `DonHang` (KH xem & sửa trực tiếp)
- Token TikTok → Google Sheets `Tokens` (workflow 05 tự refresh)
- Calendar events → Google Calendar (KH xem trên Calendar UI)
- **KHÔNG duplicate** data này trong n8n SQLite

---

## 4. CÁC QUYẾT ĐỊNH KỸ THUẬT CHÍNH

### 4.1 Tại sao chọn Gemini 3.1 Flash Lite?
- **Giá rẻ:** $0.075/1M input tokens (rẻ hơn GPT-4o mini 50%)
- **Nhanh:** ~500ms response time
- **Hỗ trợ tiếng Việt tốt:** fine-tune cho Tiếng Việt
- **Context window 1M tokens:** đủ cho hầu hết use case
- **Native multimodal:** Vision + Text + Image generation trong cùng API

### 4.2 Tại sao tách Gateway (01) và Tools (sub-workflows)?
- **Gateway:** chứa logic orchestration, AI Agent, memory — phức tạp, ít thay đổi
- **Tools:** mỗi tool 1 nhiệm vụ, dễ thay thế, dễ mở rộng
- Thêm tool mới = tạo sub-workflow + add `toolWorkflow` vào AI Agent
- Xóa tool = xóa sub-workflow + xóa node trong AI Agent

### 4.3 Tại sao dùng HTTP Request thay vì built-in node (một số chỗ)?
- **Veo 3.1 chưa có built-in node** → phải dùng HTTP Request
- **Google Drive cần query string động** (`name contains` + parent folder) → HTTP Request rõ ràng hơn Google Drive node
- **Facebook Graph API** dùng nhiều endpoint khác nhau → HTTP Request linh hoạt hơn Facebook node

### 4.4 Tại sao Google Sheets thay vì Database?
- **Miễn phí, không cần hosting:** Google Sheets là storage as a service
- **KH tự sửa được:** KH mở Sheets sửa data trực tiếp, không cần dev
- **Đủ nhanh** cho scale nhỏ-vừa: 60 req/min/user đủ cho shop thời trang
- **Hạn chế:** không scale > 10M cells, không query phức tạp

### 4.5 Tại sao Window Buffer Memory = 10 messages?
- Đủ cho ngữ cảnh cuộc hội thoại ngắn
- Không tốn quá nhiều token Gemini
- Có thể tăng lên 20-50 nếu cần nhớ lâu hơn (đổi trong node Window Buffer Memory)

### 4.6 Tại sao n8n self-hosted thay vì n8n.cloud?
- **Chi phí thấp:** free vs $20+/tháng
- **Privacy:** data không rời khỏi server của KH
- **Custom nodes:** có thể thêm npm package tùy ý
- **Trade-off:** KH phải tự maintain server, update n8n version

### 4.7 Tại sao n8n 2.23.2 (pin version)?
- Version đã test ổn định với 16 workflows này
- Tránh breaking change từ n8n version mới
- Khi cần update → test trên staging trước, đọc [n8n changelog](https://docs.n8n.io/release-notes/)

---

## 5. BẢO MẬT

### 5.1 Secrets
- Tất cả API key lưu trong `.env.local` (gitignore)
- Credentials trong n8n UI mã hóa bằng `N8N_ENCRYPTION_KEY` (AES-256)
- Webhook verify token là chuỗi random, không đoán được

### 5.2 Authorization
- Telegram bot: whitelist `chat_id` của admin (xem trong Workflow 01)
- Facebook webhook: verify Meta signature (`X-Hub-Signature-256`)
- Google OAuth: chỉ grant quyền tối thiểu (scopes ở mức cần thiết)
- TikTok: refresh token lưu Google Sheets (KHÔNG plaintext)

### 5.3 Rate Limiting
- Workflow 01 có thể gặp rate limit Gemini nếu admin spam
- Workflow 09 (Veo): polling mỗi 15s, tối đa 10 phút (timeout)
- Workflow 06 (Social Publisher): queue-based, không spam API

### 5.4 Audit
- Mỗi execution lưu trong n8n SQLite (có thể xem lại)
- Google Sheets là audit log chính cho business data
- Có thể enable n8n audit log (Enterprise feature)

---

## 6. SCALE & PERFORMANCE

### 6.1 Hiện tại (đáp ứng)
- **Throughput:** ~50-100 executions/ngày
- **Concurrent users:** 1 admin + 1 fanpage
- **Storage:** Google Sheets đủ cho ~10K rows
- **Response time:** 1-3s cho text, 10-20s cho ảnh, 1-5 phút cho video

### 6.2 Giới hạn
- **Veo 3.1 queue:** có thể chậm khi Google quá tải
- **Gemini rate limit:** 60 req/min/user (free tier) hoặc 1000 req/min (paid)
- **Facebook API:** 200 calls/hour/user
- **TikTok API:** 100 posts/day

### 6.3 Nếu cần scale
- Tách workflow 01 thành nhiều agent chuyên biệt (vd: agent "Ảnh", agent "Đơn hàng")
- Chuyển từ Google Sheets → PostgreSQL (cho >100K rows)
- Dùng Redis cache cho SKU lookup
- Dùng queue (BullMQ) cho video processing

---

## 7. TROUBLESHOOTING TỔNG QUAN

Khi có lỗi, check theo thứ tự:
1. **Execution log trong n8n UI:** Executions tab → click execution lỗi → xem node nào fail
2. **Console.log trong Code nodes:** mỗi code node có thể log
3. **API response:** mở HTTP Request node → xem response
4. **Telegram bot:** workflow 01 có thể gửi error message về admin
5. **Google Sheets:** check data có đúng format không

Chi tiết → xem `06-FAQ-XU-LY-SU-CO.md`.
