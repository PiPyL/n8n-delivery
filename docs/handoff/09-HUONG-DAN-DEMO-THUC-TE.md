# 09 - HƯỚNG DẪN DEMO THỰC TẾ & MẪU TIN NHẮN CHUẨN

Tài liệu này cung cấp hướng dẫn từng bước và danh sách **mẫu tin nhắn tiếng Việt chuẩn** để chạy thử nghiệm (demo) thực tế các tính năng tự động hóa tích hợp AI trên hệ thống n8n. 

Các tin nhắn mẫu dưới đây đã được tối ưu hóa để AI Agent phân loại đúng ý định (intent) và trích xuất tham số đầy đủ nhất.

---

## 1. TẠO ẢNH AI QUẢNG CÁO SẢN PHẨM
Hệ thống hỗ trợ 2 hình thức tạo ảnh sản phẩm: sinh ảnh mới từ mô tả (Imagen 3) và ghép ảnh sản phẩm có sẵn lên người mẫu hoặc bối cảnh (Fashion Image Generator).

### 1.1. Sinh ảnh quảng cáo mới hoàn toàn từ mô tả văn bản
*   **Workflow xử lý:** `04_Media_Generator` (Mô hình: Imagen 3 qua Gemini 3.1 Flash Image).
*   **Kênh tương tác:** Chat trực tiếp với Telegram Bot của Admin.
*   **Mẫu tin nhắn chuẩn:**
    *   `Tạo ảnh: Một người mẫu nữ mặc đầm lụa hồng pastel dáng ôm dài, đang đi dạo trên bối cảnh đường phố cổ ở Hội An ngập nắng nhẹ, góc chụp trung cảnh, tỉ lệ 3:4`
    *   `Tạo ảnh: Chiếc áo khoác denim nam cá tính treo trên móc gỗ, nền tường gạch đỏ retro, ánh sáng tự nhiên từ cửa sổ chiếu vào, góc chụp cận cảnh sản phẩm, tỉ lệ 1:1`
    *   `Tạo ảnh: Set đồ công sở nữ gồm chân váy đen và sơ mi trắng cổ bẻ lịch lãm, phong cách tối giản, nền studio xám nhạt, tỉ lệ 4:5`

### 1.2. Ghép ảnh sản phẩm có sẵn lên người mẫu hoặc bối cảnh mới
*   **Workflow xử lý:** `07_Fashion_Image_Generator` (Mô hình: Gemini Vision phân tích cấu trúc + Imagen ghép hình).
*   **Kênh tương tác:** Gửi 1 bức ảnh chụp sản phẩm thời trang thực tế lên Telegram Bot, sau đó **nhập caption đính kèm ảnh hoặc reply** bức ảnh đó bằng tin nhắn.
*   **Mẫu tin nhắn chuẩn:**
    *   `Ghép sản phẩm này lên người mẫu mặc chụp ngoại cảnh bối cảnh quán cafe phong cách Hàn Quốc có nắng chiếu qua cửa sổ, tỉ lệ 3:4, góc rộng`
    *   `Ghép sản phẩm lên model mặc nền trắng studio sạch sẽ, tỉ lệ 1:1, chụp chính diện`
    *   `Tạo ảnh flatlay sản phẩm này sắp xếp gọn gàng trên nền gỗ mộc mạc kèm theo vài phụ kiện kính râm và ví da, tỉ lệ 1:1`

> [!TIP]
> **Các từ khóa kích hoạt Preset ẩn trong code:**
> *   **Ghép lên mẫu:** Có chứa các từ `người mẫu`, `model`, `mặc`, `wear`, `trên người`.
> *   **Chụp flatlay/không mẫu:** Có chứa từ `flatlay`, `treo`, `mannequin`, `ghost`.
> *   **Đổi bối cảnh:** Có chứa từ `lifestyle`, `đời thường`, `outdoor`, `ngoài trời`, `phố`, `café`, `biển`, `park`.
> *   **Đổi nền studio trắng:** Có chứa từ `nền trắng`, `white bg`, `studio trắng`, `nền sạch`.
> *   **Tự động nhận diện tỷ lệ:** Viết rõ tỉ lệ mong muốn trong tin nhắn (`1:1`, `3:4`, `4:5`, `9:16`, `16:9`, `2:3`, `3:2`).

---

## 2. TẠO VIDEO AI QUẢNG CÁO SẢN PHẨM
Hệ thống sử dụng mô hình Google Veo 3.1 thế hệ mới để biến 1 bức ảnh sản phẩm tĩnh thành video quảng cáo ngắn có chuyển động mượt mà.

