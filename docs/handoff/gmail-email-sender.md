# 📧 Gmail Email Sender Workflow - Plan

**Dự án:** Workflow gửi email tự động qua Gmail với danh bạ
**Ngày tạo:** 2026-06-11
**Agent:** project-planner
**Status:** AWAITING APPROVAL

---

## 1. TÓM TẮT YÊU CẦU

Xây dựng **Workflow 08: Gmail Email Sender** cho hệ thống n8n automation hiện tại. Workflow cho phép:
- Nhận lệnh tự nhiên (từ Telegram) để soạn và gửi email qua Gmail
- Tra cứu tự động email người nhận từ "danh bạ" (Google Sheets) khi chỉ cần nhắc tên
- AI tự động soạn nội dung email chuyên nghiệp dựa trên yêu cầu

---

## 2. PHÂN TÍCH 3 PHƯƠNG ÁN (SOLUTION COMPARISON)

### Phương án A: AI Agent + Gmail Tool + Google Contacts Node ❌
| Ưu điểm | Nhược điểm |
|----------|------------|
| Dùng Google Contacts chính chủ | Yêu cầu enable Google People API |
| Không cần quản lý dữ liệu riêng | Không kiểm soát được danh bạ (mix lẫn contacts cá nhân) |
| Tích hợp sẵn trong n8n | API quota hạn chế, lookup chậm (>1s/lần) |
| | Khó thêm custom fields (ví dụ: "vai trò", "công ty", "nhóm") |
| | Không nhất quán với kiến trúc Modular hiện tại (dùng Google Sheets) |

### Phương án B: Gemini Intent Classifier + Google Sheets Contacts + Gmail HTTP Request ✅ **RECOMMENDED**
| Ưu điểm | Nhược điểm |
|----------|------------|
| **Nhất quán** với kiến trúc hiện tại (Google Sheets là data store) | Cần tạo sheet "Danh Bạ" thủ công ban đầu |
| **Kiểm soát 100%**: tùy chỉnh field, nhóm, tag thoải mái | Sheet lookup có thể chậm nếu >1000 contacts |
| **Không cần API mới**: chỉ dùng Gmail OAuth2 + Sheets OAuth2 đã có | |
| **Dễ mở rộng**: thêm cột "VIP", "Nhóm", "Ghi chú" bất kỳ lúc nào | |
| **AI soạn email**: Gemini tự compose nội dung từ yêu cầu tự nhiên | |
| **Tích hợp sẵn** vào Telegram Gateway (thêm intent GỬI_EMAIL) | |

### Phương án C: n8n AI Agent Node + Gmail Tool + Sheets Tool 🔄
| Ưu điểm | Nhược điểm |
|----------|------------|
| AI tự quyết định flow | Black-box — khó debug khi AI chọn sai tool |
| Ít code | Chậm hơn (multi-turn tool calling) |
| Linh hoạt nhất | Token cost cao (mỗi email gọi 3-5 turns AI) |
| | Không phù hợp kiến trúc Intent-Switch hiện tại |

### 🏆 Kết luận: **Phương án B** là best solution

**Lý do:**
1. **Nhất quán kiến trúc**: Hệ thống hiện tại dùng Gemini Intent Classifier → Switch Router → Sub-workflows. Thêm intent `GỬI_EMAIL` là tự nhiên nhất.
2. **Chi phí thấp**: 1 lần gọi Gemini để classify + compose email (vs 3-5 turns cho Agent).
3. **Kiểm soát**: Danh bạ trên Google Sheets dễ quản lý, export/import, không phụ thuộc Google Contacts API.
4. **Reliability**: Flow deterministic, không phụ thuộc AI Agent "đoán" đúng tool.

---

## 3. THIẾT KẾ KIẾN TRÚC CHI TIẾT

### 3.1. Tổng quan luồng xử lý

```
Telegram → "Gửi email cho Minh nội dung báo giá dự án X"
  ↓
[01_Telegram_Gateway]
  ↓ (Gemini Intent Classifier: intent = GỬI_EMAIL)
  ↓
[Switch Routing] → output 6 (GỬI_EMAIL)
  ↓
[08_Gmail_Email_Sender] (Execute Workflow)
  ↓
  ├── [1] Lookup Contact (Google Sheets "Danh Bạ")
  │     → Tìm "Minh" → minh@company.com
  │
  ├── [2] AI Compose Email (Gemini 3.1 Flash Lite)  
  │     → Subject: "Báo giá dự án X"
  │     → Body: (nội dung chuyên nghiệp)
  │
  ├── [3] Send Email (Gmail Node)
  │     → To: minh@company.com
  │     → Subject + Body from AI
  │
  └── [4] Confirm → Telegram
        → "✅ Đã gửi email cho Minh (minh@company.com)"
```

### 3.2. Google Sheets "Danh Bạ" Schema

