# 00 - BÀN GIAO TỔNG QUAN

**Ngày bàn giao:** 14/06/2026
**Phiên bản hệ thống:** v1.0 (Google GenAI API Integration)
**Người bàn giao:** Freelance AI Automation Specialist

---

## 1. MỤC ĐÍCH CỦA TÀI LIỆU NÀY

File này là **điểm vào duy nhất** cho khách hàng khi nhận bàn giao hệ thống. Nó cung cấp:

- ✅ Toàn cảnh hệ thống (workflow, kiến trúc, tích hợp)
- ✅ Roadmap bàn giao theo thứ tự ưu tiên
- ✅ Checklist "sẵn sàng vận hành" cho KH
- ✅ Điểm liên hệ khi cần hỗ trợ

---

## 2. TÓM TẮT HỆ THỐNG

Hệ thống **n8n AI Automation** là một bộ tự động hóa marketing & vận hành cho shop thời trang, gồm:

- **16 workflows n8n** tích hợp AI (Gemini 3.1 Flash Lite, Imagen 3, Veo 3.1)
- **4 kênh giao tiếp:** Telegram (admin), Facebook Page (khách), TikTok, Google Workspace
- **Lưu trữ:** Google Sheets (đơn hàng, danh bạ, calendar, tokens), Google Drive (ảnh sản phẩm)
- **Self-hosted:** chạy trên máy local hoặc VPS, không phụ thuộc cloud SaaS

### Tính năng chính

| # | Tính năng | Workflow liên quan |
|---|-----------|-------------------|
| 1 | **Chat AI với admin** qua Telegram (tạo ảnh, video, đăng FB, tra cứu, ghi sheet...) | 01 |
| 2 | **Tự động reply & xử lý** bình luận/tin nhắn Facebook | 02, 12, 15 |
| 3 | **Tạo ảnh thời trang** từ mô tả (Imagen 3) hoặc ghép ảnh sản phẩm | 04, 07 |
| 4 | **Tạo video quảng cáo** 8-10s từ ảnh sản phẩm (Veo 3.1) | 09 |
| 5 | **Đăng bài Facebook + TikTok** tự động với AI caption | 06, 12 |
| 6 | **Gửi email** cho khách hàng qua Gmail với AI soạn thảo | 08 |
| 7 | **Tra cứu ảnh sản phẩm** theo SKU từ Google Drive | 15 |
| 8 | **Ghi nhật ký hóa đơn** vào Google Sheets qua chat Telegram | 13 |
| 9 | **Tạo lịch hẹn** Google Calendar từ chat tiếng Việt tự nhiên | 14 |
| 10 | **Thao tác Google Sheets/Docs** nâng cao (định dạng, lọc, kẻ bảng) | 11 |
| 11 | **Nhắc việc** hàng ngày từ Google Sheets qua Telegram | 03 |
| 12 | **Tìm file Google Drive** qua Telegram | 10 |

---

## 3. ROADMAP BÀN GIAO (ĐỌC THEO THỨ TỰ)

### Phase 0: Chuẩn bị (KH tự thực hiện)
- [ ] Cài Node.js ≥ 20.x
- [ ] Cài đặt công cụ `cloudflared` (nếu cần dùng public URL cho Facebook webhook)
- [ ] Clone/copy source code project
- [ ] Chuẩn bị tài khoản Google Cloud, Facebook Developer, TikTok Developer, Telegram Bot