*   **Workflow xử lý:** `09_Video_Generator` (Mô hình: Veo 3.1 Generate Preview).
*   **Kênh tương tác:** Gửi 1 bức ảnh sản phẩm thời trang lên Telegram Bot, sau đó nhập caption đính kèm ảnh hoặc reply bức ảnh đó.
*   **Mẫu tin nhắn chuẩn:**
    *   `Dựng video catwalk người mẫu sải bước tự tin trên sàn diễn runway, ánh sáng vàng ấm áp, góc máy di chuyển chậm`
    *   `Dựng video orbit quay camera 360 độ xung quanh người mẫu đứng tạo dáng trong studio tối giản`
    *   `Dựng video windy cho gió tự nhiên thổi bay tà váy nhẹ nhàng bay bổng, cận cảnh chất liệu vải`
    *   `Dựng video lifestyle người mẫu mặc chiếc áo này dạo phố cổ Hà Nội, có chiều sâu ảnh nhòe nền`

> [!IMPORTANT]
> **Từ khóa preset chuyển động bắt buộc (để đạt kết quả đẹp nhất):**
> *   `catwalk` (hoặc `trình diễn`, `sải bước`): Tạo chuyển động đi bộ chuyên nghiệp trên sàn diễn.
> *   `orbit` (hoặc `xoay`, `360`): Quay camera xoay tròn quanh sản phẩm/mẫu để thấy rõ các góc của trang phục.
> *   `windy` (hoặc `gió`, `bay`): Thổi gió chuyển động nhẹ nhàng cho tà váy hoặc tay áo.
> *   `lifestyle` (hoặc `đời thường`, `café`, `ngoài trời`): Tạo chuyển động tự nhiên ở bối cảnh thực tế.
> *   *Nếu không có từ khóa trên:* Hệ thống sẽ dùng camera pan ngang cinematic mặc định.

---

## 3. VIẾT VÀ GỬI EMAIL
Tính năng tự động tra cứu email khách hàng trong danh bạ Google Sheets, yêu cầu Gemini viết nội dung email theo ngữ cảnh lịch sự và gửi đi qua Gmail.

*   **Workflow xử lý:** `08_Gmail_Email_Sender` (Tích hợp: Sheets API tra cứu + Gemini soạn thư + Gmail API gửi).
*   **Kênh tương tác:** Chat trực tiếp với Telegram Bot.
*   **Mẫu tin nhắn chuẩn:**
    *   `Gửi email cho anh Minh báo giá thiết kế bộ sưu tập thời trang mùa hè v2 kèm theo chiết khấu 10% nếu chốt trong tuần này`
    *   `Gửi email cho chị Trang thông báo lịch hẹn thử đồ cưới đã dời từ 15h sang 17h chiều mai`
    *   `Gửi email cho info@goxe.app soạn thư chào hàng giới thiệu dịch vụ cung cấp đồng phục công sở cao cấp, nhấn mạnh bảo hành 12 tháng`

> [!NOTE]
> **Cơ chế hoạt động:**
> 1.  Hệ thống sẽ mở file Google Sheet `DanhBa` được cấu hình qua biến `GOOGLE_CONTACTS_SHEET_NAME`.
> 2.  Nó sẽ tìm kiếm tên trùng khớp (fuzzy match) ở cột `ten` hoặc `biet_danh` (ví dụ: tìm "Minh" hoặc "chị Trang").
> 3.  Nếu tìm thấy địa chỉ email, hệ thống gửi yêu cầu soạn thảo sang Gemini để tạo tiêu đề (Subject) và nội dung email bằng văn bản (text thuần) chuyên nghiệp.
> 4.  Nếu tin nhắn có chứa địa chỉ email trực tiếp (ví dụ: `info@goxe.app`), hệ thống sẽ bỏ qua bước tra cứu danh bạ và gửi thẳng tới email đó.
> 5.  Nếu không tìm thấy tên trong danh bạ, Bot sẽ trả về danh sách danh bạ hiện có trên Google Sheets để bạn điều chỉnh lại tên gọi.

---

## 4. TẠO LỊCH NHẮC / LỊCH HẸN GOOGLE CALENDAR
Trợ lý quản lý lịch biểu cho phép thiết lập nhanh các sự kiện, cuộc họp, buổi livestream hoặc nhắc nhở công việc vào Google Calendar cá nhân bằng câu nói tự nhiên.

*   **Workflow xử lý:** `14_Calendar_Assistant` (Mô hình: Gemini 3.1 Flash Lite phân tích thời gian + Google Calendar API).
*   **Kênh tương tác:** Chat trực tiếp với Telegram Bot.
*   **Mẫu tin nhắn chuẩn (CREATE):**
    *   `Đặt lịch họp team thiết kế từ 14h đến 15h30 chiều mai tại văn phòng lầu 2`
    *   `Tạo lịch hẹn gặp chị Hoa chụp ảnh sản phẩm mới lúc 9h sáng ngày 18/06/2026`
    *   `Nhắc lịch livestream bán hàng trên TikTok lúc 20h tối thứ Sáu tuần này`

