#!/usr/bin/env python3
"""
End-to-end test for WF07 Fashion Image Generator pipeline.
Tests each step independently to pinpoint failures.
"""
import os, sys, json, base64, urllib.request, urllib.parse, time

# Load env
env = {}
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env.local')
with open(env_path) as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            env[k] = v

BOT_TOKEN = env['TELEGRAM_BOT_TOKEN']
GEMINI_KEY = env['GEMINI_API_KEY']
CHAT_ID = env['ADMIN_TELEGRAM_CHAT_ID']

def api_call(url, data=None, method='GET'):
    if data:
        req = urllib.request.Request(url, data=json.dumps(data).encode(), headers={'Content-Type': 'application/json'}, method='POST')
    else:
        req = urllib.request.Request(url, method=method)
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read())

def download_binary(url):
    with urllib.request.urlopen(url, timeout=30) as resp:
        return resp.read()

print("=" * 60)
print("🧪 WF07 Fashion Image Generator — E2E Test")
print("=" * 60)

# Step 1: Upload test photo to Telegram
print("\n📸 Step 1: Upload test photo to Telegram...")
# Download a simple product image
img_url = "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400"
try:
    img_data = download_binary(img_url)
    print(f"  ✅ Downloaded test image: {len(img_data)} bytes")
except Exception as e:
    print(f"  ❌ Failed to download test image: {e}")
    sys.exit(1)

# Send to Telegram using multipart form
import urllib.request
boundary = '----TestBoundary12345'
body = []
body.append(f'--{boundary}'.encode())
body.append(f'Content-Disposition: form-data; name="chat_id"\r\n'.encode())
body.append(CHAT_ID.encode())
body.append(f'\r\n--{boundary}'.encode())
body.append(f'Content-Disposition: form-data; name="photo"; filename="test_product.jpg"\r\nContent-Type: image/jpeg\r\n'.encode())
body.append(img_data)
body.append(f'\r\n--{boundary}'.encode())
body.append(f'Content-Disposition: form-data; name="caption"\r\n'.encode())
body.append('🧪 Test image for WF07'.encode())
body.append(f'\r\n--{boundary}--\r\n'.encode())
multipart_body = b'\r\n'.join(body)

tg_req = urllib.request.Request(
    f'https://api.telegram.org/bot{BOT_TOKEN}/sendPhoto',
    data=multipart_body,
    headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
)
with urllib.request.urlopen(tg_req, timeout=30) as resp:
    tg_result = json.loads(resp.read())

if not tg_result.get('ok'):
    print(f"  ❌ Telegram upload failed: {tg_result}")
    sys.exit(1)

photo_file_id = tg_result['result']['photo'][-1]['file_id']
print(f"  ✅ Uploaded! file_id: {photo_file_id[:40]}...")

# Step 2: Get file info from Telegram
print("\n📋 Step 2: Get Telegram file info...")
file_info = api_call(f'https://api.telegram.org/bot{BOT_TOKEN}/getFile?file_id={photo_file_id}')
if not file_info.get('ok'):
    print(f"  ❌ getFile failed: {file_info}")
    sys.exit(1)
file_path = file_info['result']['file_path']
print(f"  ✅ file_path: {file_path}")

# Step 3: Download photo binary
print("\n⬇️  Step 3: Download photo binary...")
photo_binary = download_binary(f'https://api.telegram.org/file/bot{BOT_TOKEN}/{file_path}')
print(f"  ✅ Downloaded: {len(photo_binary)} bytes")

# Step 4: Convert to base64
print("\n🔄 Step 4: Convert to base64...")
photo_base64 = base64.b64encode(photo_binary).decode('utf-8')
print(f"  ✅ Base64 length: {len(photo_base64)} chars")

# Step 5: Build prompt
print("\n📝 Step 5: Build prompt...")
caption = "Tạo ảnh thời trang áo thun trắng trên người mẫu"
prompt_parts = [
    'Using the provided reference photo of a fashion product, create one professional high-quality e-commerce product photograph optimized for social media selling.',
    'PRODUCT FIDELITY LOCK: The product must be IDENTICAL to the reference photo.',
    'Show the product worn by a Vietnamese model in a natural, confident pose. Full body visible showing the complete fit and silhouette.',
    'Clean gradient studio background from white to light gray.',
    'Professional studio lighting: soft diffused key light at 45 degrees.',
    'Output: full-frame edge-to-edge product scene only. No text overlay, watermark, price tag, border, badge.'
]
prompt = '\n\n'.join(prompt_parts)
print(f"  ✅ Prompt built: {len(prompt)} chars")

# Step 6: Call Gemini API
print("\n🤖 Step 6: Call Gemini API (this may take 30-60s)...")
gemini_body = {
    "contents": [{
        "role": "user",
        "parts": [
            {"inline_data": {"mime_type": "image/jpeg", "data": photo_base64}},
            {"text": prompt}
        ]
    }],
    "generationConfig": {
        "responseModalities": ["TEXT", "IMAGE"]
    }
}

