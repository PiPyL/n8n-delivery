---
type: project
created: 2026-05-25
updated: 2026-05-25
---

# Project Conventions

## Git Workflow
- Always create a new dedicated branch for major code changes.
- Branch name format should follow: `feature/[task-slug]` or `fix/[bug-slug]`.

## LLM / Gemini Model Rules
- Bắt buộc sử dụng model `gemini-3.1-flash-image` khi thực hiện các tác vụ tạo hình ảnh (cả text-to-image và image-to-image).
- Bắt buộc sử dụng model `gemini-3.1-flash-lite` cho các tác vụ xử lý ngôn ngữ tự nhiên (text-only generation, intent classification, text parsing).