> [!NOTE]
> **Giới hạn phạm vi hoạt động (Scope):**
> Phiên bản hiện tại của workflow `14_Calendar_Assistant` được thiết kế chuyên biệt để **TẠO MỚI** (CREATE-only) lịch hẹn từ chat tiếng Việt. Các tính năng Xem (READ) hoặc Hủy/Xóa (DELETE) sự kiện hiện tại nằm ngoài phạm vi hỗ trợ (out-of-scope) để bảo mật thông tin lịch cá nhân của bạn.

> [!WARNING]
> *   **Múi giờ mặc định:** Hệ thống hoạt động theo múi giờ Việt Nam (`Asia/Ho_Chi_Minh` / `+07:00`).
> *   **Tự bổ sung thời gian kết thúc:** Nếu bạn chỉ nói thời gian bắt đầu (ví dụ: "Đặt lịch họp lúc 10h sáng mai"), AI sẽ tự động hiểu thời gian kết thúc của sự kiện là sau đó 1 tiếng (11h sáng mai).
> *   **Lịch mặc định:** Sự kiện sẽ được tạo trực tiếp trên lịch chính (`primary`) của tài khoản Google đã liên kết.

---

## 5. TÌM THÔNG TIN VÀ THÊM THÔNG TIN TRÊN GOOGLE SHEETS
Quản lý, truy vấn dữ liệu tồn kho, đơn hàng, hóa đơn hoặc tạo mới hoàn toàn các báo cáo định dạng chuyên nghiệp trực tiếp từ phòng chat Telegram.

### 5.1. Thêm hóa đơn/đơn hàng mới (Ghi đè/Ghi tiếp dữ liệu)
*   **Workflow xử lý:** `13_NhatKyHoaDon_Assistant` (Ghi nhận thông tin vào Sheet "Nhật ký hóa đơn").
*   **Mẫu tin nhắn chuẩn:**
    *   `Ghi hóa đơn: HĐ 125, SP VD01 đỏ, khách Nguyễn Văn A, SĐT 0987654321, thuê ngày 15/06/2026 trả ngày 18/06/2026, nhân viên Trang`
    *   `Thêm dòng nhật ký hóa đơn: HĐ 126, mã SP VD28 đen, khách Lê Thị B, số điện thoại 0901234567, thuê 20/06/2026 trả 25/06/2026, hoa hồng 50k`

> [!IMPORTANT]
> **Quy tắc trích xuất dữ liệu:**
> *   Để ghi hóa đơn thành công, tin nhắn của bạn cần cung cấp tối thiểu **6 trường thông tin bắt buộc**:
>     1. Số hóa đơn (HĐ...)
>     2. Mã sản phẩm (SP...)
>     3. Tên khách hàng
>     4. Số điện thoại khách hàng
>     5. Ngày thuê (định dạng ngày/tháng/năm)
>     6. Ngày trả (định dạng ngày/tháng/năm)
> *   Nếu thiếu bất kỳ trường nào trong 6 trường trên, AI sẽ phản hồi yêu cầu bạn cung cấp thêm thông tin kèm ví dụ cụ thể.

### 5.2. Đọc và Tìm kiếm dữ liệu trên Sheets
*   **Workflow xử lý:** `11_Workspace_Assistant` (Action: `READ_SHEET`).
*   **Mẫu tin nhắn chuẩn:**
    *   `Xem tồn kho của sản phẩm áo thun trong tab KhoHang`
    *   `Tìm thông tin doanh thu của khách hàng Lê Văn E trong sheet Nhật ký hóa đơn`
    *   `Lọc danh sách các đơn hàng có trạng thái Đang giao trong sheet DonHang`

### 5.3. Tạo bảng tính mới và định dạng chuyên nghiệp tự động
*   **Workflow xử lý:** `11_Workspace_Assistant` (Action: `CREATE_AND_FORMAT_SHEET`).
*   **Mẫu tin nhắn chuẩn:**
    *   `Tạo cho tôi một sheet mới tên Báo cáo doanh thu tháng 6 gồm các cột: STT, Tên Khách, Tên Sản Phẩm, Số Tiền, Trạng Thái. Ghi thông tin mẫu của 3 khách hàng thuê đồ vào đó.`

> [!NOTE]
> **Kết quả kỳ vọng:**
> Hệ thống sẽ tạo một file Google Sheet mới trên Google Drive của bạn, tự động kẻ bảng viền mỏng tinh tế, định dạng căn lề, tô màu tiêu đề cột bằng màu xanh Navy (`#1F4E79`) sang trọng chữ trắng đậm nổi bật, sau đó trả về link truy cập trực tiếp file Google Sheet trên Telegram cho bạn.

### 5.4. Soạn thảo tài liệu Google Docs
*   **Workflow xử lý:** `11_Workspace_Assistant` (Action: `GENERATE_DOC`).
*   **Mẫu tin nhắn chuẩn:**
    *   `Soạn cho tôi hợp đồng thuê váy cưới chụp ảnh với studio ABC, điền đầy đủ các điều khoản cơ bản về thời gian thuê 3 ngày, đơn giá 3 triệu đồng, đặt cọc trước 1.5 triệu.`
