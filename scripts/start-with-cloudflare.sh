#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "=== 1. Dọn dẹp các tiến trình n8n và cloudflared cũ ==="
# Kill process running on port 5678
PID_5678=$(lsof -t -i:5678 || true)
if [ -n "$PID_5678" ]; then
  echo "Đang dừng tiến trình $PID_5678 đang chiếm cổng 5678..."
  kill -9 $PID_5678 || true
fi

# Kill any existing cloudflared tunnels
echo "Đang dừng các kết nối cloudflared cũ..."
pkill -f "cloudflared tunnel" || true

sleep 1

echo "=== 2. Khởi tạo Cloudflare Tunnel ==="
mkdir -p scratch
rm -f scratch/cloudflared.log
touch scratch/cloudflared.log

# Start cloudflared quick tunnel
cloudflared tunnel --url http://127.0.0.1:5678 > scratch/cloudflared.log 2>&1 &
CLOUDFLARED_PID=$!

echo "Đang đợi URL Cloudflare Tunnel được tạo..."
tunnel_url=""
for i in {1..15}; do
  if grep -q "https://.*trycloudflare.com" scratch/cloudflared.log 2>/dev/null; then
    tunnel_url=$(grep -o "https://[-a-zA-Z0-9.]*trycloudflare.com" scratch/cloudflared.log | head -n 1 || echo "")
    if [ -n "$tunnel_url" ]; then
      break
    fi
  fi
  sleep 1
done

if [ -z "$tunnel_url" ]; then
  echo "Lỗi: Không lấy được URL từ Cloudflare Tunnel. Chi tiết log trong scratch/cloudflared.log:"
  cat scratch/cloudflared.log
  exit 1
fi

echo "Đã tạo thành công Cloudflare Tunnel URL: $tunnel_url"

echo "=== 3. Cập nhật WEBHOOK_URL vào tệp .env.local ==="
python3 -c '
import sys, os
p = ".env.local"
if os.path.exists(p):
    lines = open(p, "r", encoding="utf-8").read().splitlines()
    for i, line in enumerate(lines):
        if line.startswith("WEBHOOK_URL="):
            lines[i] = f"WEBHOOK_URL={sys.argv[1]}"
            break
    else:
        lines.append(f"WEBHOOK_URL={sys.argv[1]}")
    open(p, "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print("Đã cập nhật WEBHOOK_URL trong .env.local.")
else:
    print("Không tìm thấy tệp .env.local.")
' "$tunnel_url"

echo "=== 4. Bắt đầu khởi chạy n8n ==="
exec scripts/start-n8n.sh