### Phase 1: Đọc hiểu (1-2 giờ)
- [ ] Đọc file này (`00-BAN-GIAO-TONG-QUAN.md`)
- [ ] Đọc [01-DANH-SACH-WORKFLOW.md](file:///Users/mac/Desktop/AutoWork%20Project/n8nDemo-delivery/docs/handoff/01-DANH-SACH-WORKFLOW.md) để hiểu 16 workflows
- [ ] Đọc [09-HUONG-DAN-DEMO-THUC-TE.md](file:///Users/mac/Desktop/AutoWork%20Project/n8nDemo-delivery/docs/handoff/09-HUONG-DAN-DEMO-THUC-TE.md) để có kịch bản và mẫu tin nhắn chạy thử thực tế
- [ ] Đọc [04-KIEN-TRUC-HE-THONG.md](file:///Users/mac/Desktop/AutoWork%20Project/n8nDemo-delivery/docs/handoff/04-KIEN-TRUC-HE-THONG.md) để hiểu kiến trúc tổng thể

### Phase 2: Lấy API keys (2-4 giờ, tùy provider)
- [ ] Đọc `02-CAU-HINH-API.md`
- [ ] Lấy Gemini API Key từ [Google AI Studio](https://aistudio.google.com/)
- [ ] Tạo Telegram Bot qua [@BotFather](https://t.me/BotFather)
- [ ] Tạo Facebook App + Page Access Token
- [ ] Tạo TikTok Developer App + lấy token
- [ ] Cấu hình Google Cloud OAuth Client (Sheets, Drive, Calendar, Gmail)

### Phase 3: Cài đặt local (30 phút)
- [ ] `npm install`
- [ ] `cp .env.example .env.local` → điền các key đã lấy
- [ ] `openssl rand -hex 32` → paste vào `N8N_ENCRYPTION_KEY`
- [ ] `npm run n8n:import` (import 16 workflows)
- [ ] `npm run n8n:start`
- [ ] Truy cập `http://127.0.0.1:5678`, tạo owner account

### Phase 4: Cấu hình credentials trong UI n8n (1-2 giờ)
- [ ] Đọc `03-CREDENTIALS-N8N.md`
- [ ] Tạo credentials cho từng service: Telegram, Google OAuth2 (Sheets/Drive/Calendar/Gmail), Facebook, TikTok
- [ ] Gán credentials vào đúng node trong workflow

### Phase 5: Test chức năng (1-2 giờ)
- [ ] `npm run test:workflows` (test tĩnh)
- [ ] Test từng workflow theo hướng dẫn trong `01-DANH-SACH-WORKFLOW.md`
- [ ] Gửi tin nhắn thử tới Telegram bot
- [ ] Comment thử trên Facebook Page
- [ ] Test tạo ảnh, video, đăng bài

### Phase 6: Vận hành & giám sát
- [ ] Đọc `05-VAN-HANH-DEBUG.md`
- [ ] Lưu lại log location
- [ ] Bookmark `06-FAQ-XU-LY-SU-CO.md` để tra cứu khi cần

---

## 4. CHECKLIST "SẴN SÀNG VẬN HÀNH"

Trước khi tuyên bố hệ thống chạy ổn định, đảm bảo tất cả mục sau đều ✅:

### Cơ sở hạ tầng
- [ ] Node.js ≥ 20.x đã cài
- [ ] n8n đã cài (`npm install` thành công)
- [ ] Port 5678 không bị chiếm
- [ ] Công cụ `cloudflared` đã được cài đặt và cấu hình PATH (nếu dùng Cloudflare Tunnel)
- [ ] `.env.local` đã điền đủ biến bắt buộc
- [ ] `N8N_ENCRYPTION_KEY` đã generate (64 hex chars)

### Workflows & Credentials
- [ ] 16 workflows đã import (kiểm tra trong UI: Workflows → count = 16)
- [ ] 16 workflows đã active (toggle = true)
- [ ] Telegram bot credentials đã tạo
- [ ] Google OAuth2 credentials (4 service: Sheets, Drive, Calendar, Gmail) đã authorize
- [ ] Facebook Page Access Token đã test thành công (gửi 1 message thử)
- [ ] TikTok token còn hạn (>24h)

### Tests
- [ ] `npm run test:workflows` → 0 errors
- [ ] `npm run test:unit` → 0 errors
- [ ] Gửi "hello" tới Telegram bot → bot phản hồi
- [ ] Comment "test" trên Facebook Page → tự động reply
- [ ] Tạo ảnh thử qua Telegram ("Tạo ảnh: váy đỏ") → nhận ảnh
- [ ] Ghi thử 1 đơn hàng vào Google Sheets

---

## 5. KIẾN TRÚC TỔNG THỂ (SƠ ĐỒ CAO)

```
┌─────────────────────────────────────────────────────────────┐
│                    EXTERNAL CHANNELS                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ Telegram Bot │  │ Facebook Page│  │  TikTok      │        │
│  │  (Admin)     │  │  (Customer)  │  │  (Public)    │        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
└─────────┼──────────────────┼──────────────────┼───────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                 AI GATEWAY (n8n)                             │
│  ┌──────────────────┐  ┌──────────────────┐                   │
│  │ 01_Telegram_AI   │  │ 02_Facebook       │                  │
│  │ _Agent           │  │ _Gateway          │                  │
│  │  (LangChain)     │  │  (Webhook)        │                  │
│  └────────┬─────────┘  └────────┬─────────┘                  │
└───────────┼──────────────────────┼───────────────────────────┘
            │                      │
            ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│  TOOL LAYER (Sub-Workflows)                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ Media    │ │ Video    │ │ FB Smart │ │ Social   │        │
│  │ Gener.   │ │ Gener.   │ │ Publisher│ │ Publisher│        │
│  │ Imagen 3 │ │ Veo 3.1  │ │ + AI     │ │ + Wait   │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ Gmail    │ │ Calendar │ │ Product  │ │ Workspace│        │
│  │ Sender   │ │ Assistant│ │ Lookup   │ │ Assistant│        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                      │
│  │ Save     │ │ NhatKy   │ │ Task     │                      │
│  │ Order    │ │ HoaDon   │ │ Scheduler│                      │
│  └──────────┘ └──────────┘ └──────────┘                      │
└─────────┬──────────────────┬──────────────────┬──────────────┘
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  DATA & STORAGE                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ Google       │  │ Google Drive │  │ n8n SQLite   │        │
│  │ Sheets       │  │ (Product Img)│  │ (Executions) │        │
│  │ - Orders     │  │              │  │              │        │
│  │ - Contacts   │  │              │  │              │        │
│  │ - Calendar   │  │              │  │              │        │
│  │ - Tokens     │  │              │  │              │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

**Chi tiết → xem `04-KIEN-TRUC-HE-THONG.md`**

---

## 6. GIỚI HẠN & LƯU Ý QUAN TRỌNG

### Giới hạn kỹ thuật
- **Veo 3.1 chỉ chạy với paid tier** Google AI Studio (cần enable billing)
- **TikTok Refresh Token hết hạn 365 ngày**, phải refresh thủ công
- **Facebook Page Token** cần re-issue khi đổi quyền Page
- **Google OAuth tokens** hết hạn sau 7 ngày nếu app ở chế độ "Testing"; cần publish app hoặc dùng service account
- **Memory Buffer Window** trong Workflow 01: chỉ nhớ 10 tin nhắn gần nhất (configurable)

### Giới hạn business
- **Workflow 14 (Calendar Assistant)**: chỉ hỗ trợ CREATE (READ/DELETE out-of-scope)
- **Workflow 12 (Facebook Smart Publisher)**: chỉ hỗ trợ 1 fanpage / 1 admin Telegram
- **Workflow 01 (Telegram AI Agent)**: 1 bot = 1 admin (multi-user cần config lại)

### Rủi ro cần biết
- **Veo 3.1 Generate Preview** là API preview, có thể thay đổi breaking change bất kỳ lúc nào
- **TikTok Content Posting API** yêu cầu app review mới cho phép public post
- **Google API quota**: Sheets 60 req/min/user, Drive 1000 req/100s/user

---

## 7. LIÊN HỆ HỖ TRỢ

| Vấn đề | Tài liệu tham khảo |
|--------|---------------------|
| Lỗi import workflow | `06-FAQ-XU-LY-SU-CO.md` → mục 1 |
| Bot không phản hồi | `06-FAQ-XU-LY-SU-CO.md` → mục 2 |
| Tạo ảnh/video lỗi | `06-FAQ-XU-LY-SU-CO.md` → mục 3 |
| Credential bị expire | `06-FAQ-XU-LY-SU-CO.md` → mục 4 |
| Workflow chạy chậm | `06-FAQ-XU-LY-SU-CO.md` → mục 5 |
| Cần thêm tính năng mới | Liên hệ dev để mở story packet |
| API Google ngừng hoạt động | Kiểm tra [Google AI Studio Status](https://status.cloud.google.com/) |

**Liên hệ dev:** [SĐT/Email đã thỏa thuận trong hợp đồng]

---

## 8. CHANGELOG BÀN GIAO

### v1.0 — 14/06/2026
- ✅ 16 workflows hoàn chỉnh (đã test tĩnh)
- ✅ Tài liệu bàn giao (10 file trong `docs/handoff/`)
- ✅ Tài liệu workflow chi tiết (10 file trong `docs/workflows/`)
- ✅ Unit test + integration test scripts
- ⚠️ Credentials cần KH tự cấu hình trong UI n8n
- ⚠️ 1 số workflow cần Google Drive folder setup thủ công (xem `02-CAU-HINH-API.md` mục 5)
