# ST-004-fix-email-routing Story

## Status

implemented

## Lane

normal

## Product Contract

Fix AI routing false positive: when a user requests to send an email/mail containing the word "nội dung" (content), the routing logic should correctly direct it to the `GỬI_EMAIL` intent rather than misinterpreting it as a social post request (`LÊN_LỊCH_BÀI`).

## Relevant Product Docs

- `docs/workflows/01_Telegram_Gateway.md`

## Acceptance Criteria

- Mail requests containing the word "nội dung" (or synonyms like "noi dung") are routed correctly to `GỬI_EMAIL` intent.
- Other intents (like `LƯU_ĐƠN`, `TẠO_SHEET`, `ĐỌC_FILE`, `TRỢ_LÝ_WORKSPACE`) are also not falsely overridden by `explicitSocial` when they contain "nội dung".
- Unit tests continue to pass and new unit tests are added to verify this case.

## Design Notes

- In `01_Telegram_Gateway.json`'s `Parse Intent` node:
  Modify `explicitSocial` variable definition to not match "nội dung"/"noi dung"/"caption" when the message is clearly for email, sheets, or other non-social intents, or when the AI classifier did not classify it as `LÊN_LỊCH_BÀI`.
- In `scripts/unit-tests.mjs`:
  Update `applyIntentSafety` mimic code to match `Parse Intent`'s new logic.
  Add tests for email requests with "nội dung" to ensure they resolve to `GỬI_EMAIL` and not `LÊN_LỊCH_BÀI`/`CHAT`.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `node scripts/unit-tests.mjs` |
| Integration | None |
| E2E | None |
| Platform | None |
| Release | None |

## Harness Delta

- Added story ST-004-fix-email-routing.

## Evidence

- None yet.
