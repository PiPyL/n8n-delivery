# 08 - PHIẾU NGHIỆM THU BÀN GIAO

Tài liệu này dùng để **nghiệm thu bàn giao** giữa bên thực hiện (Freelancer) và khách hàng. Vui lòng in ra hoặc copy vào email ký xác nhận.

---

## THÔNG TIN DỰ ÁN

- **Tên dự án:** Hệ thống Trợ lý ảo AI & Tự động hóa Marketing qua n8n
- **Bên thực hiện:** Freelance AI Automation Specialist
- **Khách hàng:** ___________________________
- **Ngày bàn giao:** ___________________________
- **Phiên bản hệ thống:** v1.0 (16 workflows, n8n 2.23.2)

---

## PHẦN A: SOURCE CODE & DOCUMENTATION

### A.1 Source code
- [ ] Folder `workflows/` chứa 16 file JSON workflows (đầy đủ, không bị xóa/sửa)
- [ ] Folder `scripts/` chứa 7 helper scripts (start, import, test, etc.)
- [ ] Folder `tests/` chứa 1 test file
- [ ] Folder `config/` chứa `workflow-capabilities.json`
- [ ] File `package.json` pin n8n@2.23.2
- [ ] File `.env.example` (template, KHÔNG có secret thật)
- [ ] File `.gitignore` (loại trừ `.env.local`, `.n8n/`, `node_modules/`)
- [ ] File `AGENTS.md` (cho AI agent dev)
- [ ] File `README.md` (entry point)

### A.2 Tài liệu bàn giao
- [ ] `docs/handoff/00-BAN-GIAO-TONG-QUAN.md` (tổng quan)
- [ ] `docs/handoff/01-DANH-SACH-WORKFLOW.md` (16 workflows)
- [ ] `docs/handoff/02-CAU-HINH-API.md` (lấy API keys)
- [ ] `docs/handoff/03-CREDENTIALS-N8N.md` (cấu hình credentials)
- [ ] `docs/handoff/04-KIEN-TRUC-HE-THONG.md` (kiến trúc)
- [ ] `docs/handoff/05-VAN-HANH-DEBUG.md` (vận hành hàng ngày)
- [ ] `docs/handoff/06-FAQ-XU-LY-SU-CO.md` (15 lỗi phổ biến)
- [ ] `docs/handoff/07-BAO-GIA-THIET-KE.md` (context ban đầu)
- [ ] `docs/handoff/08-PHONG-VAN-NHAN-HANDOVER.md` (file này)
- [ ] `docs/workflows/` (10 file chi tiết từng workflow)

---

## PHẦN B: KIỂM TRA TĨNH (STATIC CHECKS)

### B.1 Test workflow tĩnh
```bash
cd /path/to/n8nDemo
npm install
npm run test:workflows
```
- [ ] Tất cả 16 workflows parse JSON OK
- [ ] Không có node/connection bị thiếu
- [ ] Không có placeholder text còn sót

**Kết quả:** ___________________________ (số pass / số fail)

### B.2 Test logic JS
```bash
npm run test:unit
```
- [ ] Tất cả Code node logic pass
- [ ] Không có syntax error

**Kết quả:** ___________________________ (số pass / số fail)

---

## PHẦN C: KIỂM TRA CHỨC NĂNG (FUNCTIONAL TESTS)

> **Lưu ý:** Phần này cần KH cấu hình API keys thật trước khi test.

### C.1 Telegram AI Agent (Workflow 01)
- [ ] Gửi "/start" → bot phản hồi
- [ ] Gửi "Tạo ảnh: váy đỏ" → bot reply kèm ảnh
- [ ] Gửi "Lưu đơn anh Nam 090... Q1 mua áo" → bot confirm + row trong Sheet
- [ ] Gửi "Đặt lịch mai 14h họp team" → event trong Calendar
- [ ] Memory: gửi 2-3 tin nhắn liên tiếp → AI nhớ context

**Kết quả:** ___________________________ (số pass / 5)

### C.2 Facebook Gateway (Workflow 02)
- [ ] Comment "test" trên fanpage → bot reply
- [ ] Comment "Cho xem ảnh VD01 đen" → bot reply kèm ảnh sản phẩm
- [ ] Messenger gửi "Giá váy đỏ?" → bot reply với giá

