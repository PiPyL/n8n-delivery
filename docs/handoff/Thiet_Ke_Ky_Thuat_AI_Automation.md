# TÀI LIỆU THIẾT KẾ KỸ THUẬT CHI TIẾT (TECHNICAL DESIGN)
**Dự án:** Hệ thống Trợ lý ảo AI & Tự động hóa Marketing qua n8n
**Tác giả:** Freelance AI Automation Specialist
**Ngày cập nhật:** 03/06/2026

---

## 1. TÓM TẮT HIỂU BIẾT & GIẢ ĐỊNH (UNDERSTANDING & ASSUMPTIONS)

### Tóm tắt hệ thống:
Hệ thống tự động hóa được xây dựng trên **n8n (Self-hosted trên VPS Docker)** làm trục kết nối chính. Hệ thống nhận lệnh từ **Telegram Bot** và tương tác với khách hàng qua **Facebook Fanpage (Messenger/Comments)**, đăng bài trên **TikTok & Facebook**, đồng thời lưu trữ dữ liệu quản lý trên **Google Sheets**. 

Hệ thống sử dụng trực tiếp các API chính chủ từ **Google AI Studio (Gemini API Key)** để vận hành:
*   **Mô hình suy luận & phân tích:** **Gemini 3.5 Flash** (Xử lý ngôn ngữ tự nhiên, phân loại intent).
*   **Mô hình sinh ảnh:** **Gemini 3.1 Flash Image** (Mô hình Imagen 3 thế hệ mới tích hợp trực tiếp).
*   **Mô hình sinh video:** **Veo 3.1 Generate Preview** (Sinh video ngắn 8-10 giây kèm âm thanh từ văn bản/hình ảnh).

---

## 2. NHẬT KÝ QUYẾT ĐỊNH THIẾT KẾ (DECISION LOG)

*   **Quyết định 1: Sử dụng cấu trúc Đa Workflow (Modular Architecture) thay vì 1 Workflow duy nhất.**
    *   *Lý do:* Tách biệt luồng xử lý tin nhắn phản hồi nhanh khỏi luồng xử lý video AI nặng chạy ngầm.
*   **Quyết định 2: Polling luồng sinh video bất đồng bộ của Google Veo (LRO - Long Running Operation).**
    *   *Lý do:* Google Veo API hoạt động ở chế độ LRO. Gửi request sinh video chỉ nhận về một `operationName`. n8n sử dụng một Node Code JavaScript độc lập để tự động chạy vòng lặp Polling an toàn check status định kỳ, tránh sinh quá nhiều nodes trung gian trên canvas gây rối luồng.
*   **Quyết định 3: Chuyển đổi dữ liệu Base64 sang Binary trực tiếp bằng JS.**
    *   *Lý do:* API Gemini Image trả về dữ liệu ảnh mã hóa Base64 trong response JSON. Sử dụng Code Node trong n8n để gán trực tiếp dữ liệu nhị phân vào luồng dữ liệu (Binary property) giúp n8n xử lý dữ liệu ảnh mượt mà, lưu trữ tạm và chuyển tiếp sang Veo API.

---

## 3. THIẾT KẾ CHI TIẾT 9 WORKFLOWS TRÊN N8N

### Workflow 1: Telegram Webhook Gateway (Cổng giao tiếp điều khiển)
*   **Trigger Node:** `Telegram Trigger` (lắng nghe sự kiện `message`).
*   **Code Node (Parse Intent):** Nhận diện lệnh của admin (được Gemini 3.5 Flash phân tích) và lọc sạch markdown code block để parse JSON định tuyến.
*   **Switch Node (Điều hướng):**
    *   *Branch 1 (CHAT):* Trả lời tin nhắn thường qua Telegram Bot.
    *   *Branch 2 (LƯU_ĐƠN):* Lưu thông tin đơn hàng lên Google Sheets.
    *   *Branch 3 (TẠO_MEDIA):* Gọi workflow 4 (Media Generator) để sinh ảnh AI từ prompt.
    *   *Branch 3.5 (TẠO_VIDEO):* Gọi workflow 9 (Video Generator) để sinh video AI thời trang từ ảnh sản phẩm.
    *   *Branch 4 (TẠO_SHEET):* Khởi tạo file Google Sheets mới.
    *   *Branch 5 (LÊN_LỊCH_BÀI / DUYỆT_BÀI):* Gọi workflow 6 để tạo mã duyệt, chờ lịch đăng và đăng/lên lịch Facebook/TikTok.

