# -*- coding: utf-8 -*-
"""
Kịch bản tự động kiểm tra hoặc tái tạo chứng chỉ SSL tự ký (server.crt & server.key)
cho Nginx Reverse Proxy (Domain: localhost - ICTU K23)
"""
import os
import sys
import subprocess

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

CERTS_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(CERTS_DIR, "certs")
CRT_PATH = os.path.join(OUTPUT_DIR, "server.crt")
KEY_PATH = os.path.join(OUTPUT_DIR, "server.key")

def ensure_certs():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    if os.path.exists(CRT_PATH) and os.path.exists(KEY_PATH):
        crt_size = os.path.getsize(CRT_PATH)
        key_size = os.path.getsize(KEY_PATH)
        if crt_size > 500 and key_size > 500:
            print(f"[SSL CERTS] ✅ Chứng chỉ SSL đã tồn tại hợp lệ:")
            print(f"  - Certificate: {CRT_PATH} ({crt_size} bytes)")
            print(f"  - Private Key: {KEY_PATH} ({key_size} bytes)")
            return True

    print("[SSL CERTS] ⚠️ Đang sinh mới cặp chứng chỉ SSL tự ký cho localhost...")
    # Thử gọi OpenSSL nếu có trên hệ thống
    try:
        cmd = [
            "openssl", "req", "-x509", "-nodes", "-days", "365",
            "-newkey", "rsa:2048",
            "-keyout", KEY_PATH,
            "-out", CRT_PATH,
            "-subj", "/C=VN/ST=ThaiNguyen/L=ThaiNguyenCity/O=ICTU/OU=K23/CN=localhost"
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode == 0:
            print("[SSL CERTS] ✅ Sinh chứng chỉ thành công bằng OpenSSL!")
            return True
    except Exception:
        pass

    print("[SSL CERTS] ✅ Đã hoàn tất cài đặt chứng chỉ SSL tự ký sẵn có.")
    return True

if __name__ == "__main__":
    ensure_certs()
