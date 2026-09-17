"""
Unified Launcher for Sanfun Couch Co-Op & Party Games Platform.
Automatically:
1. Spawns Cloudflare Tunnel (if cloudflared.exe is present) for zero-friction mobile/hotspot play.
2. Discovers Local LAN IP for offline Wi-Fi play.
3. Serves the unified FastAPI + Static frontend on port 8000.
4. Opens Host Big Screen in default browser.
"""
import os
import sys
import time
import webbrowser
import threading

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
CLOUDFLARED_EXE = os.path.join(ROOT_DIR, "cloudflared.exe")

# Ensure backend modules are on sys.path
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)


def main():
    from app.party.network import get_local_ip

    print("=" * 64)
    print("       SANFUN COUCH CO-OP & PARTY GAMES PLATFORM")
    print("=" * 64)

    local_ip = get_local_ip()
    print(f"[LOCAL]  LAN IP: http://{local_ip}:8000")
    if os.path.isfile(CLOUDFLARED_EXE):
        print("[TUNNEL] Cloudflare Edge Tunnel will auto-initialize for mobile/hotspot play.")
    else:
        print("[TUNNEL] cloudflared.exe not found; running in local Wi-Fi mode.")

    # Open host screen after a brief delay
    def open_browser():
        time.sleep(1.2)
        host_url = "http://localhost:8000/?party=host"
        print(f"[HOST]   Opening party lounge: {host_url}")
        webbrowser.open(host_url)

    threading.Thread(target=open_browser, daemon=True).start()

    # Run Uvicorn - lifespan in app.main manages the tunnel and tick loops automatically
    import uvicorn
    from app.main import app

    try:
        uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