### Workflow 2: Facebook Fanpage Gateway (Tự động tư vấn & Chốt deal)
*   **Trigger Node:** `Webhook Node` (Meta webhook) gồm GET verification và POST event receiver.
*   **Code Node (Lọc trùng):** Sử dụng API `getWorkflowStaticData('global')` chính thức của n8n để lọc trùng tin nhắn dựa trên ID tin nhắn từ Facebook, lưu 200 ID gần nhất.
*   **AI Agent & Memory:** Gemini 3.5 Flash kết hợp `Window Buffer Memory` để lưu lịch sử hội thoại 10 câu gần nhất, tự động phản hồi tin nhắn/comment Facebook và ghi tín hiệu chốt đơn lên Google Sheets.

### Workflow 3: Task Scheduler (Nhắc nhở công việc)
*   **Trigger Node:** `Cron Node` (Chạy hàng ngày vào khung giờ chỉ định).
*   **Google Sheets:** Đọc hàng công việc chưa hoàn thành trong ngày hôm nay.
*   **Telegram:** Gửi tóm tắt công việc bằng Markdown cho người quản trị.

### Workflow 4: Media AI Generator (Xử lý sinh Ảnh AI từ Google AI Studio)
*   **Trigger Node:** `Execute Workflow Trigger` (nhận payload từ Telegram Gateway) và `Webhook Trigger` để test/gọi ngoài.
*   **HTTP Request (Google Imagen 3 - gemini-3.1-flash-image):**
    *   *Endpoint:* `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent`
    *   *Payload:* Gửi prompt mô tả ảnh, thiết lập aspect ratio (3:4, 16:9, v.v.) và imageSize (2K).
    *   *Response:* Nhận chuỗi Base64 từ `candidates[].content.parts[].inlineData.data` hoặc `inline_data.data`.
*   **Code Node (Base64 to Binary):** Chuyển chuỗi Base64 thành luồng dữ liệu nhị phân `ai_image.jpg` và đính kèm vào luồng binary.
*   **Telegram Node:** Gửi ảnh tĩnh thành phẩm kèm caption về Telegram Bot cho người dùng.

### Workflow 5: TikTok Token Refresher (Bảo trì kết nối)
*   Tự động chạy định kỳ mỗi 12 tiếng đổi Refresh Token TikTok và cập nhật dữ liệu mới lên file Google Sheets cấu hình.

### Workflow 6: Social Publisher (Duyệt, chờ lịch và đăng bài)
*   **Trigger Node:** `Execute Workflow Trigger` nhận intent từ Telegram Gateway.
*   **Approval:** Tạo mã duyệt bài, lưu vào static data n8n và gửi hướng dẫn duyệt qua Telegram.
*   **Wait:** Sau khi duyệt, node `Wait Until Publish Time` chờ tới `publish_at`.
*   **Facebook:** Gọi Graph API `feed`, `photos` hoặc `videos`, có hỗ trợ `scheduled_publish_time` khi lịch đăng nằm trong tương lai.
*   **TikTok:** Gọi Content Posting API `/v2/post/publish/video/init/` và `/v2/post/publish/status/fetch/` với `source=PULL_FROM_URL`.

### Workflow 7: Fashion Image Generator (Tạo ảnh thời trang từ ảnh sản phẩm)
*   **Trigger Node:** `Execute Workflow Trigger` nhận payload từ Telegram Gateway (khi message có ảnh sản phẩm đính kèm).
*   Sử dụng Gemini Vision để phân tích ảnh sản phẩm và tạo ảnh thời trang chuyên nghiệp.

### Workflow 8: Gmail Email Sender (Gửi email tự động với danh bạ)
*   **Trigger Node:** `Execute Workflow Trigger` nhận payload từ Telegram Gateway (intent = `GỬI_EMAIL`).
*   **Kiến trúc:** Phương án B — Gemini Intent Classifier + Google Sheets Contacts + Gmail Node.
*   **Luồng xử lý:**
    1. Nhận `recipient_name` và `email_body_prompt` từ Telegram Gateway.
    2. Kiểm tra nếu `recipient_name` là email trực tiếp → bỏ qua bước lookup.
    3. **Nếu là tên:** Lookup danh bạ từ Google Sheets (sheet `DanhBa`) → Fuzzy match theo tên/biet_danh.
    4. **AI Compose:** Gọi Gemini 3.1 Flash Lite soạn email chuyên nghiệp (subject + body) theo mô tả.
    5. **Gmail Node:** Gửi email qua Gmail OAuth2.
    6. Xác nhận kết quả về Telegram Bot cho người dùng.
