# ST-009-fix-facebook-photo-publish Story

## Status

implemented

## Lane

normal

## Product Contract

Fix Facebook Fanpage posting with photo: when a user sends a post request containing a Telegram photo (`photo_file_id`), the worker workflow should correctly fetch the file path from Telegram API, generate a public HTTP URL, and map it to `image_url`, enabling Facebook to publish it as a photo post (using `/photos` edge) instead of falling back to a text-only status post.

## Relevant Product Docs

- `docs/workflows/06_Social_Publisher_Worker.md` (if exists)
- `workflows/06_Social_Publisher_Worker.json`

## Acceptance Criteria

- Post requests with `photo_file_id` and no `image_url` are correctly resolved via Telegram's `getFile` API.
- The resolved HTTP URL is mapped to `image_url`, forcing Facebook posting flow to use the `photos` edge with the image URL and caption.
- Text-only posts and video posts remain unaffected.
- Unit tests continue to pass and new tests are added to verify the resolution of `photo_file_id` to `image_url` and its mapping to the Facebook photos edge.

## Design Notes

- In `workflows/06_Social_Publisher_Worker.json`:
  - Modify `worker-check-video-file` (name: "Has Video File?") to check for either `video_file_id` or `photo_file_id`. Rename it to "Has Media File?".
  - Modify `worker-resolve-video` (name: "Resolve Telegram Video URL") to call Telegram `/getFile` API using `video_file_id` or `photo_file_id`. Rename it to "Resolve Telegram Media URL".
  - Modify `worker-merge-resolve` (name: "Merge Resolve Output") code node to resolve both `video_url` and `image_url` from the fetched file path.
  - Update connections list to use the renamed nodes.
- In `scripts/unit-tests.mjs`:
  - Update mockup/mirror implementations or add a new test case validating that a post with `photo_file_id` gets resolved to a valid `image_url` and formatted correctly for Facebook posting.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `node scripts/unit-tests.mjs` |
| Integration | `node scripts/test-workflows.mjs` |
| E2E | None |
| Platform | None |
| Release | None |

## Harness Delta

- Added story ST-009-fix-facebook-photo-publish.
- Implemented and verified ST-009.

## Evidence

- All 120 unit tests passed.
- 60 workflow structure checks passed.
- Story successfully verified via `harness-cli story verify ST-009-fix-facebook-photo-publish`.
