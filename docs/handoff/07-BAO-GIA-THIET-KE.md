# 07 - BÁO GIÁ & THIẾT KẾ KỸ THUẬT (CONTEXT BAN ĐẦU)

File này tham chiếu đến 2 tài liệu gốc về context dự án ban đầu.

---

## 1. BÁO GIÁ (GỐC)

📄 **File gốc:** [Bao_Gia_AI_Automation_n8n.md](../handoff/Bao_Gia_AI_Automation_n8n.md)

**Tóm tắt:**
- **Dự án:** Hệ thống Trợ lý ảo AI & Tự động hóa Marketing qua n8n
- **Ngày gửi:** 03/06/2026
- **Phạm vi:** Core AI (Telegram + Google Sheets) + Social Media (Facebook + TikTok)
- **Chi phí triển khai trọn gói:** 6.500.000 VNĐ
- **Bảo hành:** 30 ngày miễn phí (sửa lỗi logic workflow)
- **Bảo trì sau bảo hành:** 1.000.000 VNĐ/tháng HOẶC 200.000 VNĐ/giờ

**Trách nhiệm KH:**
- Tự thanh toán VPS (~150-300k/tháng) + API cost (Gemini, Veo) nếu vượt free tier
- Cung cấp API Key của KH để dev test (chi phí API test do KH chịu)
- Cung cấp tài khoản Developer (Facebook, TikTok)

---

## 2. THIẾT KẾ KỸ THUẬT (GỐC)

📄 **File gốc:** [Thiet_Ke_Ky_Thuat_AI_Automation.md](../handoff/Thiet_Ke_Ky_Thuat_AI_Automation.md)

**Tóm tắt nội dung:**
- Kiến trúc tổng thể (n8n + Telegram + Facebook + TikTok + Google Sheets)
- Models sử dụng (Gemini 3.5 Flash, Gemini 3.1 Flash Image, Veo 3.1)
- Quyết định thiết kế (decision log)
- Sơ đồ luồng dữ liệu

---

## 3. LƯU Ý QUAN TRỌNG

⚠️ **Các tài liệu gốc có một số thông tin đã thay đổi so với hệ thống hiện tại:**

| Thông tin cũ (báo giá) | Thực tế (đã triển khai) |
|-------------------------|--------------------------|
| Model AI: "Gemini 3.5 Flash" | **Gemini 3.1 Flash Lite** (model mới hơn) |
| Image: "Gemini 3.1 Flash Image / Nano Banana 2" | **Gemini 3.1 Flash Image** (Imagen 3 backend) |
| Video: "Google Veo 3.1 Generate Preview" | **Veo 3.1** (đã ổn định hơn, vẫn preview) |
| Scope: 2 giai đoạn (Core + Social) | **16 workflows** chia 4 nhóm (Entry, AI, Communication, Productivity) |
| 1 fanpage duy nhất | Có thể mở rộng nhiều fanpage (cần config thêm) |

**Tham khảo các tài liệu mới hơn:**
- `00-BAN-GIAO-TONG-QUAN.md` — Tổng quan hệ thống hiện tại
- `01-DANH-SACH-WORKFLOW.md` — Danh sách 16 workflows thực tế
- `04-KIEN-TRUC-HE-THONG.md` — Kiến trúc cập nhật

---

## 4. PLANNING NOTE CHO WORKFLOW 08 (GMAIL SENDER)

📄 **File gốc:** [gmail-email-sender.md](../handoff/gmail-email-sender.md)

Tài liệu planning ban đầu cho Workflow 08 (Gmail Email Sender). Phân tích 3 phương án:
- ❌ Phương án A: Google Contacts (chọn)
- ✅ **Phương án B: Gemini Intent + Google Sheets Contacts + Gmail HTTP** (ĐÃ TRIỂN KHAI)
- ❌ Phương án C: Dùng Gmail node trực tiếp

**Quyết định cuối:** Chọn Phương án B vì:
- Nhất quán với kiến trúc modular
- Lookup nhanh (Google Sheets)
- Không cần enable Google People API
- Dễ thêm custom fields

Xem chi tiết trong file gốc.

---

*Đây là tài liệu tham khảo context. Để vận hành hệ thống, xem các file handoff khác.*
