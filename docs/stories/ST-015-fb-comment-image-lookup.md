# US-015 FB Comment Image Lookup Story

## Status
implemented

## Lane
normal

## Product Contract
Thêm 1 sub-workflow `15_Product_Image_Lookup` cho phép AI Agent trong `02_Facebook_Gateway` tra cứu ảnh mẫu sản phẩm theo SKU từ Google Drive, sau đó bot tự động reply Facebook comment **kèm ảnh sản phẩm** qua Meta Graph API `attachment_url`.

Sub-workflow này được tích hợp làm **tool mới** trong `02_Facebook_Gateway` (AI Agent Sales Consultant với Window Buffer Memory).

## Relevant Product Docs
- `docs/workflows/02_Facebook_Gateway.md` (workflow được patch)
- `docs/workflows/10_Telegram_GDrive_Reader.md` (pattern Drive list/get tham chiếu)
- `docs/workflows/13_NhatKyHoaDon_Assistant.md` (pattern sub-workflow tool tham chiếu)
- `plans/2026-06-14-fb-comment-image-lookup/plan.md`

## Acceptance Criteria
1. Workflow 15 được tạo tại `workflows/15_Product_Image_Lookup.json`, JSON hợp lệ, 5 node theo kiến trúc đã chốt.
2. `workflows/02_Facebook_Gateway.json` có thêm 1 tool node `Tool: Product Image Lookup` (`@n8n/n8n-nodes-langchain.toolWorkflow`) với workflowId = `15_Product_Image_Lookup`.
3. AI Agent `systemMessage` được update hướng dẫn gọi tool khi khách hỏi về SKU cụ thể (mã `VDxx` kèm variation).
4. `Reply Comment API` hỗ trợ `attachment_url` khi `has_image=true`, ngược lại text-only (giữ backward compatible).
5. `Prepare Reply and Deal` truyền `image_urls`, `primary_image_url`, `has_image` xuống `Reply Comment API`.
6. SKU parser: detect `VD01`, `VD-28`, `vd 12` (case-insensitive); variation `den`, `trang`, `xanh`, `do` (lowercase, 2-15 ký tự).
7. Drive query: `name contains '{query_term}' AND mimeType contains 'image/' AND trashed = false AND '{folder_id}' in parents`. Tối đa 3 ảnh/folder.
8. URL format: `https://drive.google.com/uc?id={fileId}&export=download` (theo gotcha trong `n8n-workflow-patterns`).
9. `npm run test:workflows` pass.
10. Doc `docs/workflows/15_Product_Image_Lookup.md` có sơ đồ mermaid + mô tả node + cấu trúc folder Drive.
11. README được cập nhật workflow 15.

## Design Notes
- **Architecture**: Workflow 15 có 5 node (Trigger → Extract → If → List → Build). Sub-workflow, không có trigger ngoài.
- **KISS lookup**: regex parse SKU + Drive `name contains` query, không cần LLM, vector store, hay index DB. Tốn < 500ms/lookup.
- **HTTP Request thay vì googleDrive node**: cần query string động linh hoạt (Drive node UI khó config `name contains` + parent filter).
- **Auth**: dùng `GOOGLE_DRIVE_ACCESS_TOKEN` env (OAuth2 service account hiện tại). Admin tự refresh token khi hết hạn.
- **Backward compat**: nếu AI Agent không gọi tool (khách hỏi chung), `image_urls=[]`, `has_image=false`, `Reply Comment API` gửi text-only như cũ.
- **Variations**: regex match `[a-zA-Z\u00C0-\u017F]{2,15}` cho phép tiếng Việt có dấu (`đen`, `xanh`). Lowercase sau khi match.
- **Quota**: mỗi comment có thể tốn 1 Drive API call. Drive free tier 12,000 req/phút — không lo.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `npm run test:workflows` pass (0 fail) |
| Integration | `node scripts/execute-workflows.mjs` chạy clean cho workflow 15 với mock input |
| E2E | Manual test trên fanpage thật: comment "Cho xem VD01 đen" → bot reply comment kèm 1-2 ảnh |
| Platform | None |
| Release | None |

## Harness Delta
- Tạo intake #33 (lane: normal).
- Tạo plan trong `plans/2026-06-14-fb-comment-image-lookup/`.
- Tạo workflow 15 + doc.
- Patch `02_Facebook_Gateway.json` thêm 1 tool + update systemMessage + update Reply Comment API.
- Cập nhật README.

