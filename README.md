# HỆ THỐNG N8N AI AUTOMATION - BÀN GIAO

**Phiên bản:** Google GenAI API Integration (Imagen 3 & Veo 3.1)  
**Ngày bàn giao:** 14/06/2026  
**Stack:** n8n 2.23.2 · Gemini 3.1 Flash Lite · Gemini 3.1 Flash Image · Veo 3.1 · Facebook Graph API · TikTok Content Posting API · Google Workspace

---

## 🚀 BẮT ĐẦU NHANH (5 PHÚT)

```bash
# 1. Cài đặt
npm install

# 2. Cấu hình
cp .env.example .env.local
# → Sửa các giá trị GEMINI_API_KEY, TELEGRAM_BOT_TOKEN, ... (xem mục 3 bên dưới)
# → Generate N8N_ENCRYPTION_KEY bằng: openssl rand -hex 32

# 3. Import workflows
npm run n8n:import

# 4. Khởi động n8n
npm run n8n:start
# → Mở http://127.0.0.1:5678
# → Lần đầu vào /setup để tạo owner account

# 5. Cấu hình credentials trong UI n8n (xem mục 4)
```

---

## 📚 TÀI LIỆU BÀN GIAO (ĐỌC THEO THỨ TỰ)

| # | File | Mục đích |
|---|------|----------|
| 1 | `docs/handoff/00-BAN-GIAO-TONG-QUAN.md` | **Đọc đầu tiên** — Toàn cảnh hệ thống & roadmap bàn giao |
| 2 | `docs/handoff/01-DANH-SACH-WORKFLOW.md` | Danh sách 16 workflows & chức năng từng cái |
| 3 | `docs/handoff/02-CAU-HINH-API.md` | Hướng dẫn lấy & cấu hình API keys (Gemini, Telegram, Facebook, TikTok, Google) |
| 4 | `docs/handoff/03-CREDENTIALS-N8N.md` | Cách tạo credentials trong UI n8n từng bước |
| 5 | `docs/handoff/04-KIEN-TRUC-HE-THONG.md` | Kiến trúc tổng thể, sơ đồ luồng dữ liệu, các thành phần chính |
| 6 | `docs/handoff/05-VAN-HANH-DEBUG.md` | Vận hành hàng ngày, debug lỗi thường gặp, monitoring |
| 7 | `docs/handoff/06-FAQ-XU-LY-SU-CO.md` | FAQ & troubleshooting cho 15 lỗi phổ biến nhất |
| 8 | `docs/handoff/07-BAO-GIA-THIET-KE.md` | Báo giá & thiết kế kỹ thuật ban đầu (context) |
| 9 | `docs/workflows/` | Tài liệu chi tiết cho từng workflow (10 file .md) |
| 10 | `docs/HARNESS.md` | Quy trình harness nội bộ (dành cho dev) |

---

## 🏗️ TỔNG QUAN HỆ THỐNG

Hệ thống gồm **16 workflows** tự động hóa marketing & vận hành cho shop thời trang:

```
┌─────────────────────────────────────────────────────────────────┐
│  Kênh Input                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │ Telegram Bot │  │ Facebook Page│  │  Schedule    │            │
│  │  (Admin)     │  │  (Khách)     │  │  (Cron)      │            │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘            │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  AI Gateway (n8n + Gemini 3.1 Flash Lite)                        │
│  ┌──────────────────┐  ┌──────────────────┐                      │
│  │ 01_Telegram_AI   │  │ 02_Facebook       │                     │
│  │ _Agent           │  │ _Gateway          │                     │
│  │ (LangChain)      │  │ (Webhook + AI)    │                     │
│  └────────┬─────────┘  └────────┬─────────┘                     │
└───────────┼──────────────────────┼───────────────────────────────┘
            │                      │
            ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  Sub-Workflows (Tools)                                            │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐    │
│  │ 04_Media   │ │ 09_Video   │ │ 12_FB_Smart│ │ 06_Social  │    │
│  │ Generator  │ │ Generator  │ │ _Publisher │ │ _Publisher │    │
│  │ (Imagen 3) │ │ (Veo 3.1)  │ │ (AI Caption)│ │ (FB+TT)    │   │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘    │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐    │
│  │ 11_Workspace│ │ 08_Gmail   │ │ 14_Calendar│ │ 15_Product │    │
│  │ _Assistant │ │ _Sender    │ │ _Assistant │ │ _Lookup    │    │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘    │
└─────────┬──────────────────┬──────────────────┬──────────────────┘
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  Kênh Output + Storage                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │ Facebook Page│  │ TikTok Page  │  │ Google       │            │
│  │ (Auto Reply, │  │ (Auto Post)  │  │ Sheets/Docs  │            │
│  │  Post, Comment│ │              │  │ (Storage)    │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

**Chi tiết từng workflow → xem `docs/handoff/01-DANH-SACH-WORKFLOW.md`**

---

## ⚙️ CẤU TRÚC PROJECT

```
n8nDemo/
├── workflows/                  ← 16 file JSON workflow (master copy)
│   ├── 01_Telegram_AI_Agent.json         (Entry point: AI Agent Telegram)
│   ├── 02_Facebook_Gateway.json          (Entry point: Webhook Facebook)
│   ├── 03_Task_Scheduler.json            (Cron job: nhắc việc)
│   ├── 04_Media_Generator.json           (Sub: sinh ảnh Imagen 3)
│   ├── 05_TikTok_Token_Refresher.json    (Cron: refresh TikTok token)
│   ├── 06_Social_Publisher.json          (Sub: lên lịch đăng bài)
│   ├── 06_Social_Publisher_Worker.json   (Worker: thực thi đăng bài)
│   ├── 07_Fashion_Image_Generator.json   (Sub: ghép ảnh thời trang)
│   ├── 08_Gmail_Email_Sender.json        (Sub: gửi email)
│   ├── 09_Video_Generator.json           (Sub: sinh video Veo 3.1)
│   ├── 10_Telegram_GDrive_Reader.json    (Sub: tìm file Drive)
│   ├── 11_Workspace_Assistant.json       (Sub: thao tác Sheets/Docs)
│   ├── 12_Facebook_Smart_Publisher.json  (Sub: AI content studio FB)
│   ├── 13_NhatKyHoaDon_Assistant.json    (Sub: ghi nhật ký hóa đơn)
│   ├── 14_Calendar_Assistant.json        (Sub: tạo lịch Calendar)
│   └── 15_Product_Image_Lookup.json      (Sub: tra cứu ảnh SKU)
│
├── scripts/                    ← Helper scripts cho dev
│   ├── start-n8n.sh           (Khởi động n8n local)
│   ├── import-workflows.sh    (Import tất cả workflows vào n8n)
│   ├── test-workflows.mjs     (Test tĩnh JSON, node, connection)
│   ├── unit-tests.mjs         (Test logic JS trong Code nodes)
│   ├── execute-workflows.mjs  (Chạy từng workflow qua CLI)
│   └── live-api-smoke.mjs     (Smoke test API thật)
│
├── docs/                       ← Tài liệu bàn giao & nội bộ
│   ├── handoff/               (9 file: tài liệu bàn giao cho KH)
│   ├── workflows/             (10 file: chi tiết từng workflow)
│   ├── HARNESS.md, ARCHITECTURE.md, ...  (Tài liệu nội bộ dev)
│   ├── stories/               (Story packets làm ví dụ)
│   ├── decisions/             (Quyết định kiến trúc)
│   ├── templates/             (Template cho spec, story, plan)
│   └── product/               (Product docs)
│
├── config/                     ← Config phụ
│   └── workflow-capabilities.json  (Định nghĩa intent AI Agent)
│
├── tests/                      ← Unit test bổ sung
│
├── AGENTS.md                  ← Quy tắc làm việc cho AI agent (nội bộ)
├── .env.example               ← Template biến môi trường (KH cần copy & điền)
├── package.json               ← n8n@2.23.2 + scripts
├── package-lock.json          ← Lock file
└── .mcp.json                  ← MCP server config (n8n-mcp)
```

---

## 🔑 CÁC BIẾN MÔI TRƯỜNG BẮT BUỘC

Xem chi tiết trong `.env.example`. Tóm tắt:

### Bắt buộc cho hệ thống chạy
- `N8N_ENCRYPTION_KEY` — Generate bằng `openssl rand -hex 32`. **KHÔNG ĐỔI** sau khi đã tạo credentials thật.

### API Keys cần mua/lấy
- `GEMINI_API_KEY` — Google AI Studio (Imagen 3, Veo 3.1, Gemini Flash Lite)
- `TELEGRAM_BOT_TOKEN` — BotFather
- `FACEBOOK_PAGE_ACCESS_TOKEN`, `FACEBOOK_PAGE_ID`, `FACEBOOK_WEBHOOK_VERIFY_TOKEN`
- `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REFRESH_TOKEN`
- Google OAuth Client (Sheets, Drive, Calendar, Gmail)

### Workflow cụ thể
- `COMMENT_BOT_DRIVE_FOLDER_ID` — Workflow 15
- `GOOGLE_DRIVE_ACCESS_TOKEN` — Workflow 15
- `GOOGLE_SHEETS_DOCUMENT_ID` — Workflow 03, 04, 08, 11, 13

**📖 Hướng dẫn lấy từng key → `docs/handoff/02-CAU-HINH-API.md`**

---

## 🧪 TEST NHANH

```bash
# Test tĩnh: parse JSON, kiểm tra node/connection
npm run test:workflows

# Test logic JS trong Code nodes
npm run test:unit

# Test tổng hợp
npm test

# Chạy từng workflow qua CLI (cần n8n đang chạy)
N8N_EXECUTE_TIMEOUT_MS=15000 npm run n8n:execute:all
```

---

## 📞 HỖ TRỢ SAU BÀN GIAO

- **Lỗi runtime / workflow không chạy:** xem `docs/handoff/06-FAQ-XU-LY-SU-CO.md`
- **Cần thêm workflow mới:** liên hệ dev để mở story packet
- **Cập nhật API Google:** xem [Google AI Studio Changelog](https://ai.google.dev/gemini-api/docs/changelog)
- **Cập nhật n8n version:** xem [n8n Release Notes](https://docs.n8n.io/release-notes/)

---

## 📋 BÁO GIÁ & THIẾT KẾ

Tài liệu báo giá ban đầu và thiết kế kỹ thuật chi tiết được lưu trong `docs/handoff/07-BAO-GIA-THIET-KE.md` (file gộp từ `Bao_Gia_AI_Automation_n8n.md` + `Thiet_Ke_Ky_Thuat_AI_Automation.md` gốc).

---

**Phiên bản workflow:** 16 workflows (12 chính + 1 worker + 3 trợ giúp)  
**Trạng thái:** Sẵn sàng bàn giao (đã test tĩnh, cần KH cấu hình credentials thật)  
**Phiên bản n8n:** 2.23.2 (đã pin trong package.json)