| Cột | Mô tả | Ví dụ |
|-----|--------|-------|
| `ten` | Tên đầy đủ / biệt danh | Minh, Nguyễn Văn Minh |
| `email` | Địa chỉ email | minh@company.com |
| `cong_ty` | Công ty / tổ chức | ABC Corp |
| `vai_tro` | Vai trò / chức vụ | Giám đốc |
| `nhom` | Nhóm phân loại | Khách hàng, Đối tác, Nội bộ |
| `ghi_chu` | Ghi chú bổ sung | VIP, ưu tiên |
| `biet_danh` | Tên gọi tắt / alias (để AI match) | Minh, anh Minh, sếp Minh |

### 3.3. Chi tiết Workflow 08: Gmail Email Sender

#### Node 1: Execute Workflow Trigger
- Nhận payload từ Telegram Gateway
- Input: `{ intent, params: { recipient_name, email_subject, email_body_prompt, chat_id } }`

#### Node 2: Lookup Contact (Google Sheets)
- **Operation:** Get Many (sheet "DanhBa")
- **Filter:** Không filter — lấy toàn bộ danh bạ

#### Node 3: Match Contact (Code Node - JavaScript)
```javascript
// Fuzzy match tên người nhận từ danh bạ
const contacts = $input.all();
const recipientName = $node['Execute Workflow Trigger'].json.params.recipient_name || '';
const nameNormalized = recipientName.toLowerCase().trim();

// Tìm exact match hoặc partial match
const matched = contacts.find(c => {
  const ten = (c.json.ten || '').toLowerCase();
  const bietDanh = (c.json.biet_danh || '').toLowerCase();
  return ten.includes(nameNormalized) 
    || bietDanh.includes(nameNormalized)
    || nameNormalized.includes(ten);
});

if (matched) {
  return [{
    json: {
      found: true,
      email: matched.json.email,
      name: matched.json.ten,
      company: matched.json.cong_ty || '',
      role: matched.json.vai_tro || '',
      group: matched.json.nhom || ''
    }
  }];
}

return [{
  json: {
    found: false,
    search_name: recipientName,
    error: `Không tìm thấy "${recipientName}" trong danh bạ`
  }
}];
```

#### Node 4: IF - Contact Found?
- Condition: `{{ $json.found }}` === `true`
- **True:** → Tiếp tục compose email
- **False:** → Thông báo Telegram "Không tìm thấy liên hệ"

#### Node 5: AI Compose Email (Gemini 3.1 Flash Lite)
- HTTP Request → Gemini API
- Prompt:

```
Bạn là trợ lý soạn email chuyên nghiệp bằng tiếng Việt.

Thông tin người nhận:
- Tên: {{ $node['Match Contact'].json.name }}
- Công ty: {{ $node['Match Contact'].json.company }}
- Vai trò: {{ $node['Match Contact'].json.role }}

Yêu cầu từ người gửi: "{{ $node['Execute Workflow Trigger'].json.params.email_body_prompt }}"

Hãy soạn email với:
1. Tiêu đề email (subject) ngắn gọn, rõ ý
2. Nội dung email (body) chuyên nghiệp, lịch sự
3. Có lời chào phù hợp với vai trò người nhận
4. Có lời kết và chữ ký

Trả về JSON:
{
  "subject": "...",
  "body": "...(HTML format, dùng <br> cho xuống dòng)..."
}
```

#### Node 6: Parse Email Content (Code Node)
```javascript
const response = $input.first().json;
const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
const parsed = JSON.parse(text);

return [{
  json: {
    subject: parsed.subject,
    body: parsed.body,
    to_email: $node['Match Contact'].json.email,
    to_name: $node['Match Contact'].json.name
  }
}];
```

#### Node 7: Send Email (Gmail Node)
- **Node type:** `n8n-nodes-base.gmail`
- **Operation:** `send`
- **To:** `{{ $json.to_email }}`
- **Subject:** `{{ $json.subject }}`
- **Message (HTML):** `{{ $json.body }}`
- **Credentials:** Gmail OAuth2

#### Node 8: Confirm via Telegram
- Gửi thông báo xác nhận:
```
✅ Đã gửi email thành công!
📧 Người nhận: {{ name }} ({{ email }})
📋 Tiêu đề: {{ subject }}
```

#### Node 9: Error Handler (Not Found Branch)
- Gửi Telegram:
```
❌ Không tìm thấy "{{ recipient_name }}" trong danh bạ.
📋 Danh bạ hiện có: [danh sách tên]
Vui lòng thử lại với tên chính xác.
```

### 3.4. Cập nhật Workflow 01: Telegram Gateway

#### Thêm intent mới vào Gemini Intent Classifier:
```
- GỬI_EMAIL: gửi email, viết email, soạn thư, gửi mail cho..., 
  email cho..., click nút 📧 Gửi Email
```

#### Thêm params mới cho schema:
```json
{
  "recipient_name": "string - Tên người nhận (trích từ tin nhắn)",
  "email_subject": "string - Chủ đề email nếu user chỉ định", 
  "email_body_prompt": "string - Mô tả nội dung email cần soạn",
  "recipient_email": "string - Email trực tiếp nếu user cung cấp"
}
```