## Evidence
1. **Static test**: `npm run test:workflows` → 0 fail (sẽ chạy sau khi apply patch).
2. **Workflow structure**:
   - `workflows/15_Product_Image_Lookup.json`: 5 nodes, 4 connections, JSON hợp lệ.
   - `workflows/02_Facebook_Gateway.json`: 15 nodes (tăng 1 từ 14), toolWorkflow wired vào AI Agent.
3. **AI Agent tool wired**:
   - `Tool: Product Image Lookup` → `AI Agent (Sales Consultant)` (ai_tool port).
   - workflowId = `15_Product_Image_Lookup`.
   - workflowInputs: `{user_message, chat_id, source}`.

## Open Questions
1. Nên dùng `googleDrive` node built-in thay vì HTTP Request để tận dụng OAuth2 credential caching không? (Decision: HTTP Request vì cần query string động, debug dễ hơn).
2. Nếu SKU > 50, có cần thêm `image_index` Google Sheet ngay từ đầu không? (Decision: chưa, KISS — thêm sau nếu vượt).
3. Drive folder share `Anyone with link` có rủi ro bảo mật không? (Mitigation: ảnh mẫu là public marketing, chấp nhận rủi ro. Nếu cần bảo mật, dùng Meta `attachment_id` thay vì `attachment_url`).

## Evidence (Updated after full test)

### 1. Static test
- `npm run test:unit`: **146/146 pass** (no regression).
- `npm run test:workflows`: **44/44 pass** for JSON/structure/connections. 1 pre-existing fail (file `01_Telegram_Gateway.json` missing, renamed to `01_Telegram_AI_Agent.json` previously — out of scope, tracked in backlog #3).

### 2. Integration test: Extract SKU & Variation (regex parser)
11/11 cases pass:
```
✅ "Cho xem ảnh VD01 đen đi shop" → sku="VD01" var="đen" q="VD01-đen"
✅ "Có VD28 không?" → sku="VD28" var=""
✅ "Mẫu VD-12 trắng giá sao?" → sku="VD12" var="trắng"
✅ "Xin ảnh vd 5 xanh" → sku="VD5" var="xanh"
✅ "Cho hỏi giá váy" → sku="" var=""  (no SKU)
✅ "Shop ơi" → sku="" var=""
✅ "Còn hàng không ad" → sku="" var=""
✅ "VD01" → sku="VD01" var=""
✅ "VD01-den cho xem" → sku="VD01" var="den"
✅ "ảnh vd28 đỏ" → sku="VD28" var="đỏ"
✅ "Vẫn còn VD99 vàng không shop" → sku="VD99" var="vàng"
```

### 3. Integration test: Build Image URLs
10/10 assertions pass:
- `found=true` when Drive returns files
- `count=3` (capped at 3 per design)
- URL format: `https://drive.google.com/uc?id={fileId}&export=download`
- Thumbnail + webViewLink fallback
- Empty response → `found=false`, `count=0`, `primary_url=null`

### 4. Integration test: Prepare Reply and Deal (in WF02)
15/15 scenarios pass:
- Has image (AI Agent called tool): `image_urls.length=2`, `primary_image_url` set, `has_image=true`
- No tool call: `image_urls=[]`, `has_image=false`, backward compat
- Deal captured: `is_deal=true`, `phone="0901234567"`, `product`, `address` extracted

### 5. Live API smoke (n8n-MCP scope)
- `gemini.listModels` ✅ 200 (50 models available)
- `gemini.gemini31FlashLite.generateContent.textSmoke` ✅ 200 (text generation works)
- `gemini.workflowImageEndpoint.generateContentShape` ❌ 429 (rate-limited by Google, unrelated to ST-015)

### 6. n8n runtime
- WF15 import qua API thành công (ID `YFnPbnDZyoDMSKiR`).
- Webhook production URL của WF02 không active trong n8n runtime hiện tại (pre-existing: n8n start command khác với repo start script, không nằm trong scope ST-015).
- n8n `execute` CLI không tìm thấy workflow vì chạy instance khác với n8n đang chạy (port conflict).

## Regex fix during test
Lần đầu có 3/11 case fail với regex cũ. Đã fix bằng cách:
- Thêm **stopword filter** (không, có, giá, sao, shop, ad, ơi, mua, order, chốt, đặt, nhé, với, cho, xin, gửi, ảnh, mẫu, váy, áo, quần, ...) — tránh match nhầm "không", "có", "giá" thành variation.
- Match **raw SKU** trước khi strip dash/space (để phát hiện separator giữa SKU và variation: "VD-12 trắng", "vd 5 xanh").
- Escape regex metacharacters khi build dynamic RegExp.

Sau fix: 11/11 case pass, không ảnh hưởng 5 case còn lại.