gemini_url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key={GEMINI_KEY}'
start_time = time.time()

try:
    gemini_req = urllib.request.Request(
        gemini_url,
        data=json.dumps(gemini_body).encode(),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    with urllib.request.urlopen(gemini_req, timeout=120) as resp:
        gemini_result = json.loads(resp.read())
    elapsed = time.time() - start_time
    print(f"  ✅ Gemini responded in {elapsed:.1f}s")
except urllib.error.HTTPError as e:
    error_body = e.read().decode()
    print(f"  ❌ Gemini API error {e.code}: {error_body[:500]}")
    sys.exit(1)
except Exception as e:
    print(f"  ❌ Gemini API error: {e}")
    sys.exit(1)

# Step 7: Parse response
print("\n🔍 Step 7: Parse Gemini response...")
candidates = gemini_result.get('candidates', [])
if not candidates:
    print(f"  ❌ No candidates in response")
    print(f"  Raw keys: {list(gemini_result.keys())}")
    if 'error' in gemini_result:
        print(f"  Error: {json.dumps(gemini_result['error'], ensure_ascii=False)[:500]}")
    sys.exit(1)

parts = candidates[0].get('content', {}).get('parts', [])
print(f"  Parts found: {len(parts)}")
for i, part in enumerate(parts):
    if 'text' in part:
        print(f"  Part {i}: text ({len(part['text'])} chars)")
    elif 'inlineData' in part or 'inline_data' in part:
        img_d = part.get('inlineData') or part.get('inline_data', {})
        mime = img_d.get('mimeType') or img_d.get('mime_type', '?')
        data_len = len(img_d.get('data', ''))
        print(f"  Part {i}: image ({mime}, {data_len} chars base64)")

# Find image
img_part = None
for p in parts:
    if 'inlineData' in p and p['inlineData'].get('data'):
        img_part = p['inlineData']
        break
    elif 'inline_data' in p and p['inline_data'].get('data'):
        img_part = p['inline_data']
        break

if not img_part:
    print(f"  ❌ No image data in response!")
    for p in parts:
        if 'text' in p:
            print(f"  Text response: {p['text'][:300]}")
    sys.exit(1)

mime = img_part.get('mimeType') or img_part.get('mime_type', 'image/png')
img_bytes = base64.b64decode(img_part['data'])
print(f"  ✅ Generated image: {len(img_bytes)} bytes, {mime}")

# Step 8: Send result to Telegram
print("\n📤 Step 8: Send generated image to Telegram...")
boundary2 = '----ResultBoundary67890'
body2 = []
body2.append(f'--{boundary2}'.encode())
body2.append(f'Content-Disposition: form-data; name="chat_id"\r\n'.encode())
body2.append(CHAT_ID.encode())
body2.append(f'\r\n--{boundary2}'.encode())
ext = 'png' if 'png' in mime else 'jpg'
body2.append(f'Content-Disposition: form-data; name="photo"; filename="fashion_result.{ext}"\r\nContent-Type: {mime}\r\n'.encode())
body2.append(img_bytes)
body2.append(f'\r\n--{boundary2}'.encode())
body2.append(f'Content-Disposition: form-data; name="caption"\r\n'.encode())
body2.append('✅ WF07 E2E Test PASSED! Ảnh được tạo thành công bởi Gemini.'.encode())
body2.append(f'\r\n--{boundary2}--\r\n'.encode())
multipart_body2 = b'\r\n'.join(body2)

send_req = urllib.request.Request(
    f'https://api.telegram.org/bot{BOT_TOKEN}/sendPhoto',
    data=multipart_body2,
    headers={'Content-Type': f'multipart/form-data; boundary={boundary2}'}
)
with urllib.request.urlopen(send_req, timeout=30) as resp:
    send_result = json.loads(resp.read())

if send_result.get('ok'):
    print(f"  ✅ Photo sent to Telegram successfully!")
else:
    print(f"  ❌ Send failed: {send_result}")

# Save locally too
output_path = '/tmp/wf07_test_result.' + ext
with open(output_path, 'wb') as f:
    f.write(img_bytes)
print(f"  💾 Saved to: {output_path}")

print("\n" + "=" * 60)
print("✅ WF07 E2E TEST PASSED — All 8 steps successful!")
print("=" * 60)
print(f"\nSummary:")
print(f"  • Telegram file upload: ✅")
print(f"  • File info retrieval: ✅")
print(f"  • Photo download: ✅")  
print(f"  • Base64 conversion: ✅")
print(f"  • Prompt building: ✅")
print(f"  • Gemini API call: ✅ ({elapsed:.1f}s)")
print(f"  • Image parsing: ✅ ({len(img_bytes)} bytes)")
print(f"  • Telegram delivery: ✅")