#### Switch Routing: Thêm output 6
```json
{ "value2": "GỬI_EMAIL", "output": 6 }
```

#### Keyboard Telegram: Thêm nút
```
📧 Gửi Email
```

---

## 4. CÁC EDGE CASES VÀ XỬ LÝ

| Case | Xử lý |
|------|--------|
| User gõ "gửi email cho Minh" (không có nội dung) | AI hỏi lại: "Bạn muốn gửi email gì cho Minh?" |
| User cung cấp email trực tiếp (abc@gmail.com) | Bỏ qua lookup, gửi thẳng |
| Nhiều contact trùng tên "Minh" | Trả danh sách: "Có 2 Minh: Minh (ABC Corp), Minh (XYZ). Bạn muốn gửi cho ai?" |
| Danh bạ trống | Thông báo: "Danh bạ chưa có liên hệ nào. Vui lòng thêm vào Google Sheets." |
| Gmail API lỗi / Rate limit | Retry 1 lần → Thông báo lỗi qua Telegram |
| Email quá dài (>50KB) | Truncate body + cảnh báo |

---

## 5. CREDENTIALS CẦN THIẾT

| Credential | Loại | Đã có? | Ghi chú |
|------------|------|--------|---------|
| Gmail OAuth2 | OAuth2 | ❌ CẦN TẠO | Cần enable Gmail API trên Google Cloud |
| Google Sheets OAuth2 | OAuth2 | ✅ Đã có | `temp-creds-sheets` |
| Gemini API Key | API Key | ✅ Đã có | `GEMINI_API_KEY` |
| Telegram Bot Token | API Key | ✅ Đã có | `temp-creds-tele` |

### Hướng dẫn tạo Gmail OAuth2:
1. Vào [Google Cloud Console](https://console.cloud.google.com/)
2. Enable **Gmail API** trong project hiện tại
3. Tạo OAuth2 credentials (Web Application)
4. Thêm redirect URI: `http://localhost:5678/rest/oauth2-credential/callback`
5. Trong n8n: Credentials → Add → Gmail OAuth2 → Paste Client ID + Secret → Connect

---

## 6. DANH SÁCH FILE CẦN TẠO/SỬA

### [NEW] `workflows/08_Gmail_Email_Sender.json`
- Workflow mới với 9 nodes như mô tả ở mục 3.3

### [MODIFY] `workflows/01_Telegram_Gateway.json`
- Thêm intent `GỬI_EMAIL` vào Gemini Classifier prompt
- Thêm params schema cho email
- Thêm output 6 cho Switch Routing
- Thêm nút `📧 Gửi Email` trên keyboard Telegram
- Thêm node `Call Gmail Sender` (Execute Workflow)

### [NEW] `.env.local` thêm biến
```env
GOOGLE_CONTACTS_SHEET_NAME=DanhBa
```

---

## 7. KẾ HOẠCH KIỂM THỬ (VERIFICATION PLAN)

### Phase 1: Unit Test
- [ ] Test Google Sheets lookup: tìm contact theo tên
- [ ] Test Gemini compose email: kiểm tra output JSON hợp lệ
- [ ] Test Gmail send: gửi email test

### Phase 2: Integration Test
- [ ] Test full flow: Telegram → Intent → Lookup → Compose → Send → Confirm
- [ ] Test edge case: tên không tồn tại
- [ ] Test edge case: email trực tiếp (không cần lookup)
- [ ] Test edge case: nhiều contact trùng tên

### Phase 3: User Acceptance
- [ ] Test bằng câu lệnh tự nhiên: "Gửi email cho Minh báo giá dự án"
- [ ] Test: "Gửi mail cho team@company.com hỏi tiến độ"
- [ ] Test: "Viết thư cho sếp Hùng xin nghỉ phép"

---

## 8. TIMELINE ƯỚC TÍNH

| Phase | Task | Thời gian |
|-------|------|-----------|
| 1 | Setup Gmail OAuth2 credentials | 15 phút |
| 2 | Tạo Google Sheets "DanhBa" + data mẫu | 10 phút |
| 3 | Xây dựng Workflow 08 | 45 phút |
| 4 | Cập nhật Telegram Gateway (WF01) | 20 phút |
| 5 | Testing & Debug | 30 phút |
| **Tổng** | | **~2 giờ** |

---

## 9. MỞ RỘNG TƯƠNG LAI

- **Email Templates**: Thêm sheet "MauEmail" chứa các mẫu email sẵn (báo giá, cảm ơn, theo dõi...)
- **Scheduled Email**: Lên lịch gửi email tại thời điểm cụ thể
- **Email Tracking**: Log tất cả email đã gửi vào sheet "LichSuEmail"
- **Reply Detection**: Gmail Trigger node lắng nghe reply → thông báo Telegram
- **Attachment**: Hỗ trợ gửi file đính kèm (từ Google Drive)
- **Bulk Send**: Gửi email hàng loạt cho nhóm trong danh bạ