*   **Schema sheet DanhBa:** `ten | email | cong_ty | vai_tro | nhom | ghi_chu | biet_danh`
*   **Edge cases:** Email trực tiếp, tên không tồn tại, nhiều contact trùng tên.
*   **Credentials:** Gmail OAuth2 (cần tạo) + Google Sheets OAuth2 (đã có).

### Workflow 9: Video AI Generator (Tạo video AI thời trang từ ảnh sản phẩm)
*   **Trigger Node:** `Execute Workflow Trigger` (nhận payload từ Telegram Gateway bao gồm `photo_file_id` và prompt/caption) và `Webhook Trigger`.
*   **Tải ảnh nguồn từ Telegram:**
    *   Gọi Telegram API `getFile` với `file_id` để lấy đường dẫn file ảnh.
    *   Gọi API tải ảnh nhị phân từ Telegram và lưu trữ trong luồng dữ liệu.
*   **Code Node (Build Prompt & Base64):**
    *   Chuyển đổi dữ liệu nhị phân của ảnh sang Base64 để nhúng vào payload.
    *   Nhận diện các preset chuyển động thời trang trong caption: `catwalk` (sải bước runway), `orbit` (xoay 360 độ), `windy` (gió thổi bay tơ tằm), hoặc `lifestyle` (phố xá/cafe).
    *   Tự động xây dựng prompt quảng cáo thời trang chuyên nghiệp, giữ nguyên cấu trúc sản phẩm gốc.
*   **HTTP Request (Google Veo 3.1 - veo-3.1-generate-preview):**
    *   *Endpoint:* `POST https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:predictLongRunning?key={{ GEMINI_API_KEY }}`
    *   *Payload:* Gửi prompt chuyển động thời trang kết hợp ảnh Base64 của sản phẩm (chế độ Image-to-Video).
    *   *Response:* Nhận về Operation LRO (`operations/abc123xyz`).
*   **Vòng lặp Polling LRO:**
    *   *Node Wait:* Chờ 15 giây mỗi lượt.
    *   *HTTP Request (Check Status):* Gọi endpoint `GET https://generativelanguage.googleapis.com/v1beta/{{ operation_name }}?key={{ GEMINI_API_KEY }}`.
    *   *Code Node (Process Polling State):* Đếm số lượt check, nếu đạt giới hạn (20 lần - 5 phút) báo lỗi quá thời gian. Kiểm tra `done === true` và trích xuất `response.generateVideoResponse.generatedSamples[0].video.uri`.
    *   *IF Node (Is Done?):* Nếu chưa xong, tiếp tục quay lại node Wait 15s. Nếu xong, chuyển tiếp sang tải file video.
*   **Download & Telegram Node:** Tải video từ Google Cloud sử dụng API Key và gửi trực tiếp video gốc `.mp4` kèm caption về Telegram Bot.

---

## 4. KẾ HOẠCH XÁC MINH & KIỂM THỬ (VERIFICATION PLAN)
1.  **Test Imagen 3 API:** Gọi thử API sinh ảnh để kiểm tra dữ liệu nhị phân chuyển đổi từ Base64 có bị lỗi định dạng hay không.
2.  **Test Veo LRO Polling:** Đánh giá độ trễ của cơ chế Polling (20 lần x 15 giây), ghi nhận log thời gian xử lý video của Google Cloud.
3.  **Test Telegram Gateway Integration:** Kiểm tra phản hồi của bot khi gửi tin nhắn kèm ảnh reply hoặc lệnh tạo video, xem Gateway có chuyển tiếp đúng tham số sang Workflow 9 hay không.
4.  **Test Token TikTok:** Đảm bảo token TikTok mới cập nhật ghi đúng hàng trên Google Sheets để các workflow khác truy xuất.
5.  **Test Gmail Email Sender:**
    *   Test lookup danh bạ: tìm contact theo tên chính xác, tên một phần, biet_danh.
    *   Test email trực tiếp: gửi tới địa chỉ email mà không cần lookup.
    *   Test Gemini compose: kiểm tra output JSON hợp lệ với subject/body.
    *   Test full flow: Telegram → "Gửi email cho Minh báo giá" → email sent → confirm.