**Kết quả:** ___________________________ (số pass / 3)

### C.3 Workflow phụ trợ
- [ ] Workflow 03: Cron gửi nhắc việc lúc 8h sáng
- [ ] Workflow 04: Tạo ảnh từ prompt (Imagen 3)
- [ ] Workflow 05: Refresh TikTok token (kiểm tra Sheet Tokens)
- [ ] Workflow 06: Đăng bài Facebook thành công
- [ ] Workflow 07: Ghép ảnh thời trang
- [ ] Workflow 08: Gửi email qua Gmail
- [ ] Workflow 09: Tạo video từ ảnh (Veo 3.1)
- [ ] Workflow 10: Tìm file Google Drive
- [ ] Workflow 11: Format/lọc Google Sheet
- [ ] Workflow 12: AI caption + preview Telegram
- [ ] Workflow 13: Ghi nhật ký hóa đơn
- [ ] Workflow 14: Tạo lịch Calendar
- [ ] Workflow 15: Tra cứu ảnh SKU

**Kết quả:** ___________________________ (số pass / 13)

---

## PHẦN D: BÀN GIAO QUYỀN TRUY CẬP

### D.1 Repository
- [ ] Quyền truy cập Git repo (GitHub/GitLab URL): ___________________________
- [ ] Branch: `main` (hoặc ___________)
- [ ] Quyền: Admin / Developer / Read-only

### D.2 Server (nếu self-host)
- [ ] URL n8n UI: ___________________________
- [ ] Admin username: ___________________________
- [ ] Admin password (đã đổi từ default): ___________________________
- [ ] SSH/VPS access (nếu cần): ___________________________

### D.3 Tài khoản service
- [ ] Google Cloud Project: `n8n-demo-499112` (KH nên tạo project riêng)
- [ ] Facebook App: ___________________________
- [ ] TikTok App: ___________________________

### D.4 API Keys (KH tự quản lý)
- [ ] GEMINI_API_KEY
- [ ] TELEGRAM_BOT_TOKEN
- [ ] FACEBOOK_PAGE_ACCESS_TOKEN
- [ ] TIKTOK_REFRESH_TOKEN
- [ ] N8N_ENCRYPTION_KEY
- [ ] Google OAuth Client ID/Secret

> ⚠️ **KHÔNG chia sẻ keys qua email.** Nên dùng password manager (1Password, Bitwarden) hoặc kênh mã hóa.

---

## PHẦN E: CAM KẾT BẢO HÀNH

### E.1 Trong thời hạn bảo hành (30 ngày)
Bên thực hiện cam kết:
- Sửa lỗi logic workflow miễn phí
- Hỗ trợ debug qua Telegram/email trong vòng 24h làm việc
- Update workflow theo yêu cầu nhỏ (text, prompt, schema) miễn phí

### E.2 Không bao gồm
- Lỗi do API Google/Facebook/TikTok thay đổi breaking change
- Lỗi do KH tự sửa workflow làm hỏng
- Lỗi do API key hết tiền/quota
- Lỗi do server KH bị down/network issue
- Thêm tính năng mới (tính phí riêng)

### E.3 Sau bảo hành
- 1.000.000 VNĐ/tháng (hỗ trợ vận hành + sửa lỗi)
- 200.000 VNĐ/giờ (theo yêu cầu cụ thể)
- Thêm workflow mới: báo giá riêng theo scope

---

## PHẦN F: XÁC NHẬN BÀN GIAO

**Bên thực hiện (Freelancer):**

Họ tên: ___________________________
Chữ ký: ___________________________
Ngày: ___________________________

**Bên nhận (Khách hàng):**

Họ tên: ___________________________
Chức vụ: ___________________________
Chữ ký: ___________________________
Ngày: ___________________________

---

## GHI CHÚ

- Sau khi ký, vui lòng scan/upload file này và lưu trong `docs/handoff/08-PHONG-VAN-NHAN-HANDOVER-signed.pdf`
- Mọi thắc mắc về hệ thống, liên hệ dev qua: [SĐT/Email]
- Khuyến nghị: đọc `00-BAN-GIAO-TONG-QUAN.md` trước khi bắt đầu vận hành
